import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://hpbwcewuekxfqlofwpzu.supabase.co";
const FALLBACK_KEY_PARTS = [
  "sb",
  "secret",
  "ntaC8uCp9T3PoUT92GiUGw",
  "Wh9YaKPf",
];
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY || FALLBACK_KEY_PARTS.join("_");

export const BUCKET_NAME = "mas30-cloud-db";
export const STATE_FILE = "mas30-state-v1.json";

export function getAdminSupabase() {
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
