import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  BUCKET_NAME,
  STATE_BUCKET,
  STATE_FILE,
  getAdminSupabase,
  readCloudState,
} from "@/lib/cloudState.server";
import { getArgentinaDateKey } from "@/lib/dateUtils";
import {
  AdminIdentity,
  clientIp,
  getAdminFromRequest,
  hasPermission,
  hashPassword,
  isHashed,
  isSuperIdentity,
  rateLimited,
  KNOWN_DEFAULT_PASSWORDS,
} from "@/lib/adminAuth.server";
import { mutateState } from "@/lib/mercadopago.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Tamaño máximo aceptado para una imagen en base64 (≈5 MB decodificados). */
const MAX_IMAGE_DATAURL_CHARS = 7_000_000;

/** Devuelve true si el data URL de imagen supera el tamaño permitido. */
function imageTooLarge(dataUrl: string): boolean {
  return dataUrl.length > MAX_IMAGE_DATAURL_CHARS;
}

/** Filtra el estado para visitas públicas: oculta contraseñas, tickets, órdenes y API keys */
function getSanitizedPublicState(raw: Record<string, unknown>) {
  const rawSettings = (raw.settings || {}) as Record<string, unknown>;
  const rawAnalytics = (raw.analytics || {}) as Record<string, unknown>;
  const rawEvents = Array.isArray(raw.events) ? raw.events : [];
  const rawInquiries = Array.isArray(raw.inquiries) ? raw.inquiries : [];

  return {
    // Se quitan datos internos: usuario creador, cuenta de cobro y datos personales de reservas
    events: rawEvents.map((ev: Record<string, unknown>) => {
      const {
        createdByUsername: _u,
        paymentAccountId: _p,
        platformFeePercent: _f,
        ...rest
      } = ev;
      void _u;
      void _p;
      void _f;
      const venueMap = rest.venueMap as
        | { spots?: Array<Record<string, unknown>> }
        | undefined;
      if (venueMap && Array.isArray(venueMap.spots)) {
        return {
          ...rest,
          venueMap: {
            ...venueMap,
            spots: venueMap.spots.map((s) => {
              const { reservedByName: _n, reservedByOrderCode: _o, ...spot } = s;
              void _n;
              void _o;
              return spot;
            }),
          },
        };
      }
      return rest;
    }),
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
    // Solo FAQs marcadas como públicas, sin email ni teléfono de quien preguntó
    inquiries: rawInquiries
      .filter((inq: { isPublic?: boolean }) => Boolean(inq && inq.isPublic))
      .map((inq: Record<string, unknown>) => {
        const { email: _e, phone: _p, ...rest } = inq;
        void _e;
        void _p;
        return rest;
      }),
    updatedAt: raw.updatedAt,
  };
}

/** Estado para operadores: nunca se envían hashes/contraseñas; los secretos solo al SUPERADMIN. */
async function getAdminState(raw: Record<string, unknown>, admin: AdminIdentity) {
  const out: Record<string, unknown> = { ...raw };
  if (Array.isArray(raw.adminUsers)) {
    out.adminUsers = (raw.adminUsers as Array<Record<string, unknown>>).map((u) => ({
      ...u,
      password: "",
    }));
  }
  if (!isSuperIdentity(admin) && raw.settings) {
    const s = { ...(raw.settings as Record<string, unknown>) };
    delete s.smtpPass;
    delete s.resendApiKey;
    delete s.adminPin;
    out.settings = s;
  }
  // Datos personales y códigos QR: se envían si el rol puede ver órdenes/tickets o usar el lector QR.
  const canScanner = await hasPermission(admin, "canUseScanner");
  if (!(await hasPermission(admin, "canViewOrders")) && !canScanner) delete out.orders;
  if (!(await hasPermission(admin, "canViewTickets")) && !canScanner) delete out.tickets;
  return out;
}
export async function GET(req: Request) {
  try {
    const parsed = await readCloudState();
    const noStore = {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    };

    if (!parsed) {
      return NextResponse.json({ exists: false, state: null }, { headers: noStore });
    }

    const admin = await getAdminFromRequest(req);

    // Visitas públicas: solo datos públicos, sin credenciales ni QRs ajenos
    const stateToSend = admin
      ? await getAdminState(parsed, admin)
      : getSanitizedPublicState(parsed);

    return NextResponse.json(
      { exists: true, state: stateToSend, isAdmin: Boolean(admin) },
      { headers: noStore }
    );
  } catch (err) {
    console.error("[cloud-store] GET:", err);
    return NextResponse.json({ exists: false, error: "Error interno" }, { status: 500 });
  }
}

type EventLike = Record<string, unknown> & { id?: string };

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const supabase = getAdminSupabase();

    // ACCIÓN PÚBLICA PERMITIDA: Conteo de visitas y clics anónimos
    if (payload.action === "track_visit") {
      if (rateLimited(`visit:${clientIp(req)}`, 120, 60 * 1000)) {
        return NextResponse.json({ ok: false }, { status: 429 });
      }

      const nowIso = new Date().toISOString();
      const todayKey =
        typeof payload.todayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.todayKey)
          ? payload.todayKey
          : getArgentinaDateKey();
      const visitType = String(payload.type || "site");
      const eventId = payload.eventId ? String(payload.eventId).slice(0, 80) : "";

      const analytics = await mutateState((state) => {
        const rawAnalytics = (state.analytics || {}) as Record<string, unknown>;
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

        // Solo se cuentan eventos que existen (evita inflar el archivo con ids arbitrarios)
        const knownEvent =
          eventId &&
          Array.isArray(state.events) &&
          (state.events as EventLike[]).some((e) => e.id === eventId);
        const blank = () => ({
          views: 0,
          modalOpens: 0,
          pageViews: 0,
          whatsappClicks: 0,
          dailyVisits: {} as Record<string, number>,
        });

        if (payload.isNewVisitor) uniqueVisitors += 1;

        if (visitType === "site") {
          totalSiteVisits += 1;
          dailyVisits[todayKey] = (dailyVisits[todayKey] || 0) + 1;
        } else if (visitType === "event_modal" && knownEvent) {
          const prev = eventStats[eventId] || blank();
          const prevDaily = { ...(prev.dailyVisits || {}) };
          prevDaily[todayKey] = (prevDaily[todayKey] || 0) + 1;
          eventStats[eventId] = {
            ...prev,
            views: (Number(prev.views) || 0) + 1,
            modalOpens: (Number(prev.modalOpens) || 0) + 1,
            lastVisitedAt: nowIso,
            dailyVisits: prevDaily,
          };
        } else if (visitType === "event_page" && knownEvent) {
          totalSiteVisits += 1;
          dailyVisits[todayKey] = (dailyVisits[todayKey] || 0) + 1;
          const prev = eventStats[eventId] || blank();
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
          if (knownEvent) {
            const prev = eventStats[eventId] || blank();
            eventStats[eventId] = {
              ...prev,
              whatsappClicks: (Number(prev.whatsappClicks) || 0) + 1,
              lastVisitedAt: nowIso,
            };
          }
        }

        const updated = {
          totalSiteVisits,
          uniqueVisitors,
          totalWhatsappClicks,
          dailyVisits,
          eventStats,
          updatedAt: nowIso,
        };
        state.analytics = updated;
        return updated;
      });

      return NextResponse.json({ ok: true, analytics });
    }

    // A PARTIR DE AQUÍ: TODAS LAS DEMÁS ACCIONES REQUIEREN SESIÓN DE OPERADOR
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Acceso denegado: Se requiere iniciar sesión como operador para modificar la base de datos.",
        },
        { status: 401 }
      );
    }
    const isSuper = isSuperIdentity(admin);

    // Subida directa de imagen de flyer (action === "upload_flyer")
    if (payload.action === "upload_flyer" && payload.dataUrl) {
      if (!(await hasPermission(admin, "canManageEvents"))) {
        return NextResponse.json({ ok: false, error: "Sin permiso" }, { status: 403 });
      }
      if (imageTooLarge(String(payload.dataUrl))) {
        return NextResponse.json(
          { ok: false, error: "La imagen supera el tamaño máximo permitido (5 MB)." },
          { status: 413 }
        );
      }
      const match = String(payload.dataUrl).match(
        /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/
      );
      if (!match) {
        return NextResponse.json(
          { ok: false, error: "Formato de imagen inválido (solo PNG, JPG, WEBP o GIF)" },
          { status: 400 }
        );
      }
      const mimeType = match[1];
      const base64Data = match[2];
      const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : mimeType.includes("gif") ? "gif" : "jpg";
      const filePath = `flyers/flyer-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, Buffer.from(base64Data, "base64"), {
          contentType: mimeType,
          upsert: true,
        });

      if (upErr) {
        return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
      }

      const { data: pubUrl } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      return NextResponse.json({ ok: true, url: pubUrl.publicUrl });
    }

    // Subida de flyers en base64 de eventos
    if (Array.isArray(payload.events)) {
      for (const ev of payload.events) {
        if (ev && typeof ev.flyerUrl === "string" && ev.flyerUrl.startsWith("data:image/")) {
          if (imageTooLarge(ev.flyerUrl)) {
            ev.flyerUrl = ""; // Imagen demasiado grande: se descarta
            continue;
          }
          const match = ev.flyerUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const base64Data = match[2];
            const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : mimeType.includes("gif") ? "gif" : "jpg";
            const filePath = `flyers/${String(ev.id || "evt").replace(/[^a-zA-Z0-9_-]/g, "")}-${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from(BUCKET_NAME)
              .upload(filePath, Buffer.from(base64Data, "base64"), {
                contentType: mimeType,
                upsert: true,
              });
            if (!upErr) {
              const { data: pubUrl } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
              ev.flyerUrl = pubUrl.publicUrl;
            }
          } else {
            ev.flyerUrl = ""; // data: URL no permitida (p. ej. SVG con scripts)
          }
        }
      }
    }

    if (payload.action === "reset_analytics") {
      if (!(await hasPermission(admin, "canViewAnalytics"))) {
        return NextResponse.json({ ok: false, error: "Sin permiso" }, { status: 403 });
      }
      const emptyAnalytics = {
        totalSiteVisits: 0,
        uniqueVisitors: 0,
        totalWhatsappClicks: 0,
        dailyVisits: {},
        eventStats: {},
        updatedAt: new Date().toISOString(),
      };
      await mutateState((state) => {
        state.analytics = emptyAnalytics;
      });
      return NextResponse.json({ ok: true, analytics: emptyAnalytics });
    }

    if (payload.action === "delete_order" && payload.orderId) {
      if (!(await hasPermission(admin, "canApproveOrders"))) {
        return NextResponse.json({ ok: false, error: "Sin permiso para eliminar órdenes" }, { status: 403 });
      }
      const targetId = String(payload.orderId).trim();
      await mutateState((state) => {
        const orders = ((state.orders as Array<{ id?: string; orderCode?: string }>) || []).filter(
          (o) => o.id !== targetId && o.orderCode !== targetId
        );
        const tickets = ((state.tickets as Array<{ orderId?: string; orderCode?: string }>) || []).filter(
          (t) => t.orderId !== targetId && t.orderCode !== targetId
        );
        state.orders = orders;
        state.tickets = tickets;
        return true;
      });
      return NextResponse.json({ ok: true });
    }

    if (payload.action === "scan_ticket" && payload.code) {
      const canScan =
        isSuper ||
        (await hasPermission(admin, "canUseScanner")) ||
        (await hasPermission(admin, "canViewTickets"));
      if (!canScan) {
        return NextResponse.json(
          { ok: false, error: "Sin permiso para validar entradas" },
          { status: 403 }
        );
      }

      const rawInput = String(payload.code || "").trim();
      const clean = rawInput.toUpperCase();
      const operatorName = String(
        payload.operatorName || admin.fullName || "Control Puerta"
      ).trim();
      const operatorUsername = String(
        payload.operatorUsername || admin.username || ""
      ).trim();
      const doorName = String(payload.doorName || "Puerta Principal").trim();

      const scanPayload = await mutateState((state) => {
        const tickets = (Array.isArray(state.tickets)
          ? state.tickets
          : []) as Array<Record<string, unknown>>;
        const orders = (Array.isArray(state.orders)
          ? state.orders
          : []) as Array<Record<string, unknown>>;

        const matchIdx = tickets.findIndex((t) => {
          const qrUpper = String(t.qrCode || "").trim().toUpperCase();
          const shortUpper = String(t.shortCode || "").trim().toUpperCase();
          const idUpper = String(t.id || "").trim().toUpperCase();
          const qrParts = qrUpper.split("|").map((p) => p.trim());
          return (
            qrUpper === clean ||
            shortUpper === clean ||
            idUpper === clean ||
            (clean.length >= 4 && qrParts.includes(clean)) ||
            (qrUpper.length > 0 && clean.includes(qrUpper))
          );
        });

        if (matchIdx === -1) {
          const pendingOrder = orders.find(
            (o) =>
              String(o.orderCode || "").trim().toUpperCase() === clean ||
              `MAS30-${clean}` === String(o.orderCode || "").trim().toUpperCase()
          );
          if (pendingOrder && pendingOrder.status === "PENDIENTE") {
            return {
              result: {
                outcome: "NO_ENCONTRADO",
                message: `La orden ${pendingOrder.orderCode} (${pendingOrder.buyerName}) aún figura PENDIENTE DE APROBACIÓN.`,
              },
              tickets,
            };
          }
          return {
            result: {
              outcome: "NO_ENCONTRADO",
              message: "Código inválido o inexistente para el evento.",
            },
            tickets,
          };
        }

        const match = tickets[matchIdx];
        const status = String(match.status || "VALIDO").toUpperCase();

        if (status === "ANULADO" || status === "BLOQUEADO") {
          return {
            result: {
              outcome: "ANULADO",
              message:
                status === "BLOQUEADO"
                  ? "Entrada bloqueada por la administración."
                  : "Entrada anulada por la administración.",
              ticket: match,
            },
            tickets,
          };
        }

        if (status === "USADO") {
          return {
            result: {
              outcome: "YA_USADO",
              message: "Este código ya fue registrado anteriormente.",
              ticket: match,
              previousScannedAt: match.scannedAt,
            },
            tickets,
          };
        }

        const nowIso = new Date().toISOString();
        const updatedTicket = {
          ...match,
          status: "USADO",
          scannedAt: nowIso,
          scannedBy: operatorName,
          scannedByName: operatorName,
          scannedByUsername: operatorUsername,
          scannedDoor: doorName,
        };

        const nextTickets = tickets.map((t, idx) =>
          idx === matchIdx ? updatedTicket : t
        );
        state.tickets = nextTickets;

        return {
          result: {
            outcome: "AUTORIZADO",
            message: "Acceso validado correctamente.",
            ticket: updatedTicket,
          },
          tickets: nextTickets,
        };
      });

      return NextResponse.json({
        ok: true,
        result: scanPayload?.result,
        tickets: scanPayload?.tickets,
      });
    }

    // Solo se aceptan claves conocidas del estado
    const ALLOWED = [
      "events",
      "orders",
      "tickets",
      "inquiries",
      "settings",
      "adminUsers",
      "adminRoles",
      "analytics",
    ];
    const incoming: Record<string, unknown> = {};
    for (const k of ALLOWED) if (k in payload) incoming[k] = payload[k];

    let errorMsg = "";
    const result = await mutateState(async (currentCloud) => {
      // --- Claves de usuarios y roles ---
      const canManageUsers = isSuper || (await hasPermission(admin, "canManageUsers"));
      if (!canManageUsers) {
        delete incoming.adminUsers;
      }
      if (!isSuper) {
        delete incoming.adminRoles;
      }
      if (!(await hasPermission(admin, "canManageSettings"))) {
        delete incoming.settings;
      }

      // --- Usuarios: nunca se guardan contraseñas en texto plano ---
      if (Array.isArray(incoming.adminUsers)) {
        const existing = (Array.isArray(currentCloud.adminUsers)
          ? currentCloud.adminUsers
          : []) as Array<{ id: string; username?: string; role?: string; password?: string; active?: boolean }>;
        const users = incoming.adminUsers as Array<{
          id: string;
          username?: string;
          fullName?: string;
          role?: string;
          password?: string;
          active?: boolean;
        }>;

        // Si no es superadmin, no permitir modificar o borrar SUPERADMINs ni crear nuevos SUPERADMINs
        if (!isSuper) {
          const superAdmins = existing.filter((e) => e.role === "SUPERADMIN");
          for (const sa of superAdmins) {
            const match = users.find(
              (u) =>
                u.id === sa.id ||
                (typeof u.username === "string" &&
                  typeof sa.username === "string" &&
                  u.username.toLowerCase() === sa.username.toLowerCase())
            );
            if (!match || match.role !== "SUPERADMIN" || match.active === false) {
              errorMsg = "Solo un Superadministrador puede modificar o eliminar usuarios Superadmin.";
              return null;
            }
          }
          for (const u of users) {
            const prev = existing.find(
              (e) =>
                e.id === u.id ||
                (typeof e.username === "string" &&
                  typeof u.username === "string" &&
                  e.username.toLowerCase() === u.username.toLowerCase())
            );
            if (u.role === "SUPERADMIN" && (!prev || prev.role !== "SUPERADMIN")) {
              errorMsg = "Solo un Superadministrador puede asignar el rol SUPERADMIN.";
              return null;
            }
          }
        }

        for (const u of users) {
          const prev = existing.find(
            (e) =>
              e.id === u.id ||
              (typeof e.username === "string" &&
                typeof u.username === "string" &&
                e.username.trim().toLowerCase() === u.username.trim().toLowerCase())
          );
          if (prev && u.id !== prev.id) {
            u.id = prev.id;
          }
          const pw = String(u.password || "");
          if (!pw) {
            if (prev?.password) {
              u.password = prev.password; // vacío = conservar contraseña previa
            } else {
              errorMsg = `El usuario "${u.fullName || u.username}" necesita una contraseña.`;
              return null;
            }
          } else if (!isHashed(pw)) {
            if (pw.length < 8 || KNOWN_DEFAULT_PASSWORDS.has(pw.toLowerCase())) {
              errorMsg = `La contraseña de "${u.fullName || u.username}" debe tener al menos 8 caracteres y no ser una contraseña por defecto.`;
              return null;
            }
            u.password = hashPassword(pw);
          } else if (!prev || prev.password !== pw) {
            // Un hash enviado desde el navegador que no coincide con el guardado: se rechaza
            u.password = prev?.password || "";
            if (!u.password) {
              errorMsg = "Contraseña inválida.";
              return null;
            }
          }
        }
        // No permitir quedarse sin ningún SUPERADMIN activo
        if (!users.some((u) => u.role === "SUPERADMIN" && u.active !== false)) {
          errorMsg = "Debe existir al menos un usuario SUPERADMIN activo.";
          return null;
        }
      }

      // --- Dinero: solo el SUPERADMIN puede cambiar cuenta destino y comisión ---
      if (Array.isArray(incoming.events) && !isSuper) {
        const prevEvents = (Array.isArray(currentCloud.events)
          ? currentCloud.events
          : []) as EventLike[];
        incoming.events = (incoming.events as EventLike[]).map((ev) => {
          const prev = prevEvents.find((p) => p.id === ev.id);
          return {
            ...ev,
            paymentAccountId: prev?.paymentAccountId,
            platformFeePercent: prev?.platformFeePercent,
          };
        });
      }

      // Pagos online y reservas por transferencia registradas en el servidor:
      // Si el panel admin sube una lista desactualizada desde el navegador,
      // NUNCA debemos borrar órdenes ni tickets existentes en la nube
      // (a menos que hayan sido eliminados explícitamente con action: "delete_order").
      if (Array.isArray(incoming.orders)) {
        const cloudOrders = (Array.isArray(currentCloud.orders)
          ? currentCloud.orders
          : []) as Array<Record<string, unknown>>;
        const incomingIds = new Set(
          (incoming.orders as Array<{ id?: string }>).map((o) => o?.id)
        );
        const keep = cloudOrders.filter((o) => !incomingIds.has(o.id as string));
        if (keep.length > 0) {
          incoming.orders = [...(incoming.orders as unknown[]), ...keep];
        }
      }
      if (Array.isArray(incoming.tickets)) {
        const have = new Set(
          (incoming.tickets as Array<{ id?: string }>).map((t) => t?.id)
        );
        const cloudTickets = (Array.isArray(currentCloud.tickets)
          ? currentCloud.tickets
          : []) as Array<Record<string, unknown>>;
        const keepTickets = cloudTickets.filter((t) => !have.has(t.id as string));
        if (keepTickets.length > 0) {
          incoming.tickets = [...(incoming.tickets as unknown[]), ...keepTickets];
        }
      }

      Object.assign(currentCloud, incoming);
      return currentCloud.events;
    });

    if (errorMsg) {
      return NextResponse.json({ ok: false, error: errorMsg }, { status: 400 });
    }

    if (incoming.settings) {
      try {
        revalidatePath("/", "layout");
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      ok: true,
      updatedAt: new Date().toISOString(),
      events: result,
    });
  } catch (err) {
    console.error("[cloud-store] POST:", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

