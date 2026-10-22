import { NextResponse } from "next/server";
import {
  buildAuthorizationUrl,
  deleteAccount,
  isAdminRequest,
  isMpConfigured,
  listPublicAccounts,
} from "@/lib/mercadopago.server";

export const dynamic = "force-dynamic";

const unauthorized = () =>
  NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

/** Lista de cuentas conectadas (sin tokens). Solo operadores. */
export async function GET(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  return NextResponse.json({
    ok: true,
    configured: isMpConfigured(),
    accounts: await listPublicAccounts(),
  });
}

/** Inicia la conexión de una cuenta: devuelve la URL de autorización de Mercado Pago. */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
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
  if (!isAdminRequest(req)) return unauthorized();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Falta id" }, { status: 400 });
  await deleteAccount(id);
  return NextResponse.json({ ok: true });
}
