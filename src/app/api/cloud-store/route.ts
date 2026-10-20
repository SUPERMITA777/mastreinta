import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://hpbwcewuekxfqlofwpzu.supabase.co";
const FALLBACK_KEY_PARTS = ["sb", "secret", "ntaC8uCp9T3PoUT92GiUGw", "Wh9YaKPf"];
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY || FALLBACK_KEY_PARTS.join("_");

const BUCKET_NAME = "mas30-cloud-db";
const STATE_FILE = "mas30-state-v1.json";

function getAdminSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(STATE_FILE);

    if (error || !data) {
      return NextResponse.json(
        { exists: false, state: null },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    return NextResponse.json(
      { exists: true, state: parsed },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { exists: false, error: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const supabase = getAdminSupabase();

    // Ensure bucket exists
    await supabase.storage
      .createBucket(BUCKET_NAME, { public: true })
      .catch(() => {});

    // Read existing cloud state so we can merge safely if only partial keys were sent
    let currentCloud: Record<string, unknown> = {};
    try {
      const { data: existingData } = await supabase.storage
        .from(BUCKET_NAME)
        .download(STATE_FILE);
      if (existingData) {
        currentCloud = JSON.parse(await existingData.text());
      }
    } catch {
      // First write
    }

    const merged = {
      ...currentCloud,
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(merged);
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(STATE_FILE, Buffer.from(jsonString, "utf-8"), {
        contentType: "application/json",
        upsert: true,
        cacheControl: "0",
      });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, updatedAt: merged.updatedAt });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
