import { NextResponse } from "next/server";
import type { OrderItem } from "@/lib/types";
import {
  failPaidOrder,
  fetchPayment,
  fulfillPaidOrder,
  getAccountWithFreshToken,
  getSiteUrl,
  sendTicketsEmail,
  verifyWebhookSignature,
} from "@/lib/mercadopago.server";
import { readCloudState } from "@/lib/cloudState.server";

export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const url = new URL(req.url);
  const accountId = url.searchParams.get("acc") || "";

  let body: { type?: string; topic?: string; data?: { id?: string | number } } = {};
  try {
    body = await req.json();
  } catch {
    // IPN clásico llega por querystring
  }

  const topic = body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic");
  const paymentId = String(
    body.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id") || ""
  );

  // Solo nos interesan los pagos; el resto se confirma con 200 para que MP no reintente
  if (topic !== "payment" || !paymentId || !accountId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!verifyWebhookSignature(req, paymentId)) {
    return NextResponse.json({ ok: false, error: "Firma inválida" }, { status: 401 });
  }

  const account = await getAccountWithFreshToken(accountId);
  if (!account) return NextResponse.json({ ok: true, ignored: true });

  // Nunca confiamos en el body: consultamos el pago directo a MP con el token del vendedor
  const payment = await fetchPayment(account.accessToken, paymentId);
  if (!payment || !payment.external_reference) {
    return NextResponse.json({ ok: false }, { status: 502 }); // MP reintenta
  }

  const orderId = payment.external_reference;
  const state = await readCloudState();
  const order = ((state?.orders as OrderItem[]) || []).find((o) => o.id === orderId);
  if (!order || order.paymentAccountId !== accountId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (payment.status === "approved") {
    // El monto cobrado debe coincidir con el calculado por el servidor
    if (Math.abs(payment.transaction_amount - order.totalAmount) > 0.01) {
      console.error("[MP] Monto no coincide", orderId, payment.transaction_amount, order.totalAmount);
      return NextResponse.json({ ok: true, ignored: "amount_mismatch" });
    }
    const result = await fulfillPaidOrder(orderId, payment);
    if (result.order && !result.alreadyDone) {
      await sendTicketsEmail(getSiteUrl(req), result.order, result.tickets);
    }
  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    await failPaidOrder(orderId, payment);
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err) {
    console.error("[MP] webhook:", err);
    return NextResponse.json({ ok: false }, { status: 500 }); // MP reintenta
  }
}

export const GET = POST;
