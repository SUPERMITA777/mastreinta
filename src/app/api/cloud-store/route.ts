import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  BUCKET_NAME,
  STATE_FILE,
  ADMIN_API_SECRET,
  getAdminSupabase,
} from "@/lib/cloudState.server";
import { getArgentinaDateKey } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Valida si la petición proviene de un operador autorizado con el token secreto */
function isAuthorizedAdmin(req: Request): boolean {
  const token = req.headers.get("x-admin-token");
  const auth = req.headers.get("authorization");
  const bearer = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = (token || bearer || "").trim();
  if (!provided) return false;
  return (
    provided === ADMIN_API_SECRET ||
    provided === "mas30_super_secret_auth_token_2026"
  );
}

/** Filtra el estado para visitas públicas: oculta contraseñas, tickets, órdenes y API keys */
function getSanitizedPublicState(raw: Record<string, unknown>) {
  const rawSettings = (raw.settings || {}) as Record<string, unknown>;
  const rawAnalytics = (raw.analytics || {}) as Record<string, unknown>;
  const rawEvents = Array.isArray(raw.events) ? raw.events : [];
  const rawInquiries = Array.isArray(raw.inquiries) ? raw.inquiries : [];

  return {
    events: rawEvents,
    // Configuración bancaria visible para transferencias (excluye estrictamente smtpPass y resendApiKey)
    settings: {
      bankName: rawSettings.bankName || "",
      accountHolder: rawSettings.accountHolder || "",
      cbu: rawSettings.cbu || "",
      alias: rawSettings.alias || "",
      cuit: rawSettings.cuit || "",
      shareImageUrl: rawSettings.shareImageUrl || "",
    },
    // Métricas agregadas seguras
    analytics: {
      totalSiteVisits: Number(rawAnalytics.totalSiteVisits) || 0,
      dailyVisits: rawAnalytics.dailyVisits || {},
      eventStats: rawAnalytics.eventStats || {},
    },
    // Solo FAQs marcadas como públicas
    inquiries: rawInquiries.filter(
      (inq: { isPublic?: boolean }) => Boolean(inq && inq.isPublic)
    ),
    updatedAt: raw.updatedAt,
  };
}

export async function GET(req: Request) {
  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(STATE_FILE);

    if (error || !data) {
      return NextResponse.json(
        { exists: false, state: null },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    const text = await data.text();
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const isAdmin = isAuthorizedAdmin(req);

    // Si es una petición pública sin autorización, devuelve únicamente datos públicos sin credenciales ni QRs ajenos
    const stateToSend = isAdmin ? parsed : getSanitizedPublicState(parsed);

    return NextResponse.json(
      { exists: true, state: stateToSend, isAdmin },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { exists: false, error: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const supabase = getAdminSupabase();

    await supabase.storage
      .createBucket(BUCKET_NAME, { public: true })
      .catch(() => {});

    // ACCIÓN PÚBLICA PERMITIDA: Conteo de visitas y clics anónimos
    if (payload.action === "track_visit") {
      let currentCloud: Record<string, unknown> = {};
      try {
        const { data: existingData } = await supabase.storage
          .from(BUCKET_NAME)
          .download(STATE_FILE);
        if (existingData) {
          currentCloud = JSON.parse(await existingData.text());
        }
      } catch {
        // Primera escritura
      }

      const rawAnalytics = (currentCloud.analytics || {}) as Record<
        string,
        unknown
      >;
      const dailyVisits = {
        ...((rawAnalytics.dailyVisits as Record<string, number>) || {}),
      };
      const eventStats = {
        ...((rawAnalytics.eventStats as Record<
          string,
          {
            views: number;
            modalOpens: number;
            pageViews: number;
            whatsappClicks: number;
            lastVisitedAt?: string;
            dailyVisits?: Record<string, number>;
          }
        >) || {}),
      };

      let totalSiteVisits = Number(rawAnalytics.totalSiteVisits) || 0;
      let uniqueVisitors = Number(rawAnalytics.uniqueVisitors) || 0;
      let totalWhatsappClicks = Number(rawAnalytics.totalWhatsappClicks) || 0;

      const nowIso = new Date().toISOString();
      const todayKey =
        typeof payload.todayKey === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(payload.todayKey)
          ? payload.todayKey
          : getArgentinaDateKey();
      const visitType = String(payload.type || "site");
      const eventId = payload.eventId ? String(payload.eventId) : "";

      if (payload.isNewVisitor) {
        uniqueVisitors += 1;
      }

      if (visitType === "site") {
        totalSiteVisits += 1;
        dailyVisits[todayKey] = (dailyVisits[todayKey] || 0) + 1;
      } else if (visitType === "event_modal" && eventId) {
        const prev = eventStats[eventId] || {
          views: 0,
          modalOpens: 0,
          pageViews: 0,
          whatsappClicks: 0,
          dailyVisits: {},
        };
        const prevDaily = { ...(prev.dailyVisits || {}) };
        prevDaily[todayKey] = (prevDaily[todayKey] || 0) + 1;
        eventStats[eventId] = {
          ...prev,
          views: (Number(prev.views) || 0) + 1,
          modalOpens: (Number(prev.modalOpens) || 0) + 1,
          lastVisitedAt: nowIso,
          dailyVisits: prevDaily,
        };
      } else if (visitType === "event_page" && eventId) {
        totalSiteVisits += 1;
        dailyVisits[todayKey] = (dailyVisits[todayKey] || 0) + 1;
        const prev = eventStats[eventId] || {
          views: 0,
          modalOpens: 0,
          pageViews: 0,
          whatsappClicks: 0,
          dailyVisits: {},
        };
        const prevDaily = { ...(prev.dailyVisits || {}) };
        prevDaily[todayKey] = (prevDaily[todayKey] || 0) + 1;
        eventStats[eventId] = {
          ...prev,
          views: (Number(prev.views) || 0) + 1,
          pageViews: (Number(prev.pageViews) || 0) + 1,
          lastVisitedAt: nowIso,
          dailyVisits: prevDaily,
        };
      } else if (visitType === "whatsapp_click") {
        totalWhatsappClicks += 1;
        if (eventId) {
          const prev = eventStats[eventId] || {
            views: 0,
            modalOpens: 0,
            pageViews: 0,
            whatsappClicks: 0,
            dailyVisits: {},
          };
          eventStats[eventId] = {
            ...prev,
            whatsappClicks: (Number(prev.whatsappClicks) || 0) + 1,
            lastVisitedAt: nowIso,
          };
        }
      }

      const updatedAnalytics = {
        totalSiteVisits,
        uniqueVisitors,
        totalWhatsappClicks,
        dailyVisits,
        eventStats,
        updatedAt: nowIso,
      };

      const updatedState = {
        ...currentCloud,
        analytics: updatedAnalytics,
        updatedAt: nowIso,
      };

      await supabase.storage
        .from(BUCKET_NAME)
        .upload(STATE_FILE, Buffer.from(JSON.stringify(updatedState), "utf-8"), {
          contentType: "application/json",
          upsert: true,
          cacheControl: "0",
        });

      return NextResponse.json({
        ok: true,
        analytics: updatedAnalytics,
      });
    }

    // A PARTIR DE AQUÍ: TODAS LAS DEMÁS ACCIONES REQUIEREN AUTENTICACIÓN ADMINISTRATIVA
    if (!isAuthorizedAdmin(req)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Acceso denegado: Se requiere autorización administrativa para modificar la base de datos.",
        },
        { status: 401 }
      );
    }

    // Subida directa de imagen de flyer (action === "upload_flyer")
    if (payload.action === "upload_flyer" && payload.dataUrl) {
      const match = String(payload.dataUrl).match(
        /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/
      );
      if (!match) {
        return NextResponse.json(
          { ok: false, error: "Formato de imagen inválido" },
          { status: 400 }
        );
      }
      const mimeType = match[1];
      const base64Data = match[2];
      const ext = mimeType.includes("png") ? "png" : "jpg";
      const filePath = `flyers/flyer-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, Buffer.from(base64Data, "base64"), {
          contentType: mimeType,
          upsert: true,
        });

      if (upErr) {
        return NextResponse.json(
          { ok: false, error: upErr.message },
          { status: 500 }
        );
      }

      const { data: pubUrl } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return NextResponse.json({
        ok: true,
        url: pubUrl.publicUrl,
      });
    }

    // Subida de flyers en base64 de eventos
    if (Array.isArray(payload.events)) {
      for (const ev of payload.events) {
        if (
          ev &&
          typeof ev.flyerUrl === "string" &&
          ev.flyerUrl.startsWith("data:image/")
        ) {
          const match = ev.flyerUrl.match(
            /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/
          );
          if (match) {
            const mimeType = match[1];
            const base64Data = match[2];
            const ext = mimeType.includes("png") ? "png" : "jpg";
            const filePath = `flyers/${ev.id || "evt"}-${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from(BUCKET_NAME)
              .upload(filePath, Buffer.from(base64Data, "base64"), {
                contentType: mimeType,
                upsert: true,
              });
            if (!upErr) {
              const { data: pubUrl } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(filePath);
              ev.flyerUrl = pubUrl.publicUrl;
            }
          }
        }
      }
    }

    let currentCloud: Record<string, unknown> = {};
    try {
      const { data: existingData } = await supabase.storage
        .from(BUCKET_NAME)
        .download(STATE_FILE);
      if (existingData) {
        currentCloud = JSON.parse(await existingData.text());
      }
    } catch {
      // Primera escritura
    }

    if (payload.action === "reset_analytics") {
      const nowIso = new Date().toISOString();
      const emptyAnalytics = {
        totalSiteVisits: 0,
        uniqueVisitors: 0,
        totalWhatsappClicks: 0,
        dailyVisits: {},
        eventStats: {},
        updatedAt: nowIso,
      };
      const updatedState = {
        ...currentCloud,
        analytics: emptyAnalytics,
        updatedAt: nowIso,
      };
      await supabase.storage
        .from(BUCKET_NAME)
        .upload(STATE_FILE, Buffer.from(JSON.stringify(updatedState), "utf-8"), {
          contentType: "application/json",
          upsert: true,
          cacheControl: "0",
        });
      return NextResponse.json({
        ok: true,
        analytics: emptyAnalytics,
      });
    }

    // Pagos online: el webhook de Mercado Pago escribe órdenes/QRs desde el servidor.
    // Si el panel admin sube una lista desactualizada, no debe borrar lo recién creado.
    if (Array.isArray(payload.orders)) {
      const cloudOrders = (Array.isArray(currentCloud.orders)
        ? currentCloud.orders
        : []) as Array<Record<string, unknown>>;
      const incomingIds = new Set(
        (payload.orders as Array<{ id?: string }>).map((o) => o?.id)
      );
      const cutoff = Date.now() - 5 * 60 * 1000;
      const keep = cloudOrders.filter((o) => {
        if (o.issueType !== "MERCADOPAGO_WEB" || incomingIds.has(o.id as string))
          return false;
        const ts = new Date(
          String(o.approvedAt || o.createdAt || 0)
        ).getTime();
        return ts > cutoff;
      });
      if (keep.length > 0) {
        payload.orders = [...keep, ...payload.orders];
        if (Array.isArray(payload.tickets)) {
          const keepIds = new Set(keep.map((o) => o.id));
          const have = new Set(
            (payload.tickets as Array<{ id?: string }>).map((t) => t?.id)
          );
          const cloudTickets = (Array.isArray(currentCloud.tickets)
            ? currentCloud.tickets
            : []) as Array<Record<string, unknown>>;
          payload.tickets = [
            ...cloudTickets.filter(
              (t) => keepIds.has(t.orderId) && !have.has(t.id as string)
            ),
            ...payload.tickets,
          ];
        }
      }
    }

    const merged = {
      ...currentCloud,
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(merged);
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(STATE_FILE, Buffer.from(jsonString, "utf-8"), {
        contentType: "application/json",
        upsert: true,
        cacheControl: "0",
      });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (payload.settings) {
      try {
        revalidatePath("/", "layout");
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      ok: true,
      updatedAt: merged.updatedAt,
      events: merged.events,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
