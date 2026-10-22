import { NextResponse } from "next/server";
import { sessionCookieHeader } from "@/lib/adminAuth.server";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", sessionCookieHeader("", true));
  return res;
}
