import { NextResponse } from "next/server";
import { clientIp, isSameOrigin, rateLimited } from "@/lib/adminAuth.server";
import { getAdminSupabase } from "@/lib/cloudState.server";
import { findDoorPassByToken } from "@/lib/doorPasses.server";
import { mutateState } from "@/lib/mercadopago.server";
import type { EventItem, OrderItem, TicketQR } from "@/lib/types";

export const dynamic = "force-dynamic";

type DoorOutcome =
  | "AUTORIZADO"
  | "YA_USADO"
  | "NO_ENCONTRADO"
  | "ANULADO"
  | "OTRO_EVENTO";

interface SafeDoorTicket {
  id: string;
  shortCode: string;
  orderCode: string;
  eventId: string;
  eventTitle: string;
  tierName: string;
  spotName?: string;
  spotPerks?: string;
  sectorName?: string;
  holderName: string;
  holderDni: string;
  ticketNumber: number;
  totalInOrder: number;
  status: TicketQR["status"];
  scannedAt?: string;
  scannedBy?: string;
  scannedByName?: string;
  scannedDoor?: string;
}

interface DoorScanResult {
  outcome: DoorOutcome;
  message: string;
  ticket?: SafeDoorTicket;
  previousScannedAt?: string;
}

function safeDoorTicket(t: TicketQR): SafeDoorTicket {
  return {
    id: t.id,
    shortCode: t.shortCode,
    orderCode: t.orderCode,
    eventId: t.eventId,
    eventTitle: t.eventTitle,
    tierName: t.tierName,
    spotName: t.spotName,
    spotPerks: t.spotPerks,
    sectorName: t.sectorName,
    holderName: t.holderName,
    holderDni: t.holderDni,
    ticketNumber: t.ticketNumber,
    totalInOrder: t.totalInOrder,
    status: t.status,
    scannedAt: t.scannedAt,
    scannedBy: t.scannedBy,
    scannedByName: t.scannedByName,
    scannedDoor: t.scannedDoor,
  };
}

function isExactTicketMatch(t: TicketQR, clean: string): boolean {
  const qrUpper = String(t.qrCode || "").trim().toUpperCase();
  const shortUpper = String(t.shortCode || "").trim().toUpperCase();
  const idUpper = String(t.id || "").trim().toUpperCase();
  const qrParts = qrUpper.split("|").map((p) => p.trim());
  return (
    qrUpper === clean ||
    shortUpper === clean ||
    idUpper === clean ||
    (qrParts.length >= 3 && clean === qrParts[2]) ||
    (qrUpper.length > 0 && clean.includes(qrUpper))
  );
}

function isOrderCodeMatch(t: TicketQR, clean: string): boolean {
  const orderUpper = String(t.orderCode || "").trim().toUpperCase();
  return Boolean(orderUpper) && (orderUpper === clean || `MAS30-${clean}` === orderUpper);
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json(
      { ok: false, error: "Origen no permitido" },
      { status: 403 }
    );
  }

  if (rateLimited(`door-scan:${clientIp(req)}`, 180, 60 * 1000)) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas lecturas por minuto. Esperá unos segundos." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    token?: string;
    code?: string;
    operatorName?: string;
    doorName?: string;
  };

  const pass = await findDoorPassByToken(String(body.token || ""));
  if (!pass) {
    return NextResponse.json(
      {
        ok: false,
        revoked: true,
        error: "Acceso revocado o inválido. Escaneá el nuevo QR de puerta del organizador.",
      },
      { status: 401 }
    );
  }

  if (!pass.enabled) {
    return NextResponse.json(
      {
        ok: false,
        revoked: true,
        error: "El acceso de puerta para este evento fue pausado por el organizador.",
      },
      { status: 403 }
    );
  }

  const rawInput = String(body.code || "").trim();
  if (!rawInput) {
    return NextResponse.json(
      { ok: false, error: "Código vacío." },
      { status: 400 }
    );
  }

  if (rawInput.toLowerCase().includes("/puerta/")) {
    return NextResponse.json({
      ok: true,
      result: {
        outcome: "NO_ENCONTRADO",
        message: "Escaneaste el QR de acceso de puerta. Apuntá al QR de la entrada del asistente.",
      } satisfies DoorScanResult,
    });
  }

  let clean = rawInput.toUpperCase();
  if (clean.includes("/MI-ENTRADA/")) {
    const urlParts = clean.split("/MI-ENTRADA/");
    if (urlParts.length > 1) {
      clean = urlParts[1].split(/[?#/\s]/)[0].trim().toUpperCase();
    }
  }

  const doorLabel =
    String(body.doorName || pass.doorLabel || "Puerta Principal")
      .trim()
      .slice(0, 60) || "Puerta Principal";
  const operatorLabel =
    String(body.operatorName || doorLabel)
      .trim()
      .slice(0, 60) || doorLabel;

  let revokedError: string | null = null;
  let scanResult: DoorScanResult = {
    outcome: "NO_ENCONTRADO",
    message: "Código inválido o inexistente.",
  };
  let finalStats = { totalTickets: 0, scannedTickets: 0 };

  const updatedTicket = await mutateState<TicketQR | null>((state) => {
    const events = (Array.isArray(state.events) ? state.events : []) as EventItem[];
    const ev = events.find((e) => e.id === pass.eventId);
    if (!ev || ev.archived || ev.status === "ARCHIVADO") {
      revokedError =
        "Este evento ya fue archivado o no está disponible para control de puerta.";
      return null;
    }

    const allTickets = (Array.isArray(state.tickets)
      ? state.tickets
      : []) as TicketQR[];
    const orders = (Array.isArray(state.orders) ? state.orders : []) as OrderItem[];

    const eventTickets = allTickets.filter((t) => t.eventId === pass.eventId);
    const otherTickets = allTickets.filter((t) => t.eventId !== pass.eventId);
    const baseStats = {
      totalTickets: eventTickets.length,
      scannedTickets: eventTickets.filter(
        (t) => String(t.status || "").toUpperCase() === "USADO"
      ).length,
    };

    let match = eventTickets.find((t) => isExactTicketMatch(t, clean));
    if (!match) {
      const orderMatches = eventTickets.filter((t) =>
        isOrderCodeMatch(t, clean)
      );
      match =
        orderMatches.find(
          (t) => String(t.status || "VALIDO").toUpperCase() === "VALIDO"
        ) || orderMatches[0];
    }

    if (!match) {
      const belongsToOther = otherTickets.some(
        (t) => isExactTicketMatch(t, clean) || isOrderCodeMatch(t, clean)
      );
      if (belongsToOther) {
        scanResult = {
          outcome: "OTRO_EVENTO",
          message: `Esta entrada corresponde a otro evento y NO es válida para ${ev.title}.`,
        };
        finalStats = baseStats;
        return null;
      }

      const pendingOrder = orders.find(
        (o) =>
          o.eventId === pass.eventId &&
          o.status === "PENDIENTE" &&
          (String(o.orderCode || "").trim().toUpperCase() === clean ||
            `MAS30-${clean}` ===
              String(o.orderCode || "").trim().toUpperCase())
      );
      if (pendingOrder) {
        scanResult = {
          outcome: "NO_ENCONTRADO",
          message: `La orden ${pendingOrder.orderCode} (${pendingOrder.buyerName}) aún figura PENDIENTE DE APROBACIÓN.`,
        };
        finalStats = baseStats;
        return null;
      }

      scanResult = {
        outcome: "NO_ENCONTRADO",
        message: `Código inválido o inexistente para ${ev.title}.`,
      };
      finalStats = baseStats;
      return null;
    }

    const status = String(match.status || "VALIDO").toUpperCase();
    if (status === "ANULADO" || status === "BLOQUEADO") {
      scanResult = {
        outcome: "ANULADO",
        message:
          status === "BLOQUEADO"
            ? "Entrada bloqueada por la administración."
            : "Entrada anulada por la administración.",
        ticket: safeDoorTicket(match),
      };
      finalStats = baseStats;
      return null;
    }

    if (status === "USADO") {
      scanResult = {
        outcome: "YA_USADO",
        message: "Este código ya fue registrado anteriormente.",
        ticket: safeDoorTicket(match),
        previousScannedAt: match.scannedAt,
      };
      finalStats = baseStats;
      return null;
    }

    const nowIso = new Date().toISOString();
    const nextTicket: TicketQR = {
      ...match,
      status: "USADO",
      scannedAt: nowIso,
      scannedBy: operatorLabel,
      scannedByName: operatorLabel,
      scannedByUsername: "puerta-qr",
      scannedDoor: doorLabel,
    };

    state.tickets = allTickets.map((t) =>
      t.id === match.id ? nextTicket : t
    );

    scanResult = {
      outcome: "AUTORIZADO",
      message: "Acceso validado correctamente.",
      ticket: safeDoorTicket(nextTicket),
    };
    finalStats = {
      totalTickets: baseStats.totalTickets,
      scannedTickets: baseStats.scannedTickets + 1,
    };
    return nextTicket;
  });

  if (revokedError) {
    return NextResponse.json(
      { ok: false, revoked: true, error: revokedError },
      { status: 403 }
    );
  }

  if (updatedTicket) {
    try {
      await getAdminSupabase()
        .from("tickets")
        .upsert(
          {
            id: updatedTicket.id,
            qr_code: updatedTicket.qrCode,
            order_id: updatedTicket.orderId,
            order_code: updatedTicket.orderCode,
            event_id: updatedTicket.eventId,
            event_title: updatedTicket.eventTitle,
            event_date: updatedTicket.eventDateLabel || "",
            event_venue: updatedTicket.eventVenue || "",
            tier_name: updatedTicket.tierName || "",
            holder_name: updatedTicket.holderName,
            holder_dni: updatedTicket.holderDni || "",
            ticket_number: updatedTicket.ticketNumber,
            total_in_order: updatedTicket.totalInOrder,
            unit_price: updatedTicket.unitPrice || 0,
            generated_by_username:
              updatedTicket.generatedByUsername || "puerta-qr",
            generated_by_name:
              updatedTicket.generatedByName || "Control Puerta QR",
            status: "USADO",
            scanned_at: updatedTicket.scannedAt || new Date().toISOString(),
            scanned_by: operatorLabel,
            created_at: updatedTicket.createdAt || new Date().toISOString(),
          },
          { onConflict: "id" }
        );
    } catch (pgErr) {
      console.error("[door/scan] Error al respaldar ticket en Postgres:", pgErr);
    }
  }

  return NextResponse.json({
    ok: true,
    result: scanResult,
    stats: finalStats,
  });
}
