import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://hpbwcewuekxfqlofwpzu.supabase.co";

// Clave secreta obtenida exclusivamente de variables de entorno del servidor (nunca hardcodeada en código fuente)
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const BUCKET_NAME = "mas30-cloud-db";
export const STATE_FILE = "mas30-state-v1.json";

// Token secreto para autorizar operaciones de administración en la API
export const ADMIN_API_SECRET =
  process.env.ADMIN_API_SECRET ||
  process.env.SUPABASE_SECRET_KEY ||
  "mas30_super_secret_auth_token_2026";

export function getAdminSupabase() {
  if (!SUPABASE_SERVICE_KEY) {
    console.warn(
      "[CloudState] Advertencia: SUPABASE_SECRET_KEY no configurada en variables de entorno."
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Lee el estado global (eventos, settings, etc.) guardado en Supabase Storage. */
export async function readCloudState(): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await getAdminSupabase()
      .storage.from(BUCKET_NAME)
      .download(STATE_FILE);
    if (error || !data) return null;
    return JSON.parse(await data.text());
  } catch {
    return null;
  }
}
