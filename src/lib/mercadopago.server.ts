import crypto from "crypto";
import {
  STATE_BUCKET,
  STATE_FILE,
  ADMIN_API_SECRET,
  getAdminSupabase,
  readCloudState,
} from "@/lib/cloudState.server";
import type {
  EventItem,
  OrderItem,
  PaymentAccountPublic,
  TicketQR,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Configuración                                                       */
/* ------------------------------------------------------------------ */

export const MP_CLIENT_ID = process.env.MP_CLIENT_ID || "";
export const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET || "";
export const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || "";
const MP_API = "https://api.mercadopago.com";
const MP_AUTH = "https://auth.mercadopago.com.ar/authorization";

/** Minutos que se reserva un cupo/mesa esperando el pago. */
export const RESERVATION_MINUTES = 30;

/** URL pública base del sitio (sin barra final). */
export function getSiteUrl(req?: Request): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (env) return env;
  if (req) return new URL(req.url).origin;
  return "https://mastreinta.vercel.app";
}

export function isMpConfigured(): boolean {
  return Boolean(MP_CLIENT_ID && MP_CLIENT_SECRET);
}

/* ------------------------------------------------------------------ */
/* Almacenamiento PRIVADO de cuentas (tokens nunca salen del servidor)  */
/* ------------------------------------------------------------------ */

const PRIVATE_BUCKET = STATE_BUCKET;
const ACCOUNTS_FILE = "payment-accounts-v1.json";

export interface PaymentAccountSecret extends PaymentAccountPublic {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string; // ISO
}

async function readAccounts(): Promise<PaymentAccountSecret[]> {
  try {
    const { data, error } = await getAdminSupabase()
      .storage.from(PRIVATE_BUCKET)
      .download(ACCOUNTS_FILE);
    if (error || !data) return [];
    const parsed = JSON.parse(await data.text());
    return Array.isArray(parsed.accounts) ? parsed.accounts : [];
  } catch {
    return [];
  }
}

async function writeAccounts(accounts: PaymentAccountSecret[]) {
  const supabase = getAdminSupabase();
  await supabase.storage
    .createBucket(PRIVATE_BUCKET, { public: false })
    .catch(() => {});
  const { error } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .upload(
      ACCOUNTS_FILE,
      Buffer.from(JSON.stringify({ accounts }), "utf-8"),
      { contentType: "application/json", upsert: true, cacheControl: "0" }
    );
  if (error) throw new Error(error.message);
}

export function toPublicAccount(a: PaymentAccountSecret): PaymentAccountPublic {
  return {
    id: a.id,
    label: a.label,
    mpUserId: a.mpUserId,
    email: a.email,
    connectedAt: a.connectedAt,
  };
}

export async function listPublicAccounts(): Promise<PaymentAccountPublic[]> {
  return (await readAccounts()).map(toPublicAccount);
}

export async function deleteAccount(id: string) {
  const accounts = await readAccounts();
  await writeAccounts(accounts.filter((a) => a.id !== id));
}

/** Devuelve la cuenta con un access_token vigente (renueva si vence pronto). */
export async function getAccountWithFreshToken(
  id: string
): Promise<PaymentAccountSecret | null> {
  const accounts = await readAccounts();
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return null;

  const expiresSoon =
    new Date(acc.tokenExpiresAt).getTime() - Date.now() < 7 * 24 * 3600 * 1000;
  if (!expiresSoon) return acc;

  try {
    const tok = await mpTokenRequest({
      grant_type: "refresh_token",
      refresh_token: acc.refreshToken,
    });
    const updated: PaymentAccountSecret = {
      ...acc,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token || acc.refreshToken,
      tokenExpiresAt: new Date(
        Date.now() + (tok.expires_in || 15552000) * 1000
      ).toISOString(),
    };
    await writeAccounts(accounts.map((a) => (a.id === id ? updated : a)));
    return updated;
  } catch (err) {
    console.error("[MP] No se pudo renovar token de", id, err);
    return acc; // se intenta igual con el token actual
  }
}

/* ------------------------------------------------------------------ */
/* OAuth                                                               */
/* ------------------------------------------------------------------ */

interface MpTokenResponse {
  access_token: string;
  refresh_token: string;
  user_id: number | string;
  expires_in: number;
}

async function mpTokenRequest(
  body: Record<string, string>
): Promise<MpTokenResponse> {
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: MP_CLIENT_ID,
      client_secret: MP_CLIENT_SECRET,
      ...body,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || `OAuth Mercado Pago falló (${res.status})`);
  }
  return json;
}

function signState(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", ADMIN_API_SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

export function verifyState<T>(state: string): T | null {
  const [data, sig] = (state || "").split(".");
  if (!data || !sig) return null;
  const expected = crypto
    .createHmac("sha256", ADMIN_API_SECRET)
    .update(data)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf-8")) as T;
  } catch {
    return null;
  }
}

export function buildAuthorizationUrl(req: Request, label: string): string {
  const state = signState({ label, ts: Date.now() });
  const redirectUri = `${getSiteUrl(req)}/api/mp/callback`;
  const q = new URLSearchParams({
    client_id: MP_CLIENT_ID,
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: redirectUri,
  });
  return `${MP_AUTH}?${q.toString()}`;
}

export async function connectAccountFromCode(
  req: Request,
  code: string,
  label: string
): Promise<PaymentAccountPublic> {
  const tok = await mpTokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: `${getSiteUrl(req)}/api/mp/callback`,
  });

  let email: string | undefined;
  try {
    const me = await fetch(`${MP_API}/users/me`, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    }).then((r) => r.json());
    email = me?.email;
  } catch {
    // opcional
  }

  const accounts = await readAccounts();
  const mpUserId = String(tok.user_id);
  const existing = accounts.find((a) => a.mpUserId === mpUserId);
  const account: PaymentAccountSecret = {
    id: existing?.id || `acc-${crypto.randomBytes(5).toString("hex")}`,
    label: label || existing?.label || email || `Cuenta ${mpUserId}`,
    mpUserId,
    email,
    connectedAt: new Date().toISOString(),
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token,
    tokenExpiresAt: new Date(
      Date.now() + (tok.expires_in || 15552000) * 1000
    ).toISOString(),
  };
  await writeAccounts(
    existing
      ? accounts.map((a) => (a.id === existing.id ? account : a))
      : [...accounts, account]
  );
  return toPublicAccount(account);
}

/* ------------------------------------------------------------------ */
/* API de pagos                                                        */
/* ------------------------------------------------------------------ */

export interface MpPreferenceInput {
  accessToken: string;
  title: string;
  amount: number;
  fee: number;
  externalReference: string;
  accountId: string;
  buyerEmail: string;
  buyerName: string;
  siteUrl: string;
  expiresAt: string;
}

export async function createPreference(input: MpPreferenceInput) {
  const isLocal =
    input.siteUrl.includes("localhost") || input.siteUrl.includes("127.0.0.1");
  const publicBase = isLocal ? "https://mastreinta.vercel.app" : input.siteUrl;

  const back = `${publicBase}/pago/resultado?ref=${encodeURIComponent(
    input.externalReference
  )}&t=${encodeURIComponent(orderAccessToken(input.externalReference))}`;
  const body: Record<string, unknown> = {
    items: [
      {
        id: input.externalReference,
        title: input.title.slice(0, 250),
        quantity: 1,
        unit_price: input.amount,
        currency_id: "ARS",
      },
    ],
    payer: { email: input.buyerEmail, name: input.buyerName },
    external_reference: input.externalReference,
    notification_url: `${publicBase}/api/mp/webhook?acc=${encodeURIComponent(
      input.accountId
    )}`,
    back_urls: { success: back, pending: back, failure: back },
    binary_mode: true, // aprobado o rechazado, sin estados intermedios
    statement_descriptor: "MAS30",
    expires: true,
    expiration_date_to: input.expiresAt,
  };
  if (!isLocal) {
    body.auto_return = "approved";
  }
  if (input.fee > 0) body.marketplace_fee = input.fee;

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || `Mercado Pago rechazó la preferencia (${res.status})`);
  }
  return json as { id: string; init_point: string; sandbox_init_point?: string };
}

export interface MpPayment {
  id: number;
  status: string;
  status_detail?: string;
  transaction_amount: number;
  external_reference?: string;
  payment_type_id?: string;
  payment_method_id?: string;
}

export async function fetchPayment(
  accessToken: string,
  paymentId: string
): Promise<MpPayment | null> {
  const res = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

/** Valida la firma x-signature de las notificaciones (si MP_WEBHOOK_SECRET está definido). */
export function verifyWebhookSignature(req: Request, dataId: string): boolean {
  if (!MP_WEBHOOK_SECRET) return true; // la verificación real la hace fetchPayment()
  const sigHeader = req.headers.get("x-signature") || "";
  const requestId = req.headers.get("x-request-id") || "";
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => p.trim().split("=") as [string, string])
  );
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto
    .createHmac("sha256", MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");
  const a = Buffer.from(parts.v1);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ */
/* Estado global (órdenes / tickets / eventos) con exclusión mutua     */
/* ------------------------------------------------------------------ */

let stateLock: Promise<unknown> = Promise.resolve();

/** Lee-modifica-escribe el estado global serializando escrituras de esta instancia. */
export function mutateState<T>(
  fn: (state: Record<string, unknown>) => T | Promise<T>
): Promise<T> {
  const run = stateLock.then(async () => {
    const state = (await readCloudState()) || {};
    const result = await fn(state);
    state.updatedAt = new Date().toISOString();
    const { error } = await getAdminSupabase()
      .storage.from(STATE_BUCKET)
      .upload(STATE_FILE, Buffer.from(JSON.stringify(state), "utf-8"), {
        contentType: "application/json",
        upsert: true,
        cacheControl: "0",
      });
    if (error) throw new Error(error.message);
    return result;
  });
  stateLock = run.catch(() => {});
  return run;
}

function randomToken(len: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function uniqueOrderCode(orders: OrderItem[]): string {
  const used = new Set(orders.map((o) => o.orderCode));
  let code = "";
  do {
    // 8 caracteres hexadecimales (~4.300 millones de combinaciones) en lugar de 4 dígitos
    code = `MAS30-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  } while (used.has(code));
  return code;
}

export function newOrderId(): string {
  return `ord-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
}

/**
 * Token de acceso a una orden: permite al comprador consultar su orden/QR sin exponerla
 * a quien solo conozca el id. Se incluye en la URL de retorno de Mercado Pago.
 */
export function orderAccessToken(orderId: string): string {
  return crypto
    .createHmac("sha256", ADMIN_API_SECRET)
    .update(`order:${orderId}`)
    .digest("base64url")
    .slice(0, 32);
}

export function verifyOrderAccessToken(orderId: string, token: string): boolean {
  const expected = orderAccessToken(orderId);
  if (!token || token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/** Libera mesas y descarta órdenes MP pendientes que vencieron sin pagarse. */
export function releaseExpiredMpOrders(state: Record<string, unknown>): void {
  const orders = (state.orders as OrderItem[]) || [];
  const now = Date.now();
  const expired = orders.filter(
    (o) =>
      o.issueType === "MERCADOPAGO_WEB" &&
      o.status === "PENDIENTE" &&
      o.expiresAt &&
      new Date(o.expiresAt).getTime() < now
  );
  if (expired.length === 0) return;

  const expiredCodes = new Set(expired.map((o) => o.orderCode));
  const events = (state.events as EventItem[]) || [];
  state.events = events.map((ev) => {
    if (!ev.venueMap?.spots) return ev;
    const spots = ev.venueMap.spots.map((s) =>
      s.status === "RESERVADO" &&
      s.reservedByOrderCode &&
      expiredCodes.has(s.reservedByOrderCode)
        ? {
            ...s,
            status: "DISPONIBLE" as const,
            reservedByOrderCode: undefined,
            reservedByName: undefined,
          }
        : s
    );
    return { ...ev, venueMap: { ...ev.venueMap, spots } };
  });
  state.orders = orders.filter((o) => !expiredCodes.has(o.orderCode));
}

/* ------------------------------------------------------------------ */
/* Cumplimiento: pago aprobado -> orden aprobada + QRs + email         */
/* ------------------------------------------------------------------ */

export interface FulfillResult {
  order: OrderItem | null;
  tickets: TicketQR[];
  alreadyDone: boolean;
}

export async function fulfillPaidOrder(
  orderId: string,
  payment: MpPayment
): Promise<FulfillResult> {
  return mutateState((state) => {
    const orders = ((state.orders as OrderItem[]) || []).slice();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx < 0) return { order: null, tickets: [], alreadyDone: false };

    const target = orders[idx];
    const allTickets = ((state.tickets as TicketQR[]) || []).slice();
    const existingForOrder = allTickets.filter((t) => t.orderId === target.id);

    // Idempotencia: MP puede notificar varias veces el mismo pago
    if (target.status === "APROBADA" && existingForOrder.length > 0) {
      return { order: target, tickets: existingForOrder, alreadyDone: true };
    }

    const approved: OrderItem = {
      ...target,
      status: "APROBADA",
      issueType: "MERCADOPAGO_WEB",
      approvedAt: new Date().toISOString(),
      approvedByUsername: "mercadopago",
      approvedByName: "Mercado Pago (automático)",
      paymentId: String(payment.id),
      paymentStatus: payment.status,
      paymentMethod: payment.payment_type_id || payment.payment_method_id,
      transferReference: `MP #${payment.id}`,
      expiresAt: undefined,
    };
    orders[idx] = approved;

    const events = (state.events as EventItem[]) || [];
    const ev = events.find((e) => e.id === target.eventId);
    const tier = ev?.ticketTiers.find((t) => t.id === target.tierId);
    const qrPerUnit = Math.max(1, Number(target.qrCountPerUnit ?? tier?.qrCount) || 1);
    const total = Math.max(1, Number(target.totalQrCount) || target.quantity * qrPerUnit);

    const used = new Set(allTickets.map((t) => (t.shortCode || "").toUpperCase()));
    const newTickets: TicketQR[] = Array.from({ length: total }, (_, i) => {
      const n = i + 1;
      let code = randomToken(4);
      while (used.has(code)) code = randomToken(4);
      used.add(code);
      const att = target.attendees?.[i] || {
        name: i === 0 ? target.buyerName : `${target.buyerName} (Acceso #${n})`,
        dni: target.buyerDni,
      };
      return {
        id: `tkt-${target.id}-${n}`,
        qrCode: `MAS30|TKT|${code}|${target.orderCode}|${n}`,
        shortCode: code,
        orderId: target.id,
        orderCode: target.orderCode,
        eventId: target.eventId,
        eventTitle: target.eventTitle,
        eventDateLabel: target.eventDateLabel,
        eventTime: target.eventTime,
        eventVenue: target.eventVenue,
        tierName: target.tierName,
        spotId: target.spotId,
        spotName: target.spotName,
        spotPerks: target.spotPerks,
        sectorName: target.sectorName,
        holderName: att.name,
        holderDni: att.dni,
        buyerPhone: target.buyerPhone,
        ticketNumber: n,
        totalInOrder: total,
        unitPrice: Math.round(target.totalAmount / total),
        generatedByUsername: "mercadopago",
        generatedByName: "Mercado Pago (automático)",
        status: "VALIDO",
        createdAt: new Date().toISOString(),
      };
    });

    state.events = events.map((e) => {
      if (e.id !== target.eventId) return e;
      const tiers = e.ticketTiers.map((t) =>
        t.id === target.tierId ? { ...t, sold: t.sold + target.quantity } : t
      );
      const spots = e.venueMap?.spots?.map((s) =>
        s.id === target.spotId
          ? {
              ...s,
              status: "VENDIDO" as const,
              reservedByOrderCode: target.orderCode,
              reservedByName: target.buyerName,
            }
          : s
      );
      return {
        ...e,
        ticketTiers: tiers,
        venueMap: e.venueMap && spots ? { ...e.venueMap, spots } : e.venueMap,
      };
    });
    state.orders = orders;
    state.tickets = [...newTickets, ...allTickets];
    return { order: approved, tickets: newTickets, alreadyDone: false };
  });
}

/** Marca la orden como rechazada y libera la mesa. */
export async function failPaidOrder(orderId: string, payment: MpPayment) {
  await mutateState((state) => {
    const orders = (state.orders as OrderItem[]) || [];
    const target = orders.find((o) => o.id === orderId);
    if (!target || target.status !== "PENDIENTE") return;
    state.orders = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: "RECHAZADA" as const,
            paymentId: String(payment.id),
            paymentStatus: payment.status,
          }
        : o
    );
    const events = (state.events as EventItem[]) || [];
    state.events = events.map((ev) =>
      ev.venueMap?.spots?.some((s) => s.reservedByOrderCode === target.orderCode)
        ? {
            ...ev,
            venueMap: {
              ...ev.venueMap!,
              spots: ev.venueMap!.spots.map((s) =>
                s.reservedByOrderCode === target.orderCode && s.status === "RESERVADO"
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
        : ev
    );
  });
}

/** Envía el email con los QRs reutilizando /api/send-tickets-email. */
export async function sendTicketsEmail(
  siteUrl: string,
  order: OrderItem,
  tickets: TicketQR[]
) {
  try {
    const res = await fetch(`${siteUrl}/api/send-tickets-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": ADMIN_API_SECRET,
      },
      body: JSON.stringify({
        toEmail: order.buyerEmail,
        buyerName: order.buyerName,
        orderCode: order.orderCode,
        eventId: order.eventId,
        eventTitle: order.eventTitle,
        eventDateLabel: order.eventDateLabel,
        eventTime: order.eventTime,
        eventVenue: order.eventVenue,
        originUrl: siteUrl,
        tickets: tickets.map((t) => ({
          ticketNumber: t.ticketNumber,
          totalInOrder: t.totalInOrder,
          holderName: t.holderName,
          holderDni: t.holderDni,
          shortCode: t.shortCode,
          qrCode: t.qrCode,
          tierName: t.tierName,
        })),
      }),
    });
    if (!res.ok) console.error("[MP] Email de tickets falló:", await res.text());
  } catch (err) {
    console.error("[MP] Error enviando email de tickets:", err);
  }
}


