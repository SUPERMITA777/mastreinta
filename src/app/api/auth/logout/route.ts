import { NextResponse } from "next/server";
import { sessionCookieHeader } from "@/lib/adminAuth.server";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "mas30_session",
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  res.headers.append("Set-Cookie", sessionCookieHeader("", true));
  return res;
}
