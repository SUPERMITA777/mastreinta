import { NextResponse } from "next/server";
import { readCloudState } from "@/lib/cloudState.server";
import {
  KNOWN_DEFAULT_PASSWORDS,
  clientIp,
  createSessionCookieValue,
  isSameOrigin,
  rateLimited,
  sessionCookieHeader,
  verifyPassword,
} from "@/lib/adminAuth.server";
import type { AdminUser } from "@/lib/types";

export const dynamic = "force-dynamic";

// Hash falso para igualar tiempos de respuesta cuando el usuario no existe
const DUMMY =
  "scrypt$00000000000000000000000000000000$" + "0".repeat(128);

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Origen no permitido" }, { status: 403 });
  }

  const { username, password } = await req.json().catch(() => ({}));
  const user = String(username || "").trim().toLowerCase();
  const pass = String(password || "");
  if (!user || !pass || pass.length > 200) {
    return NextResponse.json({ ok: false, error: "Credenciales inválidas" }, { status: 400 });
  }

  // Anti fuerza bruta: 8 intentos / 15 min por IP y 5 por usuario
  if (
    rateLimited(`login-ip:${clientIp(req)}`, 8, 15 * 60 * 1000) ||
    rateLimited(`login-user:${user}`, 5, 15 * 60 * 1000)
  ) {
    return NextResponse.json(
      { ok: false, error: "Demasiados intentos. Esperá 15 minutos." },
      { status: 429 }
    );
  }

  const state = await readCloudState();
  const users = (Array.isArray(state?.adminUsers) ? state!.adminUsers : []) as AdminUser[];
  const found = users.find((u) => u.active && u.username.trim().toLowerCase() === user);

  const valid = verifyPassword(pass, found?.password || DUMMY) && Boolean(found);
  if (!valid || !found) {
    return NextResponse.json({ ok: false, error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const { password: _omit, ...safeUser } = found;
  void _omit;
  const res = NextResponse.json({ ok: true, user: { ...safeUser, password: "" } });
  res.headers.append("Set-Cookie", sessionCookieHeader(createSessionCookieValue(found.username)));
  return res;
}
