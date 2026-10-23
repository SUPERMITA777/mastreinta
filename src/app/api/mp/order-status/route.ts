import { NextResponse } from "next/server";
import type { OrderItem, TicketQR } from "@/lib/types";
import { readCloudState } from "@/lib/cloudState.server";
import { verifyOrderAccessToken } from "@/lib/mercadopago.server";

export const dynamic = "force-dynamic";

/**
 * Estado público de una orden por ref externa. Si está aprobada, incluye los tickets con sus QRs.
 * Requiere el token firmado que se agrega a la URL de retorno de Mercado Pago (evita que
 * cualquiera con el id de la orden obtenga los códigos QR).
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const ref = params.get("ref") || "";
  const token = params.get("t") || "";
  if (!ref || !verifyOrderAccessToken(ref, token)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const state = await readCloudState();
  const order = ((state?.orders as OrderItem[]) || []).find((o) => o.id === ref);
  if (!order) return NextResponse.json({ ok: false }, { status: 404 });

  const tickets =
    order.status === "APROBADA"
      ? ((state?.tickets as TicketQR[]) || []).filter(
          (t) => t.orderId === order.id || t.orderCode === order.orderCode
        )
      : [];

  return NextResponse.json({
    ok: true,
    status: order.status,
    orderCode: order.orderCode,
    eventTitle: order.eventTitle,
    buyerName: order.buyerName,
    totalAmount: order.totalAmount,
    tickets,
  });
}
