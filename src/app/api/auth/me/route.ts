import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/adminAuth.server";

export const dynamic = "force-dynamic";

/** Indica si la cookie de sesión sigue siendo válida (la UI la usa al cargar). */
export async function GET(req: Request) {
  const id = await getAdminFromRequest(req);
  return NextResponse.json({ ok: Boolean(id), username: id?.username || null });
}
