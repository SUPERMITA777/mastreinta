import { NextResponse } from "next/server";
import {
  connectAccountFromCode,
  getSiteUrl,
  verifyState,
} from "@/lib/mercadopago.server";

export const dynamic = "force-dynamic";

/** Redirección de vuelta desde Mercado Pago tras autorizar la cuenta del administrador. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const site = getSiteUrl(req);
  const code = url.searchParams.get("code");
  const state = verifyState<{ label: string; ts: number }>(
    url.searchParams.get("state") || ""
  );

  // El state firmado evita que un tercero conecte cuentas ajenas; vence a los 15 min
  if (!code || !state || Date.now() - state.ts > 15 * 60 * 1000) {
    return NextResponse.redirect(`${site}/admin?mp=error`);
  }

  try {
    await connectAccountFromCode(req, code, state.label);
    return NextResponse.redirect(`${site}/admin?mp=connected`);
  } catch (err) {
    console.error("[MP] callback OAuth:", err);
    return NextResponse.redirect(`${site}/admin?mp=error`);
  }
}
