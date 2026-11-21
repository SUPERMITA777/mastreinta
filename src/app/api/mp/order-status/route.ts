import { NextResponse } from "next/server";
import type { OrderItem, TicketQR } from "@/lib/types";
import { readCloudState } from "@/lib/cloudState.server";
import {
  failPaidOrder,
  fetchPayment,
  findPaymentByExternalReference,
  fulfillPaidOrder,
  getAccountWithFreshToken,
  getSiteUrl,
  sendTicketsEmail,
  verifyOrderAccessToken,
} from "@/lib/mercadopago.server";

export const dynamic = "force-dynamic";

/**
 * Estado público de una orden por ref externa. Si está aprobada, incluye los tickets con sus QRs.
 * Requiere el token firmado que se agrega a la URL de retorno de Mercado Pago (evita que
 * cualquiera con el id de la orden obtenga los códigos QR).
 * También ofrece conciliación directa con Mercado Pago cuando llega `payment_id` o `sync=1`.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const ref = params.get("ref") || "";
  const token = params.get("t") || "";
  if (!ref || !verifyOrderAccessToken(ref, token)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const rawPaymentId = params.get("payment_id") || params.get("collection_id") || "";
  const paymentId = /^\d+$/.test(rawPaymentId) ? rawPaymentId : "";
  const shouldSync = params.get("sync") === "1" || Boolean(paymentId);

  const state = await readCloudState();
  let order = ((state?.orders as OrderItem[]) || []).find((o) => o.id === ref);
  if (!order) return NextResponse.json({ ok: false }, { status: 404 });

  let fulfilledTickets: TicketQR[] | null = null;

  if (order.status !== "APROBADA" && order.paymentAccountId && shouldSync) {
    try {
      const account = await getAccountWithFreshToken(order.paymentAccountId);
      if (account) {
        let payment = paymentId
          ? await fetchPayment(account.accessToken, paymentId)
          : null;
        if (
          !payment ||
          payment.external_reference !== order.id ||
          payment.status !== "approved"
        ) {
          const searched = await findPaymentByExternalReference(
            account.accessToken,
            order.id
          );
          if (searched) {
            payment = searched;
          }
        }

        if (payment && payment.external_reference === order.id) {
          if (
            payment.status === "approved" &&
            Math.abs(payment.transaction_amount - order.totalAmount) <= 0.01
          ) {
            const fulfilled = await fulfillPaidOrder(order.id, payment);
            if (fulfilled.order) {
              order = fulfilled.order;
              fulfilledTickets = fulfilled.tickets;
              if (!fulfilled.alreadyDone) {
                await sendTicketsEmail(
                  getSiteUrl(req),
                  fulfilled.order,
                  fulfilled.tickets
                );
              }
            }
          } else if (
            payment.status === "rejected" ||
            payment.status === "cancelled"
          ) {
            await failPaidOrder(order.id, payment);
            const isExpired = Boolean(
              order.expiresAt && new Date(order.expiresAt).getTime() <= Date.now()
            );
            order = {
              ...order,
              paymentId: String(payment.id),
              paymentStatus: payment.status,
              ...(isExpired ? { status: "RECHAZADA" as const } : {}),
            };
          }
        }
      }
    } catch (err) {
      console.error("[MP] order-status sync:", err);
    }
  }

  const tickets =
    order.status === "APROBADA"
      ? fulfilledTickets && fulfilledTickets.length > 0
        ? fulfilledTickets
        : ((state?.tickets as TicketQR[]) || []).filter(
            (t) => t.orderId === order.id || t.orderCode === order.orderCode
          )
      : [];

  return NextResponse.json({
    ok: true,
    status: order.status,
    paymentStatus: order.paymentStatus,
    orderCode: order.orderCode,
    eventTitle: order.eventTitle,
    eventSlug: order.eventSlug,
    buyerName: order.buyerName,
    totalAmount: order.totalAmount,
    tickets,
  });
}
