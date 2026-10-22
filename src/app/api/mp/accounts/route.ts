import { NextResponse } from "next/server";
import {
  getAdminFromRequest,
  isSuperIdentity,
} from "@/lib/adminAuth.server";
import {
  buildAuthorizationUrl,
  deleteAccount,
  isMpConfigured,
  listPublicAccounts,
} from "@/lib/mercadopago.server";

export const dynamic = "force-dynamic";

const forbidden = () =>
  NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

/** Lista de cuentas conectadas (sin tokens). Solo SUPERADMIN: define a dónde va el dinero. */
export async function GET(req: Request) {
  if (!isSuperIdentity(await getAdminFromRequest(req))) return forbidden();
  return NextResponse.json({
    ok: true,
    configured: isMpConfigured(),
    accounts: await listPublicAccounts(),
  });
}

/** Inicia la conexión de una cuenta: devuelve la URL de autorización de Mercado Pago. */
export async function POST(req: Request) {
  if (!isSuperIdentity(await getAdminFromRequest(req))) return forbidden();
  if (!isMpConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Faltan MP_CLIENT_ID y MP_CLIENT_SECRET en las variables de entorno.",
      },
      { status: 500 }
    );
  }
  const { label } = await req.json().catch(() => ({ label: "" }));
  return NextResponse.json({
    ok: true,
    url: buildAuthorizationUrl(req, String(label || "").trim().slice(0, 80)),
  });
}

/** Desconecta una cuenta. */
export async function DELETE(req: Request) {
  if (!isSuperIdentity(await getAdminFromRequest(req))) return forbidden();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Falta id" }, { status: 400 });
  await deleteAccount(id);
  return NextResponse.json({ ok: true });
}
