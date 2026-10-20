import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_SUPABASE_URL = "https://hpbwcewuekxfqlofwpzu.supabase.co";

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    const storedKey = localStorage.getItem("mas30_supabase_anon_key") || "";
    const activeKey = envKey || storedKey;
    if (activeKey && activeKey.length > 15) {
      return createClient(envUrl, activeKey);
    }
  }
  if (envKey && envKey.length > 15) {
    return createClient(envUrl, envKey);
  }
  return null;
}

export const isSupabaseConfigured = Boolean(envKey && envKey.length > 15);
export const supabase: SupabaseClient | null =
  envKey && envKey.length > 15 ? createClient(envUrl, envKey) : null;
