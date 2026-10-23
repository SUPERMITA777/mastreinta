import { NextResponse } from "next/server";
import type { EventItem, OrderAttendeeInput, OrderItem } from "@/lib/types";
import { clientIp, rateLimited } from "@/lib/adminAuth.server";
import {
  RESERVATION_MINUTES,
  createPreference,
  getAccountWithFreshToken,
  getSiteUrl,
  mutateState,
  newOrderId,
  releaseExpiredMpOrders,
  uniqueOrderCode,
} from "@/lib/mercadopago.server";

export const dynamic = "force-dynamic";

interface CheckoutBody {
  eventId: string;
  tierId?: string;
  spotId?: string;
  quantity?: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerDni?: string;
  attendees?: OrderAttendeeInput[];
}

class CheckoutError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/**
 * Crea la orden (reserva) y la preferencia de pago en Mercado Pago.
 * El precio, el stock y la cuenta destino se calculan SIEMPRE en el servidor.
 */
export async function POST(req: Request) {
  try {
    // Anti abuso: cada orden bloquea cupo/mesa 30 min. Máx 6 intentos / 10 min por IP.
    if (rateLimited(`checkout:${clientIp(req)}`, 6, 10 * 60 * 1000)) {
      throw new CheckoutError("Demasiados intentos. Probá de nuevo en unos minutos.", 429);
    }
    const body = (await req.json()) as CheckoutBody;
    const buyerName = String(body.buyerName || "").trim();
    const buyerEmail = String(body.buyerEmail || "").trim();
    const buyerPhone = String(body.buyerPhone || "").trim();
    if (!buyerName || !/^\S+@\S+\.\S+$/.test(buyerEmail) || !buyerPhone) {
      throw new CheckoutError("Completá nombre, email y WhatsApp válidos.");
    }

    const siteUrl = getSiteUrl(req);
    const expiresAt = new Date(
      Date.now() + RESERVATION_MINUTES * 60 * 1000
    ).toISOString();

    // 1) Reservar cupo / mesa y crear la orden pendiente
    const created = await mutateState((state) => {
      releaseExpiredMpOrders(state);

      const events = (state.events as EventItem[]) || [];
      const ev = events.find((e) => e.id === body.eventId);
      if (!ev || ev.hidden) throw new CheckoutError("Evento no disponible.", 404);
      if (ev.status === "AGOTADO") throw new CheckoutError("Evento agotado.", 409);
      if (!ev.paymentAccountId) {
        throw new CheckoutError(
          "Este evento todavía no tiene el pago online habilitado.",
          409
        );
      }

      const orders = ((state.orders as OrderItem[]) || []).slice();
      const spot = body.spotId
        ? ev.venueMap?.spots.find((s) => s.id === body.spotId)
        : undefined;
      if (body.spotId && !spot) throw new CheckoutError("Mesa inexistente.", 404);
      if (spot && spot.status !== "DISPONIBLE") {
        throw new CheckoutError("Esa mesa ya no está disponible.", 409);
      }

      const tier = spot
        ? undefined
        : ev.ticketTiers.find((t) => t.id === body.tierId) || ev.ticketTiers[0];
      if (!spot && !tier) throw new CheckoutError("Entrada inexistente.", 404);

      const quantity = spot
        ? 1
        : Math.min(20, Math.max(1, Math.floor(Number(body.quantity) || 1)));

      if (tier) {
        const pending = orders
          .filter(
            (o) =>
              o.eventId === ev.id &&
              o.tierId === tier.id &&
              o.status === "PENDIENTE" &&
              o.issueType === "MERCADOPAGO_WEB"
          )
          .reduce((n, o) => n + o.quantity, 0);
        if (tier.stock - tier.sold - pending < quantity) {
          throw new CheckoutError("No quedan entradas suficientes.", 409);
        }
      }

      const unitPrice = spot ? spot.price : tier!.price;
      const totalAmount = spot ? spot.price : tier!.price * quantity;
      if (!(totalAmount > 0)) {
        throw new CheckoutError("Este ticket no requiere pago online.");
      }
      const qrPerUnit = spot ? spot.capacity : Math.max(1, Number(tier!.qrCount) || 1);
      const totalQr = spot ? spot.capacity : quantity * qrPerUnit;

      const pct = Math.min(50, Math.max(0, Number(ev.platformFeePercent) || 0));
      const platformFee = Math.round(totalAmount * pct) / 100;

      const buyerDni = String(body.buyerDni || "").trim();
      const attendees: OrderAttendeeInput[] = Array.from({ length: totalQr }, (_, i) => {
        const p = body.attendees?.[i];
        if (p && String(p.name || "").trim()) {
          return {
            name: String(p.name).trim().slice(0, 120),
            dni: String(p.dni || "").trim() || buyerDni,
          };
        }
        return {
          name: i === 0 ? buyerName : `${buyerName} (Acceso #${i + 1})`,
          dni: buyerDni,
        };
      });

      const orderCode = uniqueOrderCode(orders);
      const order: OrderItem = {
        id: newOrderId(),
        orderCode,
        eventId: ev.id,
        eventSlug: ev.slug,
        eventTitle: ev.title,
        eventDateLabel: ev.dateLabel,
        eventTime: ev.time,
        eventVenue: ev.venueName,
        buyerName,
        buyerDni,
        buyerEmail,
        buyerPhone,
        tierId: spot ? spot.id : tier!.id,
        tierName: spot ? `${spot.name} (${spot.capacity} accesos)` : tier!.name,
        unitPrice,
        quantity,
        qrCountPerUnit: qrPerUnit,
        totalQrCount: totalQr,
        totalAmount,
        transferSender: buyerName,
        transferReference: "Mercado Pago (pendiente)",
        spotId: spot?.id,
        spotName: spot?.name,
        spotPerks: spot?.perks,
        sectorName: spot?.sectorName,
        attendees,
        status: "PENDIENTE",
        issueType: "MERCADOPAGO_WEB",
        paymentAccountId: ev.paymentAccountId,
        platformFee,
        expiresAt,
        createdAt: new Date().toISOString(),
      };

      state.orders = [order, ...orders];
      if (spot) {
        state.events = events.map((e) =>
          e.id !== ev.id || !e.venueMap
            ? e
            : {
                ...e,
                venueMap: {
                  ...e.venueMap,
                  spots: e.venueMap.spots.map((s) =>
                    s.id === spot.id
                      ? {
                          ...s,
                          status: "RESERVADO" as const,
                          reservedByOrderCode: orderCode,
                          reservedByName: buyerName,
                        }
                      : s
                  ),
                },
              }
        );
      }
      return { order, eventTitle: ev.title, accountId: ev.paymentAccountId };
    });

    // 2) Crear preferencia con el token de la cuenta destino del evento
    try {
      const account = await getAccountWithFreshToken(created.accountId);
      if (!account) {
        throw new CheckoutError("La cuenta de cobro del evento no está conectada.", 409);
      }
      const pref = await createPreference({
        accessToken: account.accessToken,
        title: `${created.eventTitle} · ${created.order.tierName} x${created.order.quantity}`,
        amount: created.order.totalAmount,
        fee: created.order.platformFee || 0,
        externalReference: created.order.id,
        accountId: account.id,
        buyerEmail,
        buyerName,
        siteUrl,
        expiresAt,
      });
      const isTestAccount =
        account.id.includes("test") ||
        account.accessToken.startsWith("TEST-") ||
        Boolean(account.email?.includes("testuser")) ||
        siteUrl.includes("localhost");

      const initPoint =
        isTestAccount && pref.sandbox_init_point
          ? pref.sandbox_init_point
          : pref.init_point;

      return NextResponse.json({
        ok: true,
        orderCode: created.order.orderCode,
        initPoint,
      });
    } catch (err) {
      // Revertir la reserva si no se pudo generar el link de pago
      await mutateState((state) => {
        const orders = (state.orders as OrderItem[]) || [];
        state.orders = orders.filter((o) => o.id !== created.order.id);
        const events = (state.events as EventItem[]) || [];
        state.events = events.map((e) =>
          e.venueMap?.spots?.some(
            (s) => s.reservedByOrderCode === created.order.orderCode
          )
            ? {
                ...e,
                venueMap: {
                  ...e.venueMap!,
                  spots: e.venueMap!.spots.map((s) =>
                    s.reservedByOrderCode === created.order.orderCode &&
                    s.status === "RESERVADO"
                      ? {
                          ...s,
                          status: "DISPONIBLE" as const,
                          reservedByOrderCode: undefined,
                          reservedByName: undefined,
                        }
                      : s
                  ),
                },
              }
            : e
        );
      });
      throw err;
    }
  } catch (err) {
    const status = err instanceof CheckoutError ? err.status : 500;
    const message =
      err instanceof CheckoutError
        ? err.message
        : "No pudimos iniciar el pago. Intentá de nuevo en unos minutos.";
    if (!(err instanceof CheckoutError)) console.error("[MP] checkout:", err);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
