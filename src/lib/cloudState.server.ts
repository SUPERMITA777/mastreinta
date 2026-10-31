import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://hpbwcewuekxfqlofwpzu.supabase.co";

// Clave secreta obtenida exclusivamente de variables de entorno del servidor (nunca hardcodeada en código fuente)
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

/** Bucket PÚBLICO: solo para imágenes (flyers). Nunca guardar datos de usuarios acá. */
export const BUCKET_NAME = "mas30-cloud-db";
/** Bucket PRIVADO: estado completo (órdenes, tickets, usuarios, settings) y secretos. */
export const STATE_BUCKET = "mas30-private";
export const STATE_FILE = "mas30-state-v1.json";

// Secreto del servidor para firmar sesiones y autorizar llamadas internas.
// Sin valor por defecto: si falta, se genera uno aleatorio por proceso (las sesiones no sobreviven reinicios).
export const ADMIN_API_SECRET: string =
  process.env.ADMIN_API_SECRET ||
  process.env.SUPABASE_SECRET_KEY ||
  (() => {
    console.error(
      "[Seguridad] ADMIN_API_SECRET no configurado: usando secreto efímero. Configuralo en el entorno."
    );
    return crypto.randomBytes(32).toString("hex");
  })();

export function getAdminSupabase() {
  if (!SUPABASE_SERVICE_KEY) {
    console.warn(
      "[CloudState] Advertencia: SUPABASE_SECRET_KEY no configurada en variables de entorno."
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, init) =>
        fetch(url, {
          ...init,
          cache: "no-store",
        }),
    },
  });
}

let privateBucketReady = false;

/** Crea el bucket privado si no existe y migra el estado desde el bucket público (una sola vez). */
export async function ensurePrivateState(): Promise<void> {
  if (privateBucketReady) return;
  const supabase = getAdminSupabase();
  await supabase.storage
    .createBucket(STATE_BUCKET, { public: false })
    .catch(() => {});
  // Si existía como público, forzar privado
  await supabase.storage
    .updateBucket(STATE_BUCKET, { public: false })
    .catch(() => {});

  const priv = await supabase.storage.from(STATE_BUCKET).download(STATE_FILE);
  if (priv.error || !priv.data) {
    // Migración: copiar el estado viejo del bucket público al privado
    const legacy = await supabase.storage.from(BUCKET_NAME).download(STATE_FILE);
    if (legacy.data) {
      const text = await legacy.data.text();
      await supabase.storage
        .from(STATE_BUCKET)
        .upload(STATE_FILE, Buffer.from(text, "utf-8"), {
          contentType: "application/json",
          upsert: true,
          cacheControl: "0",
        });
    }
  }
  // Borrar SIEMPRE la copia pública (datos personales y credenciales)
  await supabase.storage
    .from(BUCKET_NAME)
    .remove([STATE_FILE])
    .catch(() => {});
  privateBucketReady = true;
}

/** Lee el estado global (eventos, settings, etc.) guardado en Supabase Storage (bucket privado). */
export async function readCloudState(): Promise<Record<string, unknown> | null> {
  try {
    await ensurePrivateState();
    const { data, error } = await getAdminSupabase()
      .storage.from(STATE_BUCKET)
      .download(STATE_FILE);
    if (error || !data) return null;
    return JSON.parse(await data.text());
  } catch {
    return null;
  }
}
