import { NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/adminAuth.server";
import { readCloudState } from "@/lib/cloudState.server";
import { findDoorPassByToken } from "@/lib/doorPasses.server";
import type { EventItem, TicketQR } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (rateLimited(`door-session:${clientIp(req)}`, 60, 5 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited", error: "Demasiados intentos. Esperá unos minutos." },
      { status: 429 }
    );
  }

  const token = (new URL(req.url).searchParams.get("token") || "").trim();
  const pass = await findDoorPassByToken(token);
  if (!pass) {
    return NextResponse.json(
      {
        ok: false,
        reason: "invalid",
        error: "Este código QR de acceso a puerta no es válido o fue reemplazado por uno nuevo.",
      },
      { status: 404 }
    );
  }

  if (!pass.enabled) {
    return NextResponse.json(
      {
        ok: false,
        reason: "disabled",
        error: "El acceso de control de puerta para este evento está pausado por el organizador.",
      },
      { status: 403 }
    );
  }

  const state = await readCloudState();
  const events = (Array.isArray(state?.events) ? state!.events : []) as EventItem[];
  const ev = events.find((e) => e.id === pass.eventId);
  if (!ev) {
    return NextResponse.json(
      {
        ok: false,
        reason: "event_not_found",
        error: "El evento asociado ya no está disponible.",
      },
      { status: 404 }
    );
  }

  if (ev.archived || ev.status === "ARCHIVADO") {
    return NextResponse.json(
      {
        ok: false,
        reason: "archived",
        error: "Este evento ya fue archivado y su control de puerta está cerrado.",
      },
      { status: 403 }
    );
  }

  const tickets = (Array.isArray(state?.tickets) ? state!.tickets : []) as TicketQR[];
  const evTickets = tickets.filter((t) => t.eventId === ev.id);
  const scannedTickets = evTickets.filter(
    (t) => String(t.status || "").toUpperCase() === "USADO"
  ).length;

  return NextResponse.json({
    ok: true,
    event: {
      id: ev.id,
      title: ev.title,
      dateLabel: ev.dateLabel,
      time: ev.time,
      venueName: ev.venueName,
      flyerUrl: ev.flyerUrl,
    },
    doorLabel: pass.doorLabel || "Puerta Principal",
    stats: {
      totalTickets: evTickets.length,
      scannedTickets,
    },
  });
}
