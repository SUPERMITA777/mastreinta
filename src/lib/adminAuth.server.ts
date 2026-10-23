import crypto from "crypto";
import { ADMIN_API_SECRET, readCloudState } from "@/lib/cloudState.server";
import type { AdminUser, RolePermissions } from "@/lib/types";

export const SESSION_COOKIE = "mas30_session";
const SESSION_HOURS = 12;

/** Contraseñas por defecto publicadas en el código fuente: se consideran comprometidas. */
export const KNOWN_DEFAULT_PASSWORDS = new Set([
  "supermas30",
  "mas30admin",
  "lector2026",
  "caja2026",
  "rrpp2026",
  "puerta2026",
]);

/* ---------------------------- Contraseñas ---------------------------- */

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function isHashed(v: string | undefined): boolean {
  return typeof v === "string" && v.startsWith("scrypt$");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function verifyPassword(plain: string, stored: string): boolean {
  // Solo se aceptan contraseñas almacenadas con hash scrypt.
  // Se eliminó el fallback de texto plano (hallazgo #9): una credencial sin
  // hash no es válida y debe migrarse con scripts/reset-admin-password.mjs.
  if (!isHashed(stored)) return false;
  const [, saltHex, hashHex] = stored.split("$");
  try {
    const hash = crypto.scryptSync(plain, Buffer.from(saltHex, "hex"), 64);
    return safeEqual(hash.toString("hex"), hashHex);
  } catch {
    return false;
  }
}

/* ------------------------------ Sesiones ------------------------------ */

function sign(data: string): string {
  return crypto.createHmac("sha256", ADMIN_API_SECRET).update(data).digest("base64url");
}

export function createSessionCookieValue(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      u: username,
      exp: Date.now() + SESSION_HOURS * 3600 * 1000,
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function sessionCookieHeader(value: string, clear = false): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${clear ? "" : value}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${
    clear ? 0 : SESSION_HOURS * 3600
  }`;
}

function readCookie(req: Request, name: string): string {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

export interface AdminIdentity {
  username: string;
  fullName: string;
  role: string;
  user?: AdminUser;
  via: "session" | "secret";
}

/** Verifica el Origin en métodos que modifican datos (defensa CSRF además de SameSite).
 *  Exige que Origin esté presente y coincida con el host real de la petición. */
export function isSameOrigin(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false; // sin Origin no se aceptan mutaciones (los navegadores siempre lo envían)
  try {
    const host = req.headers.get("host");
    if (!host) return false;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Devuelve el operador autenticado o null.
 * - header x-admin-token == ADMIN_API_SECRET (llamadas internas del servidor, sin Origin), o
 * - cookie de sesión firmada (HttpOnly) emitida por /api/auth/login.
 */
export async function getAdminFromRequest(
  req: Request
): Promise<AdminIdentity | null> {
  // Llamadas internas servidor-a-servidor: autenticadas por secreto, no por Origin.
  const header = (req.headers.get("x-admin-token") || "").trim();
  if (header && safeEqual(header, ADMIN_API_SECRET)) {
    return { username: "system", fullName: "Sistema", role: "SUPERADMIN", via: "secret" };
  }

  if (!isSameOrigin(req)) return null;

  const cookie = readCookie(req, SESSION_COOKIE);
  const [payload, sig] = cookie.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;

  let parsed: { u: string; exp: number };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
  if (!parsed.u || parsed.exp < Date.now()) return null;

  // El usuario debe seguir existiendo y activo (permite revocar accesos al instante)
  const state = await readCloudState();
  const users = (Array.isArray(state?.adminUsers) ? state!.adminUsers : []) as AdminUser[];
  const user = users.find(
    (u) => u.username.trim().toLowerCase() === parsed.u.trim().toLowerCase()
  );
  if (!user || !user.active) return null;
  return {
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    user,
    via: "session",
  };
}

export function isSuperIdentity(id: AdminIdentity | null): boolean {
  return Boolean(id && id.role === "SUPERADMIN");
}

/** Permiso efectivo del operador, leyendo los roles guardados en el servidor. */
export async function hasPermission(
  id: AdminIdentity | null,
  perm: keyof RolePermissions
): Promise<boolean> {
  if (!id) return false;
  if (id.role === "SUPERADMIN") return true;
  if (id.user?.customPermissions && perm in id.user.customPermissions) {
    return Boolean(id.user.customPermissions[perm]);
  }
  const state = await readCloudState();
  const roles = (Array.isArray(state?.adminRoles) ? state!.adminRoles : []) as Array<{
    name: string;
    permissions?: Partial<RolePermissions>;
  }>;
  return Boolean(roles.find((r) => r.name === id.role)?.permissions?.[perm]);
}

/* ---------------------------- Rate limiting ---------------------------- */

const buckets = new Map<string, { n: number; reset: number }>();

/** Límite en memoria (por instancia). Devuelve true si se superó el máximo. */
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  b.n += 1;
  return b.n > max;
}

export function clientIp(req: Request): string {
  return (
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
