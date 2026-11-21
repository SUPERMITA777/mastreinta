import { NextResponse } from "next/server";
import {
  AdminIdentity,
  getAdminFromRequest,
  hasPermission,
  isSuperIdentity,
} from "@/lib/adminAuth.server";
import { readCloudState } from "@/lib/cloudState.server";
import {
  canAdminManageEventDoor,
  ensureDoorPassForEvent,
  readDoorPasses,
  rotateDoorPassForEvent,
  updateDoorPassForEvent,
} from "@/lib/doorPasses.server";
import { getSiteUrl } from "@/lib/mercadopago.server";
import type { EventItem } from "@/lib/types";

export const dynamic = "force-dynamic";

async function authorizeDoorManager(
  req: Request
): Promise<{ admin: AdminIdentity } | { errorResponse: NextResponse }> {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return {
      errorResponse: NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 401 }
      ),
    };
  }
  const allowed =
    isSuperIdentity(admin) ||
    (await hasPermission(admin, "canUseScanner")) ||
    (await hasPermission(admin, "canManageEvents")) ||
    (await hasPermission(admin, "canViewTickets"));
  if (!allowed) {
    return {
      errorResponse: NextResponse.json(
        { ok: false, error: "Sin permiso para gestionar el lector de puerta" },
        { status: 403 }
      ),
    };
  }
  return { admin };
}

function serializeEventMeta(ev: EventItem) {
  return {
    id: ev.id,
    title: ev.title,
    dateLabel: ev.dateLabel,
    time: ev.time,
    venueName: ev.venueName,
  };
}

export async function GET(req: Request) {
  const auth = await authorizeDoorManager(req);
  if ("errorResponse" in auth) return auth.errorResponse;
  const { admin } = auth;

  const eventId = (new URL(req.url).searchParams.get("eventId") || "").trim();
  const state = await readCloudState();
  const events = (Array.isArray(state?.events) ? state!.events : []) as EventItem[];
  const siteUrl = getSiteUrl(req);
  const passes = await readDoorPasses();

  if (eventId) {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) {
      return NextResponse.json(
        { ok: false, error: "Evento no encontrado" },
        { status: 404 }
      );
    }
    if (!canAdminManageEventDoor(admin, ev)) {
      return NextResponse.json(
        { ok: false, error: "Sin acceso a este evento" },
        { status: 403 }
      );
    }
    const pass = passes.find((p) => p.eventId === eventId) || null;
    return NextResponse.json({
      ok: true,
      pass,
      url: pass ? `${siteUrl}/puerta/${pass.token}` : null,
      event: serializeEventMeta(ev),
    });
  }

  const accessibleEvents = events.filter((ev) => canAdminManageEventDoor(admin, ev));
  const accessibleIds = new Set(accessibleEvents.map((e) => e.id));
  const scopedPasses = passes
    .filter((p) => accessibleIds.has(p.eventId))
    .map((p) => ({
      ...p,
      url: `${siteUrl}/puerta/${p.token}`,
    }));

  return NextResponse.json({
    ok: true,
    passes: scopedPasses,
  });
}

export async function POST(req: Request) {
  const auth = await authorizeDoorManager(req);
  if ("errorResponse" in auth) return auth.errorResponse;
  const { admin } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    eventId?: string;
    action?: "ensure" | "rotate" | "toggle" | "update_label";
    enabled?: boolean;
    doorLabel?: string;
  };
  const eventId = String(body.eventId || "").trim();
  if (!eventId) {
    return NextResponse.json(
      { ok: false, error: "eventId requerido" },
      { status: 400 }
    );
  }

  const state = await readCloudState();
  const events = (Array.isArray(state?.events) ? state!.events : []) as EventItem[];
  const ev = events.find((e) => e.id === eventId);
  if (!ev) {
    return NextResponse.json(
      { ok: false, error: "Evento no encontrado" },
      { status: 404 }
    );
  }
  if (!canAdminManageEventDoor(admin, ev)) {
    return NextResponse.json(
      { ok: false, error: "Sin acceso a este evento" },
      { status: 403 }
    );
  }

  const action = body.action || "ensure";
  let pass;
  if (action === "rotate") {
    pass = await rotateDoorPassForEvent(eventId, admin.username);
  } else if (action === "toggle") {
    pass = await updateDoorPassForEvent(
      eventId,
      { enabled: Boolean(body.enabled) },
      admin.username
    );
  } else if (action === "update_label") {
    const cleanLabel =
      String(body.doorLabel || "").trim().slice(0, 60) || "Puerta Principal";
    pass = await updateDoorPassForEvent(
      eventId,
      { doorLabel: cleanLabel },
      admin.username
    );
  } else {
    pass = await ensureDoorPassForEvent(eventId, admin.username, body.doorLabel);
  }

  const siteUrl = getSiteUrl(req);
  return NextResponse.json({
    ok: true,
    pass,
    url: `${siteUrl}/puerta/${pass.token}`,
    event: serializeEventMeta(ev),
  });
}
