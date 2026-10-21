import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  BUCKET_NAME,
  STATE_FILE,
  getAdminSupabase,
} from "@/lib/cloudState.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
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
    const parsed = JSON.parse(text);
    return NextResponse.json(
      { exists: true, state: parsed },
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

    // Si es una subida directa de imagen de flyer (action === "upload_flyer")
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

    // Si algún evento en payload.events tiene una imagen base64, la subimos a Storage y guardamos la URL pública
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

    // Acción ligera para registrar visitas a la web y por evento sin pisar datos del admin
    if (payload.action === "track_visit") {
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
          }
        >) || {}),
      };

      let totalSiteVisits = Number(rawAnalytics.totalSiteVisits) || 0;
      let uniqueVisitors = Number(rawAnalytics.uniqueVisitors) || 0;
      let totalWhatsappClicks = Number(rawAnalytics.totalWhatsappClicks) || 0;

      const nowIso = new Date().toISOString();
      const todayKey = nowIso.slice(0, 10);
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
        };
        eventStats[eventId] = {
          ...prev,
          views: (Number(prev.views) || 0) + 1,
          modalOpens: (Number(prev.modalOpens) || 0) + 1,
          lastVisitedAt: nowIso,
        };
      } else if (visitType === "event_page" && eventId) {
        totalSiteVisits += 1;
        dailyVisits[todayKey] = (dailyVisits[todayKey] || 0) + 1;
        const prev = eventStats[eventId] || {
          views: 0,
          modalOpens: 0,
          pageViews: 0,
          whatsappClicks: 0,
        };
        eventStats[eventId] = {
          ...prev,
          views: (Number(prev.views) || 0) + 1,
          pageViews: (Number(prev.pageViews) || 0) + 1,
          lastVisitedAt: nowIso,
        };
      } else if (visitType === "whatsapp_click") {
        totalWhatsappClicks += 1;
        if (eventId) {
          const prev = eventStats[eventId] || {
            views: 0,
            modalOpens: 0,
            pageViews: 0,
            whatsappClicks: 0,
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

    // Si cambió la configuración (incluye vista previa al compartir), refresca los metadatos
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
