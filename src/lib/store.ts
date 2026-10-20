"use client";

import {
  AdminUser,
  BankSettings,
  EventItem,
  InquiryItem,
  OrderAttendeeInput,
  OrderItem,
  TicketQR,
} from "./types";
import { getSupabaseClient } from "./supabase";

const STORAGE_KEYS = {
  EVENTS: "mas30_events_v3",
  ORDERS: "mas30_orders_v4",
  TICKETS: "mas30_tickets_v4",
  INQUIRIES: "mas30_inquiries_v3",
  SETTINGS: "mas30_settings_v3",
  ADMIN_USERS: "mas30_admin_users_v1",
  ADMIN_SESSION: "mas30_admin_session_v1",
};

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: "usr-admin-1",
    username: "admin",
    password: "mas30admin",
    fullName: "Administrador General MAS30",
    role: "ADMIN_GENERAL",
    active: true,
    createdAt: "2026-10-19T12:00:00Z",
  },
  {
    id: "usr-caja-1",
    username: "caja1",
    password: "caja2026",
    fullName: "Caja 1 · Verificación Transferencias",
    role: "CAJA_VENTAS",
    active: true,
    createdAt: "2026-10-19T12:05:00Z",
  },
  {
    id: "usr-caja-2",
    username: "caja2",
    password: "caja2026",
    fullName: "Caja 2 · Ventas & Accesos",
    role: "CAJA_VENTAS",
    active: true,
    createdAt: "2026-10-19T12:10:00Z",
  },
  {
    id: "usr-rrpp-1",
    username: "rrpp1",
    password: "rrpp2026",
    fullName: "RRPP 1 · Promoción MAS30",
    role: "RRPP",
    active: true,
    createdAt: "2026-10-19T12:15:00Z",
  },
  {
    id: "usr-puerta-1",
    username: "puerta",
    password: "puerta2026",
    fullName: "Operador Puerta Principal",
    role: "PUERTA",
    active: true,
    createdAt: "2026-10-19T12:20:00Z",
  },
];

const LEGACY_KEYS = [
  "mas30_events_v1",
  "mas30_orders_v1",
  "mas30_tickets_v1",
  "mas30_inquiries_v1",
  "mas30_events_v2",
  "mas30_orders_v2",
  "mas30_tickets_v2",
  "mas30_inquiries_v2",
  "mas30_orders_v3",
  "mas30_tickets_v3",
];

function cleanLegacyStorage() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_KEYS) {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
    }
  }
}

export const INITIAL_SETTINGS: BankSettings = {
  bankName: "Banco Galicia / Mercado Pago",
  accountHolder: "MAS30 PRODUCCIONES",
  cbu: "0070099920000018493022",
  alias: "MAS30.EVENTOS.PRO",
  cuit: "30-71849201-9",
  whatsappSupport: "+5491155553030",
  instagramHandle: "@mas30.eventos",
  adminPin: "3030",
  shareTitle: "MAS30 | Eventos",
  shareDescription:
    "Eventos oficiales de MAS30. La fiesta más linda para mayores de 30 años. Entradas con acceso QR individual.",
  shareImageUrl: "",
};

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: "evt-halloween-3110",
    slug: "halloween-mas30-31-10",
    title: "HALLOWEEN",
    subtitle:
      "Noche de Brujas MAS30 · Ambientación terrorífica, premios a los mejores looks y fiesta toda la noche",
    category: "Fiestas",
    date: "2026-10-31",
    dateLabel: "sáb. 31 oct.",
    shortDate: "31.10",
    time: "23:30 a 06:00 hs",
    doorsOpen: "23:30 hs",
    venueName: "MAS30 CLUB · HALLOWEEN EDITION",
    venueAddress: "Av. Libertador & Dorrego, Palermo",
    venueCity: "Buenos Aires",
    country: "Argentina",
    mapUrl: "https://maps.google.com/?q=Av+Libertador+y+Dorrego+Buenos+Aires",
    mapEmbedUrl:
      "https://www.google.com/maps?q=Av+Libertador+y+Dorrego+Buenos+Aires&output=embed",
    flyerUrl: "/flyers/halloween.png",
    flyerGradient: "#ea580c",
    badge: "Sábado 31/10",
    featured: true,
    ageRestriction:
      "Evento exclusivo para mayores de 30 años. Ingreso únicamente con DNI físico y código QR.",
    dressCode: "Disfraz Opcional / Look Dark & Halloween Chic",
    description:
      "¡Llega la noche más embrujada del año a MAS30! Preparate para vivir un Halloween épico entre amigos +30: puesta escénica especial, tragos temáticos, premios para los mejores disfraces o accesorios de terror y todos los hits de los 90s, 2000s y cachengue para bailar hasta el amanecer.",
    highlights: [
      "Premios especiales y botellas para los mejores looks / disfraces de la noche",
      "Recepción con shots temáticos de bienvenida hasta la 01:00 hs",
      "Cabina en vivo con todos los clásicos de los 90s, 2000s, pop y fiesta",
      "Entrada general única a $10.000 con código QR individual por asistente",
    ],
    lineup: [
      "DJ Residente MAS30 (Hits 90s & 2000s)",
      "Halloween Special Show & Visuales",
      "Bloque Cachengue & Fiesta toda la noche",
    ],
    ticketTiers: [
      {
        id: "tier-halloween-general",
        name: "Entrada General · Halloween MAS30",
        description:
          "Acceso oficial a la fiesta de Halloween (Sábado 31/10). Incluye 1 código QR individual.",
        price: 10000,
        stock: 400,
        sold: 0,
        includes: [
          "Acceso General +30",
          "Participación en premios Halloween",
          "Código QR Individual de Puerta",
        ],
      },
    ],
    status: "ACTIVO",
    createdAt: "2026-10-20T00:00:00Z",
  },
  {
    id: "evt-pena-mastreinta-0612",
    slug: "la-pena-mastreinta-06-12",
    title: "La Peña MASTREINTA!",
    subtitle:
      "Temática Argentina - Tropical · Cumbia clásica, cuarteto, peña folklórica moderna, fernet y baile",
    category: "Fiestas",
    date: "2026-12-06",
    dateLabel: "dom. 06 dic.",
    shortDate: "06.12",
    time: "19:00 a 03:30 hs",
    doorsOpen: "19:00 hs (Atardecer Argentino & Tropical)",
    venueName: "ESPACIO AIRE LIBRE · MASTREINTA",
    venueAddress: "Costanera Norte / Sector Terrazas",
    venueCity: "Buenos Aires",
    country: "Argentina",
    mapUrl: "https://maps.google.com/?q=Costanera+Norte+Buenos+Aires",
    mapEmbedUrl:
      "https://www.google.com/maps?q=Costanera+Norte+Buenos+Aires&output=embed",
    flyerUrl: "/flyers/pena-mastreinta.png",
    flyerGradient: "#0284c7",
    badge: "Domingo 06/12",
    featured: true,
    ageRestriction:
      "Evento exclusivo para mayores de 30 años. Ingreso con DNI físico y QR.",
    dressCode: "Toque Celeste y Blanco / Tropical & Verano",
    description:
      "¡Una fiesta bien nuestra y con todo el ritmo tropical! El domingo 6 de diciembre armamos La Peña MASTREINTA!: empezamos al aire libre con empanadas al horno de barro, barra de fernet tirado y vinos, peña moderna para cantar a los gritos y explotamos la pista con la mejor cumbia de los 90s/2000s, cuarteto y clásicos tropicales.",
    highlights: [
      "Temática Argentina + Tropical con decoración celeste, blanca y caribeña",
      "Gastronomía criolla (empanadas, choripán gourmet) y barra de Fernet & Tragos",
      "Banda invitada en vivo + Tanda histórica de Cumbia 90s/2000s y Cuarteto",
      "Entrada general a $10.000 con código QR individual",
    ],
    lineup: [
      "Peña Acústica & Clásicos Argentinos en Vivo",
      "DJ Set Tropical: Los grandes himnos de la Cumbia 90s & 2000s",
      "Cierre Cuartetero & Fiesta MASTREINTA",
    ],
    ticketTiers: [
      {
        id: "tier-pena-general",
        name: "Entrada General · La Peña MASTREINTA!",
        description:
          "Acceso oficial para el Domingo 06/12. Incluye 1 código QR individual.",
        price: 10000,
        stock: 450,
        sold: 0,
        includes: [
          "Acceso General +30",
          "Sector Patio Criollo & Pista Tropical",
          "Código QR Individual de Puerta",
        ],
      },
    ],
    status: "ACTIVO",
    createdAt: "2026-10-20T00:05:00Z",
  },
  {
    id: "evt-byebye-2026-2612",
    slug: "bye-bye-2026-fiesta-fin-de-ano",
    title: "BYE BYE 2026!",
    subtitle:
      "La Gran Fiesta de Fin de Año MAS30 · Despedimos el 2026 a pura fiesta, brindis y lluvia de papelitos",
    category: "Fiestas",
    date: "2026-12-26",
    dateLabel: "sáb. 26 dic.",
    shortDate: "26.12",
    time: "23:30 a 06:30 hs",
    doorsOpen: "23:30 hs",
    venueName: "GRAN SALÓN MAS30 · FIN DE AÑO",
    venueAddress: "Av. Figueroa Alcorta 5500, Palermo",
    venueCity: "Buenos Aires",
    country: "Argentina",
    mapUrl: "https://maps.google.com/?q=Av+Figueroa+Alcorta+5500+Buenos+Aires",
    mapEmbedUrl:
      "https://www.google.com/maps?q=Av+Figueroa+Alcorta+5500+Buenos+Aires&output=embed",
    flyerUrl: "/flyers/bye-bye-2026.png",
    flyerGradient: "#AF2C75",
    badge: "Sábado 26/12 · Fin de Año",
    featured: true,
    ageRestriction:
      "Evento exclusivo para mayores de 30 años. Ingreso con DNI físico y QR.",
    dressCode: "Elegante Fiesta / Brillos, Silver & Black",
    description:
      "¡Despedimos el 2026 como se merece! El sábado 26 de diciembre nos juntamos todos en BYE BYE 2026!, la fiesta de fin de año de MAS30. Conteo regresivo simbólico a medianoche, brindis, lluvia de confetti metalizado, cotillón luminoso y una selección musical demoledora con los mejores temas del año y los clásicos de siempre.",
    highlights: [
      "Gran brindis de despedida de año y show de confetti plateado en pista",
      "Cotillón flúor y barras de espumantes y coctelería toda la noche",
      "Todos los himnos de los 80s, 90s, 2000s y fiesta",
      "Entrada general a $10.000 con código QR individual",
    ],
    lineup: [
      "MAS30 All-Stars DJs (Especial Fin de Año)",
      "Show de Luces, Confetti & Brindis 2026",
    ],
    ticketTiers: [
      {
        id: "tier-byebye-general",
        name: "Entrada General · BYE BYE 2026!",
        description:
          "Acceso oficial a la fiesta de fin de año (Sábado 26/12). Incluye 1 código QR individual.",
        price: 10000,
        stock: 500,
        sold: 0,
        includes: [
          "Acceso General +30",
          "Copa de Brindis de Fin de Año",
          "Código QR Individual de Puerta",
        ],
      },
    ],
    status: "ACTIVO",
    createdAt: "2026-10-20T00:10:00Z",
  },
  {
    id: "evt-fiesta-calor-0901",
    slug: "fiesta-calor-reggaeton-clasico-modo-clap",
    title: "FIESTA CALOR",
    subtitle:
      "Reggaeton Clásico & Modo Clap! · Don Omar, Daddy Yankee, Wisin & Yandel y los hits del verano",
    category: "Fiestas",
    date: "2027-01-09",
    dateLabel: "sáb. 09 ene.",
    shortDate: "09.01",
    time: "23:30 a 06:00 hs",
    doorsOpen: "23:30 hs",
    venueName: "CLUB CALOR · MAS30 SUMMER",
    venueAddress: "Av. Rafael Obligado 6150, Costanera",
    venueCity: "Buenos Aires",
    country: "Argentina",
    mapUrl: "https://maps.google.com/?q=Costanera+Norte+Buenos+Aires",
    mapEmbedUrl:
      "https://www.google.com/maps?q=Costanera+Norte+Buenos+Aires&output=embed",
    flyerUrl: "/flyers/fiesta-calor.png",
    flyerGradient: "#dc2626",
    badge: "Sábado 09/01 · Verano",
    featured: true,
    ageRestriction:
      "Evento exclusivo para mayores de 30 años. Ingreso con DNI físico y QR.",
    dressCode: "Summer Night / Flow 2000s",
    description:
      "¡Enero prende fuego la pista con FIESTA CALOR! Una edición especial de verano dedicada al Reggaeton Clásico de la vieja escuela (Daddy Yankee, Don Omar, Tego Calderón, Wisin & Yandel, Calle 13) y el bloque explosivo en MODO CLAP! para revivir las mejores noches de los 2000s.",
    highlights: [
      "Especial Reggaeton Old School (2002-2012) sin cortes",
      "Activación MODO CLAP! a medianoche con visuales, abanicos y premios",
      "Sector terraza de verano al aire libre + pista central climatizada",
      "Entrada general a $10.000 con código QR individual",
    ],
    lineup: [
      "DJ Set Reggaeton Clásico (La Vieja Escuela)",
      "Especial MODO CLAP! (Himnos del Boliche 2000s)",
      "MAS30 Summer Crew",
    ],
    ticketTiers: [
      {
        id: "tier-calor-general",
        name: "Entrada General · FIESTA CALOR",
        description:
          "Acceso oficial para el Sábado 09/01 (Reggaeton Clásico & Modo Clap!). Incluye 1 código QR individual.",
        price: 10000,
        stock: 450,
        sold: 0,
        includes: [
          "Acceso General +30",
          "Abanico Oficial Fiesta Calor (Primeros 150)",
          "Código QR Individual de Puerta",
        ],
      },
    ],
    status: "ACTIVO",
    createdAt: "2026-10-20T00:15:00Z",
  },
];

export const INITIAL_ORDERS: OrderItem[] = [];

export const INITIAL_TICKETS: TicketQR[] = [];

export const INITIAL_INQUIRIES: InquiryItem[] = [
  {
    id: "inq-1",
    type: "PREGUNTA_EVENTO",
    eventId: "evt-halloween-3110",
    eventTitle: "HALLOWEEN",
    name: "Federico Álvarez",
    email: "fede.alvarez@email.com",
    phone: "+5491133221100",
    message:
      "¡Hola! ¿Es obligatorio ir disfrazado el sábado 31/10 a Halloween o se puede ir con ropa normal?",
    reply:
      "¡Hola Federico! El disfraz es 100% opcional, podés venir como más cómodo te sientas. Eso sí, ¡habrá premios especiales para los mejores disfraces y looks de la noche!",
    isPublic: true,
    status: "RESPONDIDA",
    createdAt: "2026-10-18T19:00:00Z",
  },
  {
    id: "inq-2",
    type: "PREGUNTA_EVENTO",
    eventId: "evt-pena-mastreinta-0612",
    eventTitle: "La Peña MASTREINTA!",
    name: "Natalia Pereyra",
    email: "naty.pereyra@email.com",
    phone: "+5491149876543",
    message:
      "¿En La Peña MASTREINTA! del domingo 06/12 va a haber comida para cenar temprano?",
    reply:
      "¡Sí Natalia! Desde las 19:00 hs tendremos sector gastronómico criollo con empanadas, sándwiches al fuego y barra de fernet y tragos antes de que arranque el baile tropical.",
    isPublic: true,
    status: "RESPONDIDA",
    createdAt: "2026-10-19T16:20:00Z",
  },
];

function notifyStoreUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mas30-store-updated"));
  }
}

let cloudSyncInitialized = false;
let isApplyingCloudState = false;
let isSavingToCloud = false;

export async function pushToCloudStore(
  partial?: Record<string, unknown>
): Promise<boolean> {
  if (typeof window === "undefined" || isApplyingCloudState) return false;
  isSavingToCloud = true;
  try {
    const payload = partial || {
      events: getEvents(),
      orders: getOrders(),
      tickets: getTickets(),
      inquiries: getInquiries(),
      settings: getBankSettings(),
      adminUsers: getAdminUsers(),
    };
    const res = await fetch("/api/cloud-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.events)) {
        try {
          localStorage.setItem(
            STORAGE_KEYS.EVENTS,
            JSON.stringify(data.events)
          );
        } catch {
          // ignore quota error
        }
      }
    }
    isSavingToCloud = false;
    return res.ok;
  } catch {
    isSavingToCloud = false;
    return false;
  }
}

const DEMO_ORDER_IDS = new Set(["ord-demo-1", "ord-demo-2", "ord-demo-3"]);
const DEMO_ORDER_CODES = new Set(["MAS30-8492", "MAS30-9104", "MAS30-9255"]);
const DEMO_TICKET_IDS = new Set(["tkt-demo-1", "tkt-demo-2"]);

function filterOutDemoOrders(orders: OrderItem[]): OrderItem[] {
  if (!Array.isArray(orders)) return [];
  return orders.filter(
    (o) => o && !DEMO_ORDER_IDS.has(o.id) && !DEMO_ORDER_CODES.has(o.orderCode)
  );
}

function filterOutDemoTickets(tickets: TicketQR[]): TicketQR[] {
  if (!Array.isArray(tickets)) return [];
  return tickets.filter(
    (t) =>
      t &&
      !DEMO_TICKET_IDS.has(t.id) &&
      !DEMO_ORDER_IDS.has(t.orderId) &&
      !DEMO_ORDER_CODES.has(t.orderCode)
  );
}

export async function syncFromCloudStore(): Promise<void> {
  if (typeof window === "undefined" || isSavingToCloud) return;
  try {
    const res = await fetch(`/api/cloud-store?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok || isSavingToCloud) return;
    const data = await res.json();

    if (!data.exists || !data.state) {
      await pushToCloudStore();
      return;
    }

    const st = data.state;
    isApplyingCloudState = true;
    let changed = false;

    const applyKey = (storageKey: string, val: unknown) => {
      if (val === undefined || val === null) return;
      const nextStr = JSON.stringify(val);
      const currStr = localStorage.getItem(storageKey);
      if (currStr !== nextStr) {
        try {
          localStorage.setItem(storageKey, nextStr);
          changed = true;
        } catch {
          // ignore quota error
        }
      }
    };

    applyKey(STORAGE_KEYS.EVENTS, st.events);
    applyKey(
      STORAGE_KEYS.ORDERS,
      Array.isArray(st.orders) ? filterOutDemoOrders(st.orders) : st.orders
    );
    applyKey(
      STORAGE_KEYS.TICKETS,
      Array.isArray(st.tickets) ? filterOutDemoTickets(st.tickets) : st.tickets
    );
    applyKey(STORAGE_KEYS.INQUIRIES, st.inquiries);
    applyKey(STORAGE_KEYS.SETTINGS, st.settings);
    applyKey(STORAGE_KEYS.ADMIN_USERS, st.adminUsers);

    isApplyingCloudState = false;
    if (changed) {
      notifyStoreUpdate();
    }
  } catch {
    isApplyingCloudState = false;
  }
}

function ensureCloudSyncStarted() {
  if (typeof window === "undefined" || cloudSyncInitialized) return;
  cloudSyncInitialized = true;
  syncFromCloudStore();
  window.addEventListener("focus", () => {
    syncFromCloudStore();
  });
  setInterval(() => {
    syncFromCloudStore();
  }, 10000);
}

export function getEvents(): EventItem[] {
  if (typeof window === "undefined") return INITIAL_EVENTS;
  cleanLegacyStorage();
  ensureCloudSyncStarted();
  const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
    return INITIAL_EVENTS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_EVENTS;
  }
}

export function isEventVisiblePublicly(
  event: EventItem,
  now: Date = new Date()
): boolean {
  if (event.hidden) return false;
  if (event.publishAt && event.publishAt.trim()) {
    const launchTime = new Date(event.publishAt).getTime();
    if (!Number.isNaN(launchTime) && launchTime > now.getTime()) {
      return false;
    }
  }
  return true;
}

export function getPublicEvents(): EventItem[] {
  const now = new Date();
  return getEvents().filter((ev) => isEventVisiblePublicly(ev, now));
}

export async function toggleEventHidden(eventId: string): Promise<EventItem[]> {
  const current = getEvents();
  const target = current.find((e) => e.id === eventId);
  if (!target) return current;
  const updatedEvent: EventItem = {
    ...target,
    hidden: !target.hidden,
  };
  return upsertEvent(updatedEvent);
}

export function getEventBySlug(slug: string): EventItem | undefined {
  return getEvents().find((e) => e.slug === slug || e.id === slug);
}

export function saveEvents(events: EventItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  } catch {
    // Si la imagen base64 supera la cuota de localStorage, igual la subimos a Supabase Storage en pushToCloudStore
  }
  notifyStoreUpdate();
  void pushToCloudStore({ events });
}

export async function upsertEvent(event: EventItem): Promise<EventItem[]> {
  const current = getEvents();
  const exists = current.some((e) => e.id === event.id);
  const updated = exists
    ? current.map((e) => (e.id === event.id ? event : e))
    : [event, ...current];
  try {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(updated));
  } catch {
    // ignore local quota
  }
  notifyStoreUpdate();
  await pushToCloudStore({ events: updated });

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("events").upsert({
        id: event.id,
        slug: event.slug,
        title: event.title,
        subtitle: event.subtitle,
        category: event.category,
        date: event.date,
        time: event.time,
        venue_name: event.venueName,
        venue_address: event.venueAddress,
        venue_city: event.venueCity,
        map_url: event.mapUrl,
        flyer_url: event.flyerUrl,
        badge: event.badge,
        featured: event.featured,
        age_restriction: event.ageRestriction,
        dress_code: event.dressCode,
        description: event.description,
        highlights: event.highlights,
        lineup: event.lineup,
        ticket_tiers: event.ticketTiers,
        status: event.status,
      });
    } catch (e) {
      console.warn("Supabase sync fallback local:", e);
    }
  }

  return updated;
}

export async function deleteEvent(eventId: string): Promise<EventItem[]> {
  const updated = getEvents().filter((e) => e.id !== eventId);
  try {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(updated));
  } catch {
    // ignore
  }
  notifyStoreUpdate();
  await pushToCloudStore({ events: updated });
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("events").delete().eq("id", eventId);
    } catch {
      // fallback local
    }
  }
  return updated;
}

export function getOrders(): OrderItem[] {
  if (typeof window === "undefined") return INITIAL_ORDERS;
  cleanLegacyStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  }
  try {
    return filterOutDemoOrders(JSON.parse(raw));
  } catch {
    return INITIAL_ORDERS;
  }
}

export function getOrderByCode(orderCode: string): OrderItem | undefined {
  const normalized = orderCode.trim().toUpperCase();
  return getOrders().find(
    (o) => o.orderCode.toUpperCase() === normalized || o.id === orderCode
  );
}

export function saveOrders(orders: OrderItem[]) {
  if (typeof window === "undefined") return;
  const cleaned = filterOutDemoOrders(orders);
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(cleaned));
  notifyStoreUpdate();
  void pushToCloudStore({ orders: cleaned });
}

export function getTickets(): TicketQR[] {
  if (typeof window === "undefined") return INITIAL_TICKETS;
  cleanLegacyStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.TICKETS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(INITIAL_TICKETS));
    return INITIAL_TICKETS;
  }
  try {
    return filterOutDemoTickets(JSON.parse(raw));
  } catch {
    return INITIAL_TICKETS;
  }
}

export function getTicketsByOrderCode(orderCode: string): TicketQR[] {
  const normalized = orderCode.trim().toUpperCase();
  return getTickets().filter((t) => t.orderCode.toUpperCase() === normalized);
}

export function saveTickets(tickets: TicketQR[]) {
  if (typeof window === "undefined") return;
  const cleaned = filterOutDemoTickets(tickets);
  localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(cleaned));
  notifyStoreUpdate();
  void pushToCloudStore({ tickets: cleaned });
}

export async function createTransferOrder(input: {
  event: EventItem;
  tierId: string;
  quantity: number;
  buyerName: string;
  buyerDni: string;
  buyerEmail: string;
  buyerPhone: string;
  transferSender: string;
  transferReference: string;
  notes?: string;
  attendees: OrderAttendeeInput[];
}): Promise<OrderItem> {
  const tier =
    input.event.ticketTiers.find((t) => t.id === input.tierId) ||
    input.event.ticketTiers[0];
  const qrCountPerUnit = Math.max(1, Number(tier.qrCount) || 1);
  const totalQrCount = input.quantity * qrCountPerUnit;
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const orderCode = `MAS30-${randomDigits}`;

  const normalizedAttendees: OrderAttendeeInput[] = Array.from(
    { length: totalQrCount },
    (_, idx) => {
      const provided = input.attendees[idx];
      if (provided && provided.name.trim()) {
        return {
          name: provided.name.trim(),
          dni: provided.dni.trim() || input.buyerDni,
        };
      }
      return {
        name:
          idx === 0
            ? input.buyerName
            : `${input.buyerName} (Acceso #${idx + 1})`,
        dni: input.buyerDni,
      };
    }
  );

  const newOrder: OrderItem = {
    id: `ord-${Date.now()}`,
    orderCode,
    eventId: input.event.id,
    eventSlug: input.event.slug,
    eventTitle: input.event.title,
    eventDateLabel: input.event.dateLabel,
    eventTime: input.event.time,
    eventVenue: input.event.venueName,
    buyerName: input.buyerName,
    buyerDni: input.buyerDni,
    buyerEmail: input.buyerEmail,
    buyerPhone: input.buyerPhone,
    tierId: tier.id,
    tierName: tier.name,
    unitPrice: tier.price,
    quantity: input.quantity,
    qrCountPerUnit,
    totalQrCount,
    totalAmount: tier.price * input.quantity,
    transferSender: input.transferSender,
    transferReference: input.transferReference,
    notes: input.notes,
    attendees: normalizedAttendees,
    status: "PENDIENTE",
    createdAt: new Date().toISOString(),
  };

  const orders = [newOrder, ...getOrders()];
  saveOrders(orders);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("orders").insert({
        id: newOrder.id,
        order_code: newOrder.orderCode,
        event_id: newOrder.eventId,
        event_title: newOrder.eventTitle,
        event_date: newOrder.eventDateLabel,
        event_venue: newOrder.eventVenue,
        buyer_name: newOrder.buyerName,
        buyer_dni: newOrder.buyerDni,
        buyer_email: newOrder.buyerEmail,
        buyer_phone: newOrder.buyerPhone,
        tier_id: newOrder.tierId,
        tier_name: newOrder.tierName,
        unit_price: newOrder.unitPrice,
        quantity: newOrder.quantity,
        total_amount: newOrder.totalAmount,
        transfer_sender: newOrder.transferSender,
        transfer_reference: newOrder.transferReference,
        notes: newOrder.notes,
        status: "PENDIENTE",
      });
    } catch {
      // fallback local
    }
  }

  return newOrder;
}

function generateRandomHexToken(len = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export async function approveOrderAndGenerateQRs(
  orderId: string,
  operator?: { username: string; fullName: string },
  issueTypeOverride?: "TRANSFERENCIA_WEB" | "VENTA_MANUAL_ADMIN" | "CORTESIA_ADMIN"
): Promise<{
  order: OrderItem;
  generatedTickets: TicketQR[];
}> {
  const orders = getOrders();
  const target = orders.find((o) => o.id === orderId || o.orderCode === orderId);
  if (!target) {
    throw new Error("Orden no encontrada");
  }

  const currentAdmin = operator || getCurrentAdminSession() || {
    username: "admin",
    fullName: "Administrador General MAS30",
  };

  const approvedOrder: OrderItem = {
    ...target,
    status: "APROBADA",
    approvedAt: new Date().toISOString(),
    approvedByUsername: currentAdmin.username,
    approvedByName: currentAdmin.fullName,
    issueType:
      issueTypeOverride ||
      target.issueType ||
      (target.totalAmount === 0 ? "CORTESIA_ADMIN" : "TRANSFERENCIA_WEB"),
  };

  const updatedOrders = orders.map((o) =>
    o.id === target.id ? approvedOrder : o
  );
  saveOrders(updatedOrders);

  const existingTickets = getTickets();
  const alreadyForOrder = existingTickets.filter(
    (t) => t.orderId === target.id || t.orderCode === target.orderCode
  );

  if (alreadyForOrder.length > 0) {
    return { order: approvedOrder, generatedTickets: alreadyForOrder };
  }

  const events = getEvents();
  const targetEvent = events.find((ev) => ev.id === target.eventId);
  const targetTier = targetEvent?.ticketTiers.find(
    (t) => t.id === target.tierId
  );
  const qrCountPerUnit = Math.max(
    1,
    Number(target.qrCountPerUnit ?? targetTier?.qrCount) || 1
  );
  const totalQRsToGenerate = Math.max(
    1,
    Number(target.totalQrCount) || target.quantity * qrCountPerUnit
  );

  const usedCodes = new Set(
    existingTickets.map((t) => (t.shortCode || "").toUpperCase())
  );
  const newTickets: TicketQR[] = Array.from(
    { length: totalQRsToGenerate },
    (_, idx) => {
      const ticketNumber = idx + 1;
      let code4 = generateRandomHexToken(4);
      while (usedCodes.has(code4)) {
        code4 = generateRandomHexToken(4);
      }
      usedCodes.add(code4);
      const qrCode = `MAS30|TKT|${code4}|${target.orderCode}|${ticketNumber}`;
      const shortCode = code4;
      const attendee = target.attendees?.[idx] || {
        name:
          idx === 0
            ? target.buyerName
            : `${target.buyerName} (Acceso #${ticketNumber})`,
        dni: target.buyerDni,
      };

      return {
        id: `tkt-${target.id}-${ticketNumber}`,
        qrCode,
        shortCode,
        orderId: target.id,
        orderCode: target.orderCode,
        eventId: target.eventId,
        eventTitle: target.eventTitle,
        eventDateLabel: target.eventDateLabel,
        eventTime: target.eventTime,
        eventVenue: target.eventVenue,
        tierName: target.tierName,
        holderName: attendee.name,
        holderDni: attendee.dni,
        buyerPhone: target.buyerPhone,
        ticketNumber,
        totalInOrder: totalQRsToGenerate,
        unitPrice: Math.round(target.totalAmount / totalQRsToGenerate),
        generatedByUsername: currentAdmin.username,
        generatedByName: currentAdmin.fullName,
        status: "VALIDO",
        createdAt: new Date().toISOString(),
      };
    }
  );
  const updatedEvents = events.map((ev) => {
    if (ev.id !== target.eventId) return ev;
    return {
      ...ev,
      ticketTiers: ev.ticketTiers.map((tier) =>
        tier.id === target.tierId
          ? { ...tier, sold: tier.sold + target.quantity }
          : tier
      ),
    };
  });
  saveEvents(updatedEvents);

  const allTickets = [...newTickets, ...existingTickets];
  saveTickets(allTickets);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from("orders")
        .update({
          status: "APROBADA",
          approved_at: approvedOrder.approvedAt,
          approved_by_username: approvedOrder.approvedByUsername,
          approved_by_name: approvedOrder.approvedByName,
        })
        .eq("id", target.id);

      await supabase.from("tickets").insert(
        newTickets.map((t) => ({
          id: t.id,
          qr_code: t.qrCode,
          order_id: t.orderId,
          order_code: t.orderCode,
          event_id: t.eventId,
          event_title: t.eventTitle,
          event_date: t.eventDateLabel,
          event_venue: t.eventVenue,
          tier_name: t.tierName,
          holder_name: t.holderName,
          holder_dni: t.holderDni,
          ticket_number: t.ticketNumber,
          total_in_order: t.totalInOrder,
          unit_price: t.unitPrice ?? 10000,
          generated_by_username: t.generatedByUsername,
          generated_by_name: t.generatedByName,
          status: "VALIDO",
        }))
      );
    } catch {
      // fallback local
    }
  }

  return { order: approvedOrder, generatedTickets: newTickets };
}

export async function createManualAdminAccess(
  input: {
    eventId: string;
    tierId: string;
    holderName: string;
    holderDni: string;
    buyerPhone: string;
    buyerEmail?: string;
    quantity: number;
    isCourtesy: boolean;
  },
  operator?: { username: string; fullName: string }
): Promise<{ order: OrderItem; tickets: TicketQR[] }> {
  const event = getEvents().find((e) => e.id === input.eventId) || getEvents()[0];
  const tier =
    event.ticketTiers.find((t) => t.id === input.tierId) || event.ticketTiers[0];

  const currentAdmin = operator || getCurrentAdminSession() || {
    username: "admin",
    fullName: "Administrador General MAS30",
  };

  const qrCountPerUnit = Math.max(1, Number(tier.qrCount) || 1);
  const totalQRs = input.quantity * qrCountPerUnit;

  const createdOrder = await createTransferOrder({
    event,
    tierId: tier.id,
    quantity: input.quantity,
    buyerName: input.holderName,
    buyerDni: input.holderDni,
    buyerEmail: input.buyerEmail || "cortesia@mas30.com",
    buyerPhone: input.buyerPhone,
    transferSender: input.isCourtesy
      ? `CORTESÍA (${currentAdmin.fullName})`
      : `COBRO DIRECTO (${currentAdmin.fullName})`,
    transferReference: input.isCourtesy ? "FREE-PASS" : "ADMIN-DIRECT",
    notes: input.isCourtesy
      ? `Cortesía sin cargo emitida por ${currentAdmin.fullName} (@${currentAdmin.username})`
      : `Venta directa cobrada y emitida por ${currentAdmin.fullName} (@${currentAdmin.username})`,
    attendees: Array.from({ length: totalQRs }, (_, idx) => ({
      name:
        idx === 0
          ? input.holderName
          : `${input.holderName} (Acceso #${idx + 1})`,
      dni: input.holderDni,
    })),
  });

  if (input.isCourtesy) {
    const orders = getOrders().map((o) =>
      o.id === createdOrder.id
        ? { ...o, unitPrice: 0, totalAmount: 0, issueType: "CORTESIA_ADMIN" as const }
        : o
    );
    saveOrders(orders);
  } else {
    const orders = getOrders().map((o) =>
      o.id === createdOrder.id
        ? { ...o, issueType: "VENTA_MANUAL_ADMIN" as const }
        : o
    );
    saveOrders(orders);
  }

  const { order, generatedTickets } = await approveOrderAndGenerateQRs(
    createdOrder.id,
    currentAdmin,
    input.isCourtesy ? "CORTESIA_ADMIN" : "VENTA_MANUAL_ADMIN"
  );
  return { order, tickets: generatedTickets };
}

export async function rejectOrder(orderId: string): Promise<void> {
  const updated = getOrders().map((o) =>
    o.id === orderId ? { ...o, status: "RECHAZADA" as const } : o
  );
  saveOrders(updated);
}

export async function deleteOrder(orderId: string): Promise<void> {
  const orders = getOrders();
  const target = orders.find((o) => o.id === orderId || o.orderCode === orderId);
  const updatedOrders = orders.filter(
    (o) => o.id !== orderId && o.orderCode !== orderId
  );
  saveOrders(updatedOrders);

  if (target) {
    const updatedTickets = getTickets().filter(
      (t) => t.orderId !== target.id && t.orderCode !== target.orderCode
    );
    saveTickets(updatedTickets);
  }

  const supabase = getSupabaseClient();
  if (supabase && target) {
    try {
      await supabase.from("tickets").delete().eq("order_id", target.id);
      await supabase.from("orders").delete().eq("id", target.id);
    } catch {
      // fallback local
    }
  }
}

export interface ScanValidationResult {
  outcome: "AUTORIZADO" | "YA_USADO" | "NO_ENCONTRADO" | "ANULADO";
  message: string;
  ticket?: TicketQR;
  previousScannedAt?: string;
}

export async function validateAndScanQR(
  rawInput: string,
  operatorName = "Puerta Principal MAS30"
): Promise<ScanValidationResult> {
  const clean = rawInput.trim().toUpperCase();
  const tickets = getTickets();

  const match = tickets.find((t) => {
    const qrUpper = (t.qrCode || "").toUpperCase();
    const shortUpper = (t.shortCode || "").toUpperCase();
    const idUpper = (t.id || "").toUpperCase();
    const qrParts = qrUpper.split("|");
    return (
      qrUpper === clean ||
      shortUpper === clean ||
      idUpper === clean ||
      (clean.length === 4 && qrParts.includes(clean))
    );
  });

  if (!match) {
    const pendingOrder = getOrders().find(
      (o) => o.orderCode.toUpperCase() === clean.toUpperCase()
    );
    if (pendingOrder && pendingOrder.status === "PENDIENTE") {
      return {
        outcome: "NO_ENCONTRADO",
        message: `La orden ${pendingOrder.orderCode} (${pendingOrder.buyerName}) aún figura PENDIENTE DE APROBACIÓN de transferencia.`,
      };
    }
    return {
      outcome: "NO_ENCONTRADO",
      message:
        "Código QR o entrada inexistente en la base de datos de MAS30. Verifique el código.",
    };
  }

  if (match.status === "ANULADO") {
    return {
      outcome: "ANULADO",
      message: "Esta entrada fue ANULADA por la administración.",
      ticket: match,
    };
  }

  if (match.status === "USADO") {
    return {
      outcome: "YA_USADO",
      message: "¡ALERTA! Este código QR ya fue escaneado y utilizado anteriormente.",
      ticket: match,
      previousScannedAt: match.scannedAt,
    };
  }

  const nowIso = new Date().toISOString();
  const updatedTicket: TicketQR = {
    ...match,
    status: "USADO",
    scannedAt: nowIso,
    scannedBy: operatorName,
  };

  const updatedList = tickets.map((t) =>
    t.id === match.id ? updatedTicket : t
  );
  saveTickets(updatedList);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from("tickets")
        .update({
          status: "USADO",
          scanned_at: nowIso,
          scanned_by: operatorName,
        })
        .eq("id", match.id);
    } catch {
      // fallback local
    }
  }

  return {
    outcome: "AUTORIZADO",
    message: "ACCESO AUTORIZADO · Entrada válida y registrada en puerta.",
    ticket: updatedTicket,
  };
}

export async function resetTicketScanStatus(ticketId: string): Promise<void> {
  const updated = getTickets().map((t) =>
    t.id === ticketId
      ? { ...t, status: "VALIDO" as const, scannedAt: undefined, scannedBy: undefined }
      : t
  );
  saveTickets(updated);
}

export function getInquiries(): InquiryItem[] {
  if (typeof window === "undefined") return INITIAL_INQUIRIES;
  cleanLegacyStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.INQUIRIES);
  if (!raw) {
    localStorage.setItem(
      STORAGE_KEYS.INQUIRIES,
      JSON.stringify(INITIAL_INQUIRIES)
    );
    return INITIAL_INQUIRIES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_INQUIRIES;
  }
}

export function saveInquiries(items: InquiryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(items));
  notifyStoreUpdate();
  void pushToCloudStore({ inquiries: items });
}

export async function createInquiry(input: {
  type: "PREGUNTA_EVENTO" | "CONTACTO_GENERAL";
  eventId?: string;
  eventTitle?: string;
  name: string;
  email: string;
  phone: string;
  subject?: string;
  message: string;
}): Promise<InquiryItem> {
  const newItem: InquiryItem = {
    id: `inq-${Date.now()}`,
    type: input.type,
    eventId: input.eventId,
    eventTitle: input.eventTitle,
    name: input.name,
    email: input.email,
    phone: input.phone,
    subject: input.subject,
    message: input.message,
    isPublic: false,
    status: "PENDIENTE",
    createdAt: new Date().toISOString(),
  };

  const updated = [newItem, ...getInquiries()];
  saveInquiries(updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("inquiries").insert({
        id: newItem.id,
        type: newItem.type,
        event_id: newItem.eventId,
        event_title: newItem.eventTitle,
        name: newItem.name,
        email: newItem.email,
        phone: newItem.phone,
        message: newItem.message,
        status: "PENDIENTE",
      });
    } catch {
      // fallback local
    }
  }

  return newItem;
}

export async function replyInquiry(
  inquiryId: string,
  replyText: string,
  makePublic: boolean
): Promise<void> {
  const updated = getInquiries().map((inq) =>
    inq.id === inquiryId
      ? {
          ...inq,
          reply: replyText,
          isPublic: makePublic,
          status: "RESPONDIDA" as const,
        }
      : inq
  );
  saveInquiries(updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from("inquiries")
        .update({
          reply: replyText,
          is_public: makePublic,
          status: "RESPONDIDA",
        })
        .eq("id", inquiryId);
    } catch {
      // fallback local
    }
  }
}

export async function upsertInquiry(item: InquiryItem): Promise<InquiryItem[]> {
  const current = getInquiries();
  const exists = current.some((i) => i.id === item.id);
  const updated = exists
    ? current.map((i) => (i.id === item.id ? item : i))
    : [item, ...current];
  saveInquiries(updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("inquiries").upsert({
        id: item.id,
        type: item.type,
        event_id: item.eventId || "ALL",
        event_title: item.eventTitle || "Todos los Eventos",
        name: item.name,
        email: item.email,
        phone: item.phone,
        message: item.message,
        reply: item.reply || "",
        is_public: item.isPublic,
        status: item.status,
      });
    } catch {
      // fallback local
    }
  }

  return updated;
}

export async function deleteInquiry(inquiryId: string): Promise<InquiryItem[]> {
  const updated = getInquiries().filter((i) => i.id !== inquiryId);
  saveInquiries(updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("inquiries").delete().eq("id", inquiryId);
    } catch {
      // fallback local
    }
  }

  return updated;
}

export function getBankSettings(): BankSettings {
  if (typeof window === "undefined") return INITIAL_SETTINGS;
  const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!raw) {
    localStorage.setItem(
      STORAGE_KEYS.SETTINGS,
      JSON.stringify(INITIAL_SETTINGS)
    );
    return INITIAL_SETTINGS;
  }
  try {
    return { ...INITIAL_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return INITIAL_SETTINGS;
  }
}

export function saveBankSettings(settings: BankSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  notifyStoreUpdate();
  void pushToCloudStore({ settings });
}

export function getAdminUsers(): AdminUser[] {
  if (typeof window === "undefined") return INITIAL_ADMIN_USERS;
  const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_USERS);
  if (!raw) {
    localStorage.setItem(
      STORAGE_KEYS.ADMIN_USERS,
      JSON.stringify(INITIAL_ADMIN_USERS)
    );
    return INITIAL_ADMIN_USERS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_ADMIN_USERS;
  }
}

export function saveAdminUsers(users: AdminUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(users));
  notifyStoreUpdate();
  void pushToCloudStore({ adminUsers: users });
}

export function upsertAdminUser(user: AdminUser): AdminUser[] {
  const current = getAdminUsers();
  const exists = current.some((u) => u.id === user.id);
  const updated = exists
    ? current.map((u) => (u.id === user.id ? user : u))
    : [...current, user];
  saveAdminUsers(updated);
  return updated;
}

export function deleteAdminUser(userId: string): AdminUser[] {
  const current = getAdminUsers();
  if (current.length <= 1) return current;
  const updated = current.filter((u) => u.id !== userId);
  saveAdminUsers(updated);
  return updated;
}

export function getCurrentAdminSession(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loginAdminUser(
  usernameInput: string,
  passwordInput: string
): AdminUser | null {
  const cleanUser = usernameInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();
  const users = getAdminUsers();
  const found = users.find(
    (u) =>
      u.active &&
      u.username.trim().toLowerCase() === cleanUser &&
      u.password === cleanPass
  );
  if (!found) return null;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(found));
    notifyStoreUpdate();
  }
  return found;
}

export function logoutAdminUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
  notifyStoreUpdate();
}

export function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}
