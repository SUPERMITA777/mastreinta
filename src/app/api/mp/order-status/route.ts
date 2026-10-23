import { NextResponse } from "next/server";
import type { OrderItem, TicketQR } from "@/lib/types";
import { readCloudState } from "@/lib/cloudState.server";

export const dynamic = "force-dynamic";

/** Estado público de una orden por ref externa. Si está aprobada, incluye los tickets con sus QRs. */
export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref") || "";
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
    buyerEmail: order.buyerEmail,
    totalAmount: order.totalAmount,
    tickets,
  });
}
