import { NextResponse } from "next/server";
import type { OrderItem, TicketQR } from "@/lib/types";
import { readCloudState } from "@/lib/cloudState.server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const code = (params.get("orderCode") || "").trim().toUpperCase();
    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Código de orden requerido" },
        { status: 400 }
      );
    }

    const state = await readCloudState();
    const orders = (state?.orders as OrderItem[]) || [];
    const order = orders.find(
      (o) =>
        o.orderCode?.trim().toUpperCase() === code ||
        o.id?.trim().toUpperCase() === code
    );

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    const tickets =
      order.status === "APROBADA"
        ? ((state?.tickets as TicketQR[]) || []).filter(
            (t) =>
              t.orderId === order.id ||
              t.orderCode?.trim().toUpperCase() === order.orderCode.trim().toUpperCase()
          )
        : [];

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        orderCode: order.orderCode,
        eventId: order.eventId,
        eventSlug: order.eventSlug,
        eventTitle: order.eventTitle,
        eventDateLabel: order.eventDateLabel,
        eventTime: order.eventTime,
        eventVenue: order.eventVenue,
        buyerName: order.buyerName,
        buyerDni: order.buyerDni,
        buyerEmail: order.buyerEmail,
        buyerPhone: order.buyerPhone,
        tierName: order.tierName,
        quantity: order.quantity,
        totalQrCount: order.totalQrCount,
        totalAmount: order.totalAmount,
        status: order.status,
        spotName: order.spotName,
        sectorName: order.sectorName,
        createdAt: order.createdAt,
      },
      tickets,
    });
  } catch (err) {
    console.error("[orders-lookup]:", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
