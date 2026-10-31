import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://hpbwcewuekxfqlofwpzu.supabase.co";

// Clave secreta obtenida exclusivamente de variables de entorno del servidor (nunca hardcodeada en código fuente)
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

/** Bucket PÚBLICO: solo para imágenes (flyers). Nunca guardar datos de usuarios acá. */
export const BUCKET_NAME = "mas30-cloud-db";
/** Bucket PRIVADO: estado completo (órdenes, tickets, usuarios, settings) y secretos. */
export const STATE_BUCKET = "mas30-private";
export const STATE_FILE = "mas30-state-v1.json";
export const ANALYTICS_FILE = "mas30-analytics-v1.json";

let analyticsLock: Promise<unknown> = Promise.resolve();

/** Modifica exclusivamente las analíticas sin tocar ni arriesgar el archivo principal de órdenes. */
export function mutateAnalytics<T>(
  fn: (analytics: Record<string, unknown>) => T | Promise<T>
): Promise<T> {
  const run = analyticsLock.then(async () => {
    const supabase = getAdminSupabase();
    await ensurePrivateState();
    let current: Record<string, unknown> = {};
    try {
      const { data } = await supabase.storage.from(STATE_BUCKET).download(ANALYTICS_FILE);
      if (data) {
        current = JSON.parse(await data.text());
      }
    } catch {
      // Si aún no existe el archivo de analíticas, se crea vacío
    }
    const result = await fn(current);
    if (result === null || result === undefined) return result;
    current.updatedAt = new Date().toISOString();
    await supabase.storage.from(STATE_BUCKET).upload(
      ANALYTICS_FILE,
      Buffer.from(JSON.stringify(current), "utf-8"),
      {
        contentType: "application/json",
        upsert: true,
        cacheControl: "0",
      }
    );
    return result;
  });
  analyticsLock = run.catch(() => {});
  return run;
}

// Secreto del servidor para firmar sesiones y autorizar llamadas internas.
// Sin valor por defecto: si falta, se genera uno aleatorio por proceso (las sesiones no sobreviven reinicios).
export const ADMIN_API_SECRET: string =
  process.env.ADMIN_API_SECRET ||
  process.env.SUPABASE_SECRET_KEY ||
  (() => {
    console.error(
      "[Seguridad] ADMIN_API_SECRET no configurado: usando secreto efímero. Configuralo en el entorno."
    );
    return crypto.randomBytes(32).toString("hex");
  })();

export function getAdminSupabase() {
  if (!SUPABASE_SERVICE_KEY) {
    console.warn(
      "[CloudState] Advertencia: SUPABASE_SECRET_KEY no configurada en variables de entorno."
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, init) =>
        fetch(url, {
          ...init,
          cache: "no-store",
        }),
    },
  });
}

let privateBucketReady = false;

/** Crea el bucket privado si no existe y migra el estado desde el bucket público (una sola vez). */
export async function ensurePrivateState(): Promise<void> {
  if (privateBucketReady) return;
  const supabase = getAdminSupabase();
  await supabase.storage
    .createBucket(STATE_BUCKET, { public: false })
    .catch(() => {});
  // Si existía como público, forzar privado
  await supabase.storage
    .updateBucket(STATE_BUCKET, { public: false })
    .catch(() => {});

  const priv = await supabase.storage.from(STATE_BUCKET).download(STATE_FILE);
  if (priv.error || !priv.data) {
    // Migración: copiar el estado viejo del bucket público al privado
    const legacy = await supabase.storage.from(BUCKET_NAME).download(STATE_FILE);
    if (legacy.data) {
      const text = await legacy.data.text();
      await supabase.storage
        .from(STATE_BUCKET)
        .upload(STATE_FILE, Buffer.from(text, "utf-8"), {
          contentType: "application/json",
          upsert: true,
          cacheControl: "0",
        });
    }
  }
  // Borrar SIEMPRE la copia pública (datos personales y credenciales)
  await supabase.storage
    .from(BUCKET_NAME)
    .remove([STATE_FILE])
    .catch(() => {});
  privateBucketReady = true;
}

/** Lee el estado global (eventos, settings, etc.) guardado en Supabase Storage (bucket privado). */
export async function readCloudState(): Promise<Record<string, unknown> | null> {
  try {
    await ensurePrivateState();
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .storage.from(STATE_BUCKET)
      .download(STATE_FILE);
    if (error || !data) return null;
    const state: Record<string, unknown> = JSON.parse(await data.text());

    // Fusión de seguridad con la tabla PostgreSQL orders (protección contra cualquier sobreescritura accidental)
    try {
      const { data: dbOrders } = await supabase.from("orders").select("*");
      if (Array.isArray(dbOrders) && dbOrders.length > 0) {
        const fileOrders = (Array.isArray(state.orders) ? state.orders : []) as Array<Record<string, unknown>>;
        const fileMap = new Map<string, Record<string, unknown>>();
        for (const o of fileOrders) {
          const code = String(o.orderCode || "").trim().toUpperCase();
          if (code) fileMap.set(code, o);
        }

        let mergedAny = false;
        for (const row of dbOrders) {
          const code = String(row.order_code || "").trim().toUpperCase();
          if (!code) continue;
          if (!fileMap.has(code)) {
            const restoredOrder = {
              id: row.id,
              orderCode: row.order_code,
              eventId: row.event_id,
              eventTitle: row.event_title,
              eventDateLabel: row.event_date,
              eventVenue: row.event_venue,
              buyerName: row.buyer_name,
              buyerDni: row.buyer_dni || "",
              buyerEmail: row.buyer_email || "",
              buyerPhone: row.buyer_phone || "",
              tierId: row.tier_id || "",
              tierName: row.tier_name || "",
              unitPrice: Number(row.unit_price) || 0,
              quantity: Number(row.quantity) || 1,
              totalQrCount: Number(row.quantity) || 1,
              totalAmount: Number(row.total_amount) || 0,
              transferSender: row.transfer_sender || "",
              transferReference: row.transfer_reference || "",
              notes: row.notes || "",
              status: row.status || "PENDIENTE",
              approvedAt: row.approved_at || undefined,
              approvedByUsername: row.approved_by_username || undefined,
              approvedByName: row.approved_by_name || undefined,
              createdAt: row.created_at || new Date().toISOString(),
            };
            fileOrders.unshift(restoredOrder);
            fileMap.set(code, restoredOrder);
            mergedAny = true;
          }
        }
        if (mergedAny) {
          state.orders = fileOrders;
        }
      }
    } catch {
      // Ignorar fallback si la tabla no responde temporalmente
    }

    // Fusión de analíticas independientes (sin arriesgar el archivo principal de órdenes)
    try {
      const { data: anData } = await supabase
        .storage.from(STATE_BUCKET)
        .download(ANALYTICS_FILE);
      if (anData) {
        const customAnalytics = JSON.parse(await anData.text());
        if (customAnalytics && typeof customAnalytics === "object") {
          state.analytics = {
            ...((state.analytics as Record<string, unknown>) || {}),
            ...customAnalytics,
          };
        }
      }
    } catch {
      // ignore
    }

    return state;
  } catch {
    return null;
  }
}
