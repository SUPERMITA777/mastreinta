import { NextResponse } from "next/server";
import type { EventItem, OrderAttendeeInput, OrderItem } from "@/lib/types";
import { clientIp, rateLimited } from "@/lib/adminAuth.server";
import {
  mutateState,
  newOrderId,
  uniqueOrderCode,
} from "@/lib/mercadopago.server";

export const dynamic = "force-dynamic";

interface TransferOrderBody {
  eventId: string;
  tierId?: string;
  spotId?: string;
  quantity?: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerDni?: string;
  attendees?: OrderAttendeeInput[];
  notes?: string;
}

export async function POST(req: Request) {
  try {
    // Máximo 15 reservas por cada 5 minutos por IP
    if (rateLimited(`transfer:${clientIp(req)}`, 15, 5 * 60 * 1000)) {
      return NextResponse.json(
        { ok: false, error: "Demasiados intentos. Aguardá unos minutos." },
        { status: 429 }
      );
    }

    const body = (await req.json()) as TransferOrderBody;
    const buyerName = String(body.buyerName || "").trim();
    const buyerEmail = String(body.buyerEmail || "").trim();
    const buyerPhone = String(body.buyerPhone || "").trim();
    const buyerDni = String(body.buyerDni || "").trim();

    if (!buyerName || !buyerPhone || !/^\S+@\S+\.\S+$/.test(buyerEmail)) {
      return NextResponse.json(
        { ok: false, error: "Completá nombre, WhatsApp y un email válido." },
        { status: 400 }
      );
    }

    const created = await mutateState((state) => {
      const events = (state.events as EventItem[]) || [];
      const ev = events.find((e) => e.id === body.eventId);
      if (!ev || ev.hidden) {
        throw new Error("El evento no está disponible.");
      }
      if (ev.status === "AGOTADO") {
        throw new Error("El evento se encuentra agotado.");
      }

      const orders = ((state.orders as OrderItem[]) || []).slice();

      const spot = body.spotId
        ? ev.venueMap?.spots.find((s) => s.id === body.spotId)
        : undefined;
      if (body.spotId && !spot) {
        throw new Error("La mesa o sector seleccionado no existe.");
      }
      if (spot && spot.status !== "DISPONIBLE") {
        throw new Error("La mesa o sector seleccionado ya no está disponible.");
      }

      const tier = spot
        ? undefined
        : ev.ticketTiers.find((t) => t.id === body.tierId) || ev.ticketTiers[0];
      if (!spot && !tier) {
        throw new Error("Tipo de entrada no encontrado.");
      }

      const quantity = spot
        ? 1
        : Math.min(20, Math.max(1, Math.floor(Number(body.quantity) || 1)));

      const unitPrice = spot ? spot.price : tier!.price;
      const totalAmount = spot ? spot.price : tier!.price * quantity;
      const qrPerUnit = spot ? spot.capacity : Math.max(1, Number(tier!.qrCount) || 1);
      const totalQr = spot ? spot.capacity : quantity * qrPerUnit;

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
      const orderNotes = [
        body.notes?.trim() || "",
        spot ? `[Mesa / Sector Reservado: ${spot.name}${spot.perks ? ` · ${spot.perks}` : ""}]` : "",
      ]
        .filter(Boolean)
        .join(" ");

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
        transferReference: "Transferencia / WhatsApp",
        notes: orderNotes,
        spotId: spot?.id,
        spotName: spot?.name,
        spotPerks: spot?.perks,
        sectorName: spot?.sectorName,
        attendees,
        status: "PENDIENTE",
        issueType: "TRANSFERENCIA_WEB",
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

      return order;
    });

    return NextResponse.json({
      ok: true,
      order: created,
      orderCode: created.orderCode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al registrar la orden";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
