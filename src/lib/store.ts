"use client";

import {
  AdminRoleDefinition,
  AdminUser,
  BankSettings,
  EventAnalyticsItem,
  EventItem,
  InquiryItem,
  OrderAttendeeInput,
  OrderItem,
  RolePermissions,
  SiteAnalytics,
  TicketQR,
  VenueMapConfig,
  VenueSectorLabel,
  VenueSpot,
  VenueSpotStatus,
} from "./types";
import { getArgentinaDateKey } from "./dateUtils";

const STORAGE_KEYS = {
  EVENTS: "mas30_events_v3",
  ORDERS: "mas30_orders_v4",
  TICKETS: "mas30_tickets_v4",
  INQUIRIES: "mas30_inquiries_v3",
  SETTINGS: "mas30_settings_v3",
  ADMIN_USERS: "mas30_admin_users_v2",
  ADMIN_ROLES: "mas30_admin_roles_v1",
  ADMIN_SESSION: "mas30_admin_session_v1",
  ANALYTICS: "mas30_analytics_v1",
  VISITOR_KNOWN: "mas30_visitor_known_v1",
};

export const INITIAL_ADMIN_ROLES: AdminRoleDefinition[] = [
  {
    id: "role-superadmin",
    name: "SUPERADMIN",
    label: "Superadministrador (Acceso Total)",
    description:
      "Acceso total a todos los eventos, gestión de usuarios, creación de roles, permisos y configuración global.",
    isSystem: true,
    permissions: {
      canViewOrders: true,
      canApproveOrders: true,
      canIssueManualQR: true,
      canManageEvents: true,
      canDeleteEvents: true,
      canManageUsers: true,
      canViewAnalytics: true,
      canViewTickets: true,
      canViewRendicion: true,
      canManageInquiries: true,
      canManageSettings: true,
      canUseScanner: true,
      scannerOnly: false,
      canResetScannedQR: true,
    },
  },
  {
    id: "role-admin",
    name: "ADMIN",
    label: "Administrador de Eventos Asignados",
    description:
      "Administra los eventos asignados o creados, gestiona accesos, pedidos y usuarios operadores.",
    isSystem: true,
    permissions: {
      canViewOrders: true,
      canApproveOrders: true,
      canIssueManualQR: true,
      canManageEvents: true,
      canDeleteEvents: true,
      canManageUsers: true,
      canViewAnalytics: true,
      canViewTickets: true,
      canViewRendicion: true,
      canManageInquiries: true,
      canManageSettings: false,
      canUseScanner: true,
      scannerOnly: false,
      canResetScannedQR: true,
    },
  },
  {
    id: "role-caja",
    name: "CAJA_VENTAS",
    label: "Caja & Ventas (Eventos Asignados)",
    description:
      "Verifica pagos, aprueba órdenes y emite QRs únicamente de los eventos que tiene asignados.",
    isSystem: false,
    permissions: {
      canViewOrders: true,
      canApproveOrders: true,
      canIssueManualQR: true,
      canManageEvents: false,
      canDeleteEvents: false,
      canManageUsers: false,
      canViewAnalytics: false,
      canViewTickets: true,
      canViewRendicion: true,
      canManageInquiries: false,
      canManageSettings: false,
      canUseScanner: true,
      scannerOnly: false,
      canResetScannedQR: false,
    },
  },
  {
    id: "role-rrpp",
    name: "RRPP",
    label: "RRPP / Promoción (Eventos Asignados)",
    description:
      "Emite accesos manuales/cortesías y visualiza reservas de sus eventos asignados.",
    isSystem: false,
    permissions: {
      canViewOrders: true,
      canApproveOrders: false,
      canIssueManualQR: true,
      canManageEvents: false,
      canDeleteEvents: false,
      canManageUsers: false,
      canViewAnalytics: true,
      canViewTickets: false,
      canViewRendicion: true,
      canManageInquiries: false,
      canManageSettings: false,
      canUseScanner: false,
      scannerOnly: false,
      canResetScannedQR: false,
    },
  },
  {
    id: "role-lector-qr",
    name: "LECTOR_QR",
    label: "Lector QR Puerta (Solo Validar Ingresos)",
    description:
      "Acceso exclusivo al Lector QR de Puerta. Solamente puede validar códigos QR y códigos de 4 dígitos de los asistentes.",
    isSystem: true,
    permissions: {
      canViewOrders: false,
      canApproveOrders: false,
      canIssueManualQR: false,
      canManageEvents: false,
      canDeleteEvents: false,
      canManageUsers: false,
      canViewAnalytics: false,
      canViewTickets: false,
      canViewRendicion: false,
      canManageInquiries: false,
      canManageSettings: false,
      canUseScanner: true,
      scannerOnly: true,
      canResetScannedQR: false,
    },
  },
];

// IMPORTANTE: los usuarios semilla NO llevan contraseña en el código (el repositorio
// es público). Definí cada contraseña con `node scripts/reset-admin-password.mjs <usuario>`
// antes del primer login; hasta entonces la cuenta no puede autenticarse.
export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: "usr-superadmin-1",
    username: "superadmin",
    password: "",
    fullName: "Superadministrador MASTREINTA",
    role: "SUPERADMIN",
    assignedEventIds: [],
    active: true,
    createdAt: "2026-10-19T11:00:00Z",
  },
  {
    id: "usr-admin-1",
    username: "admin",
    password: "",
    fullName: "Administrador de Eventos",
    role: "ADMIN",
    assignedEventIds: ["evt-halloween-3110"],
    active: true,
    createdAt: "2026-10-19T12:00:00Z",
  },
  {
    id: "usr-lector-1",
    username: "lector",
    password: "",
    fullName: "Lector QR Puerta · Validador",
    role: "LECTOR_QR",
    assignedEventIds: [
      "evt-halloween-3110",
      "evt-pena-mastreinta-0612",
      "evt-byebye-2026-2612",
      "evt-fiesta-calor-0901",
    ],
    active: true,
    createdAt: "2026-10-19T12:02:00Z",
  },
  {
    id: "usr-caja-1",
    username: "caja1",
    password: "",
    fullName: "Caja 1 · Verificación Transferencias",
    role: "CAJA_VENTAS",
    assignedEventIds: ["evt-halloween-3110"],
    active: true,
    createdAt: "2026-10-19T12:05:00Z",
  },
  {
    id: "usr-rrpp-1",
    username: "rrpp1",
    password: "",
    fullName: "RRPP 1 · Promoción MASTREINTA",
    role: "RRPP",
    assignedEventIds: ["evt-halloween-3110"],
    active: true,
    createdAt: "2026-10-19T12:15:00Z",
  },
  {
    id: "usr-puerta-1",
    username: "puerta",
    password: "",
    fullName: "Operador Puerta Principal",
    role: "LECTOR_QR",
    assignedEventIds: [
      "evt-halloween-3110",
      "evt-pena-mastreinta-0612",
      "evt-byebye-2026-2612",
      "evt-fiesta-calor-0901",
    ],
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

export function createDefaultVenueMap(): VenueMapConfig {
  return {
    enabled: true,
    sectors: [
      { id: "sec-dj", name: "CABINA DJ / ESCENARIO", x: 50, y: 12, color: "#AF2C75" },
      { id: "sec-pista", name: "PISTA CENTRAL", x: 50, y: 48, color: "#3b82f6" },
      { id: "sec-vip", name: "SECTOR VIP EXCLUSIVO", x: 82, y: 48, color: "#eab308" },
      { id: "sec-livings", name: "LIVINGS & LOUNGE", x: 18, y: 48, color: "#10b981" },
      { id: "sec-barra", name: "BARRA PRINCIPAL", x: 50, y: 88, color: "#8b5cf6" },
    ],
    polygons: [
      {
        id: "poly-escenario-default",
        name: "ESCENARIO PRINCIPAL / CABINA DJ",
        type: "ESCENARIO",
        points: [
          { x: 36, y: 5 },
          { x: 64, y: 5 },
          { x: 70, y: 15 },
          { x: 30, y: 15 },
        ],
        color: "#AF2C75",
        fillColor: "rgba(175, 44, 117, 0.25)",
        closed: true,
      },
    ],
    spots: [
      {
        id: "spot-vip-1",
        name: "Sector VIP Gold (20 personas)",
        sectorName: "SECTOR VIP EXCLUSIVO",
        type: "SECTOR_VIP",
        capacity: 20,
        price: 200000,
        perks: "20 accesos + 10 espumantes Baron B + camarero exclusivo + acceso VIP sin fila",
        x: 82,
        y: 28,
        shape: "rect",
        status: "DISPONIBLE",
      },
      {
        id: "spot-vip-2",
        name: "Living VIP 1 (10 personas)",
        sectorName: "SECTOR VIP EXCLUSIVO",
        type: "LIVING",
        capacity: 10,
        price: 100000,
        perks: "10 accesos + 5 espumantes + living privado y vista preferencial",
        x: 82,
        y: 62,
        shape: "rect",
        status: "DISPONIBLE",
      },
      {
        id: "spot-mesa-5",
        name: "Mesa 5 (8 personas)",
        sectorName: "PISTA CENTRAL",
        type: "MESA",
        capacity: 8,
        price: 50000,
        perks: "8 accesos + 4 espumantes o botellas a elección + ubicación pista",
        x: 50,
        y: 66,
        shape: "circle",
        status: "DISPONIBLE",
      },
      {
        id: "spot-mesa-1",
        name: "Mesa 1 (8 personas)",
        sectorName: "PISTA CENTRAL",
        type: "MESA",
        capacity: 8,
        price: 50000,
        perks: "8 accesos + 4 espumantes o consumiciones incluidas",
        x: 35,
        y: 66,
        shape: "circle",
        status: "DISPONIBLE",
      },
      {
        id: "spot-mesa-2",
        name: "Mesa 2 (8 personas)",
        sectorName: "PISTA CENTRAL",
        type: "MESA",
        capacity: 8,
        price: 50000,
        perks: "8 accesos + 4 espumantes o consumiciones incluidas",
        x: 65,
        y: 66,
        shape: "circle",
        status: "DISPONIBLE",
      },
      {
        id: "spot-living-lounge",
        name: "Living Lounge Terraza (12 personas)",
        sectorName: "LIVINGS & LOUNGE",
        type: "LIVING",
        capacity: 12,
        price: 120000,
        perks: "12 accesos + 6 espumantes + espacio semi-techado",
        x: 18,
        y: 35,
        shape: "rect",
        status: "DISPONIBLE",
      },
    ],
  };
}

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
    venueMap: createDefaultVenueMap(),
    paymentAccountId: "acc-test-organizador",
    platformFeePercent: 10,
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
      adminRoles: getAdminRoles(),
    };
    // La autorización la da la cookie de sesión HttpOnly (se envía sola en el mismo origen)
    const res = await fetch("/api/cloud-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    if (res.status === 401 && getCurrentAdminSession()) {
      // La sesión del servidor venció: cerrar también la sesión visual
      localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
      notifyStoreUpdate();
    }
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
    const session = getCurrentAdminSession();
    const res = await fetch(`/api/cloud-store?t=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok || isSavingToCloud) return;
    const data = await res.json();

    // Hay sesión visual pero el servidor ya no la reconoce (venció o fue revocada)
    if (session && !data.isAdmin) {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
      notifyStoreUpdate();
    }

    if (!data.exists || !data.state) {
      if (session) {
        await pushToCloudStore();
      }
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
    if (st.settings) {
      if (data.isAdmin) {
        applyKey(STORAGE_KEYS.SETTINGS, st.settings);
      } else {
        const prevSettings = getBankSettings();
        const safeMerged = {
          ...prevSettings,
          ...st.settings,
          smtpPass: prevSettings.smtpPass || "",
          resendApiKey: prevSettings.resendApiKey || "",
        };
        applyKey(STORAGE_KEYS.SETTINGS, safeMerged);
      }
    }
    if (data.isAdmin && Array.isArray(st.adminUsers)) {
      applyKey(STORAGE_KEYS.ADMIN_USERS, normalizeAdminUsersList(st.adminUsers));
    }
    if (data.isAdmin && Array.isArray(st.adminRoles)) {
      applyKey(STORAGE_KEYS.ADMIN_ROLES, normalizeAdminRolesList(st.adminRoles));
    }
    applyKey(STORAGE_KEYS.ANALYTICS, st.analytics);

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
    const list: EventItem[] = JSON.parse(raw);
    return list.map((ev) => {
      if (!ev.venueMap) {
        return { ...ev, venueMap: createDefaultVenueMap() };
      }
      return ev;
    });
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

export async function upsertEvent(
  event: EventItem,
  creatorUsername?: string
): Promise<EventItem[]> {
  const current = getEvents();
  const existing = current.find((e) => e.id === event.id);
  const finalEvent: EventItem = {
    ...event,
    createdByUsername:
      event.createdByUsername ||
      existing?.createdByUsername ||
      creatorUsername ||
      undefined,
  };
  const updated = existing
    ? current.map((e) => (e.id === finalEvent.id ? finalEvent : e))
    : [finalEvent, ...current];
  try {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(updated));
  } catch {
    // ignore local quota
  }

  // Si lo creó un usuario no-superadmin, se asegura de asignárselo automáticamente
  if (creatorUsername) {
    const users = getAdminUsers();
    const creator = users.find(
      (u) => u.username.toLowerCase() === creatorUsername.toLowerCase()
    );
    if (creator && creator.role !== "SUPERADMIN") {
      const assigned = new Set(creator.assignedEventIds || []);
      if (!assigned.has(finalEvent.id)) {
        assigned.add(finalEvent.id);
        const updatedUsers = users.map((u) =>
          u.id === creator.id
            ? { ...u, assignedEventIds: Array.from(assigned) }
            : u
        );
        saveAdminUsers(updatedUsers);
      }
    }
  }

  notifyStoreUpdate();
  await pushToCloudStore({ events: updated });

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
  spotId?: string;
  spotName?: string;
  spotPerks?: string;
  sectorName?: string;
  customTotalAmount?: number;
  customUnitPrice?: number;
}): Promise<OrderItem> {
  const matchingSpot = input.spotId
    ? input.event.venueMap?.spots.find((s) => s.id === input.spotId)
    : undefined;

  const tier = matchingSpot
    ? {
        id: matchingSpot.id,
        name: matchingSpot.name,
        price: matchingSpot.price,
        qrCount: matchingSpot.capacity,
      }
    : input.event.ticketTiers.find((t) => t.id === input.tierId) ||
      input.event.ticketTiers[0];

  const qrCountPerUnit = Math.max(1, Number(tier.qrCount) || 1);
  const totalQrCount = matchingSpot
    ? matchingSpot.capacity
    : input.quantity * qrCountPerUnit;
  const unitPrice =
    input.customUnitPrice !== undefined
      ? input.customUnitPrice
      : matchingSpot
        ? matchingSpot.price
        : tier.price;
  const totalAmount =
    input.customTotalAmount !== undefined
      ? input.customTotalAmount
      : matchingSpot
        ? matchingSpot.price
        : tier.price * input.quantity;

  const randomHex = Array.from(
    crypto.getRandomValues(new Uint8Array(4)),
    (b) => b.toString(16).padStart(2, "0")
  )
    .join("")
    .toUpperCase();
  const orderCode = `MAS30-${randomHex}`;

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

  const orderNotes = [
    input.notes?.trim() || "",
    matchingSpot ? `[Mesa / Sector Reservado: ${matchingSpot.name}${matchingSpot.perks ? ` · ${matchingSpot.perks}` : ""}]` : "",
  ]
    .filter(Boolean)
    .join(" ");

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
    tierName: matchingSpot ? `${matchingSpot.name} (${matchingSpot.capacity} accesos)` : tier.name,
    unitPrice,
    quantity: matchingSpot ? 1 : input.quantity,
    qrCountPerUnit,
    totalQrCount,
    totalAmount,
    transferSender: input.transferSender,
    transferReference: input.transferReference,
    notes: orderNotes,
    spotId: matchingSpot ? matchingSpot.id : input.spotId,
    spotName: matchingSpot ? matchingSpot.name : input.spotName,
    spotPerks: matchingSpot ? matchingSpot.perks : input.spotPerks,
    sectorName: matchingSpot ? matchingSpot.sectorName : input.sectorName,
    attendees: normalizedAttendees,
    status: "PENDIENTE",
    createdAt: new Date().toISOString(),
  };

  // Si se reservó una mesa/sector en el mapa, actualizar su estado en el evento
  if (matchingSpot && input.event.venueMap) {
    const updatedSpots = input.event.venueMap.spots.map((s) =>
      s.id === matchingSpot.id
        ? {
            ...s,
            status: "RESERVADO" as const,
            reservedByOrderCode: orderCode,
            reservedByName: input.buyerName,
          }
        : s
    );
    input.event.venueMap.spots = updatedSpots;
    void upsertEvent(input.event);
  }

  const orders = [newOrder, ...getOrders()];
  saveOrders(orders);

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
        spotId: target.spotId,
        spotName: target.spotName,
        spotPerks: target.spotPerks,
        sectorName: target.sectorName,
        holderName: attendee.name,
        holderDni: attendee.dni,
        buyerPhone: target.buyerPhone,
        buyerEmail: target.buyerEmail,
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
    const updatedTiers = ev.ticketTiers.map((tier) =>
      tier.id === target.tierId
        ? { ...tier, sold: tier.sold + target.quantity }
        : tier
    );
    const updatedSpots = ev.venueMap?.spots
      ? ev.venueMap.spots.map((s) =>
          s.id === target.spotId
            ? {
                ...s,
                status: "VENDIDO" as const,
                reservedByOrderCode: target.orderCode,
                reservedByName: target.buyerName,
              }
            : s
        )
      : undefined;

    return {
      ...ev,
      ticketTiers: updatedTiers,
      venueMap: ev.venueMap && updatedSpots ? { ...ev.venueMap, spots: updatedSpots } : ev.venueMap,
    };
  });
  saveEvents(updatedEvents);

  const allTickets = [...newTickets, ...existingTickets];
  saveTickets(allTickets);

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
    customTotalAmount?: number;
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

  const totalAmount = input.isCourtesy
    ? 0
    : input.customTotalAmount !== undefined && input.customTotalAmount >= 0
      ? input.customTotalAmount
      : tier.price * input.quantity;
  const unitPrice = input.quantity > 0 ? Math.round(totalAmount / input.quantity) : totalAmount;

  const createdOrder = await createTransferOrder({
    event,
    tierId: tier.id,
    quantity: input.quantity,
    buyerName: input.holderName,
    buyerDni: input.holderDni,
    buyerEmail: input.buyerEmail?.trim() || (input.isCourtesy ? "cortesia@mas30.com" : "manual@mas30.com"),
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
    customTotalAmount: totalAmount,
    customUnitPrice: unitPrice,
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
        ? { ...o, unitPrice, totalAmount, issueType: "VENTA_MANUAL_ADMIN" as const }
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

export async function updateOrderCustomerData(
  orderId: string,
  data: {
    buyerName?: string;
    buyerPhone?: string;
    buyerEmail?: string;
    buyerDni?: string;
    notes?: string;
    totalAmount?: number;
  }
): Promise<OrderItem> {
  const orders = getOrders();
  const target = orders.find((o) => o.id === orderId || o.orderCode === orderId);
  if (!target) throw new Error("Orden no encontrada");

  const updatedOrder: OrderItem = {
    ...target,
    buyerName: data.buyerName !== undefined ? data.buyerName.trim() : target.buyerName,
    buyerPhone: data.buyerPhone !== undefined ? data.buyerPhone.trim() : target.buyerPhone,
    buyerEmail: data.buyerEmail !== undefined ? data.buyerEmail.trim() : target.buyerEmail,
    buyerDni: data.buyerDni !== undefined ? data.buyerDni.trim() : target.buyerDni,
    notes: data.notes !== undefined ? data.notes.trim() : target.notes,
    totalAmount: data.totalAmount !== undefined ? Number(data.totalAmount) : target.totalAmount,
  };

  const updatedOrders = orders.map((o) => (o.id === target.id ? updatedOrder : o));
  saveOrders(updatedOrders);

  // También actualizar los tickets asociados con los nuevos datos
  const currentTickets = getTickets();
  const updatedTickets = currentTickets.map((t) => {
    if (
      t.orderId === target.id ||
      (t.orderCode && t.orderCode.trim().toUpperCase() === target.orderCode.trim().toUpperCase())
    ) {
      return {
        ...t,
        holderName: data.buyerName && t.ticketNumber === 1 ? data.buyerName.trim() : t.holderName,
        holderDni: data.buyerDni !== undefined ? data.buyerDni.trim() : t.holderDni,
        buyerPhone: data.buyerPhone !== undefined ? data.buyerPhone.trim() : t.buyerPhone,
        buyerEmail: data.buyerEmail !== undefined ? data.buyerEmail.trim() : t.buyerEmail,
      };
    }
    return t;
  });
  saveTickets(updatedTickets);

  return updatedOrder;
}

export async function ensureOrderTickets(orderId: string): Promise<TicketQR[]> {
  const orders = getOrders();
  const target = orders.find((o) => o.id === orderId || o.orderCode === orderId);
  if (!target) return [];
  const existing = getTickets().filter(
    (t) =>
      t.orderId === target.id ||
      (t.orderCode && t.orderCode.trim().toUpperCase() === target.orderCode.trim().toUpperCase())
  );
  if (existing.length > 0) return existing;
  const { generatedTickets } = await approveOrderAndGenerateQRs(target.id);
  return generatedTickets;
}

export async function rejectOrder(orderId: string): Promise<void> {
  const orders = getOrders();
  const target = orders.find((o) => o.id === orderId || o.orderCode === orderId);
  const updated = orders.map((o) =>
    o.id === orderId ? { ...o, status: "RECHAZADA" as const } : o
  );
  saveOrders(updated);

  // Liberar mesa si correspondía
  if (target?.spotId) {
    const events = getEvents();
    const ev = events.find((e) => e.id === target.eventId);
    if (ev?.venueMap?.spots) {
      ev.venueMap.spots = ev.venueMap.spots.map((s) =>
        s.id === target.spotId
          ? {
              ...s,
              status: "DISPONIBLE" as const,
              reservedByOrderCode: undefined,
              reservedByName: undefined,
            }
          : s
      );
      void upsertEvent(ev);
    }
  }
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

    // Liberar mesa si correspondía
    if (target.spotId) {
      const events = getEvents();
      const ev = events.find((e) => e.id === target.eventId);
      if (ev?.venueMap?.spots) {
        ev.venueMap.spots = ev.venueMap.spots.map((s) =>
          s.id === target.spotId
            ? {
                ...s,
                status: "DISPONIBLE" as const,
                reservedByOrderCode: undefined,
                reservedByName: undefined,
              }
            : s
        );
        void upsertEvent(ev);
      }
    }
  }
}

// ==========================================
// FUNCIONES DE GESTIÓN DEL MAPA Y MESAS
// ==========================================

export async function updateEventVenueMap(
  eventId: string,
  venueMap: VenueMapConfig
): Promise<EventItem | undefined> {
  const events = getEvents();
  const ev = events.find((e) => e.id === eventId);
  if (!ev) return undefined;
  const updated: EventItem = { ...ev, venueMap };
  await upsertEvent(updated);
  return updated;
}

export async function updateSpotStatus(
  eventId: string,
  spotId: string,
  status: VenueSpotStatus
): Promise<EventItem | undefined> {
  const events = getEvents();
  const ev = events.find((e) => e.id === eventId);
  if (!ev?.venueMap) return undefined;
  const updatedSpots = (ev.venueMap.spots || []).map((s) =>
    s.id === spotId ? { ...s, status } : s
  );
  const updated: EventItem = {
    ...ev,
    venueMap: { ...ev.venueMap, spots: updatedSpots },
  };
  await upsertEvent(updated);
  return updated;
}

export async function upsertSpot(
  eventId: string,
  spot: VenueSpot
): Promise<EventItem | undefined> {
  const events = getEvents();
  const ev = events.find((e) => e.id === eventId);
  if (!ev) return undefined;
  const vMap: VenueMapConfig = ev.venueMap || createDefaultVenueMap();
  const existingIdx = vMap.spots.findIndex((s) => s.id === spot.id);
  const spots =
    existingIdx >= 0
      ? vMap.spots.map((s, idx) => (idx === existingIdx ? spot : s))
      : [...vMap.spots, spot];
  const updated: EventItem = {
    ...ev,
    venueMap: { ...vMap, spots },
  };
  await upsertEvent(updated);
  return updated;
}

export async function deleteSpot(
  eventId: string,
  spotId: string
): Promise<EventItem | undefined> {
  const events = getEvents();
  const ev = events.find((e) => e.id === eventId);
  if (!ev?.venueMap) return undefined;
  const spots = (ev.venueMap.spots || []).filter((s) => s.id !== spotId);
  const updated: EventItem = {
    ...ev,
    venueMap: { ...ev.venueMap, spots },
  };
  await upsertEvent(updated);
  return updated;
}

export async function upsertSectorLabel(
  eventId: string,
  sector: VenueSectorLabel
): Promise<EventItem | undefined> {
  const events = getEvents();
  const ev = events.find((e) => e.id === eventId);
  if (!ev) return undefined;
  const vMap: VenueMapConfig = ev.venueMap || createDefaultVenueMap();
  const existingIdx = vMap.sectors.findIndex((s) => s.id === sector.id);
  const sectors =
    existingIdx >= 0
      ? vMap.sectors.map((s, idx) => (idx === existingIdx ? sector : s))
      : [...vMap.sectors, sector];
  const updated: EventItem = {
    ...ev,
    venueMap: { ...vMap, sectors },
  };
  await upsertEvent(updated);
  return updated;
}

export async function deleteSectorLabel(
  eventId: string,
  sectorId: string
): Promise<EventItem | undefined> {
  const events = getEvents();
  const ev = events.find((e) => e.id === eventId);
  if (!ev?.venueMap) return undefined;
  const sectors = (ev.venueMap.sectors || []).filter((s) => s.id !== sectorId);
  const updated: EventItem = {
    ...ev,
    venueMap: { ...ev.venueMap, sectors },
  };
  await upsertEvent(updated);
  return updated;
}

export interface ScanValidationResult {
  outcome: "AUTORIZADO" | "YA_USADO" | "NO_ENCONTRADO" | "ANULADO";
  message: string;
  ticket?: TicketQR;
  previousScannedAt?: string;
}

export async function validateAndScanQR(
  rawInput: string,
  operatorName = "Puerta Principal MAS30",
  doorName = "Puerta Principal",
  operatorUsername?: string
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

  if (match.status === "ANULADO" || match.status === "BLOQUEADO") {
    return {
      outcome: "ANULADO",
      message:
        match.status === "BLOQUEADO"
          ? "¡ACCESO DENEGADO! Esta entrada fue BLOQUEADA por la administración."
          : "Esta entrada fue ANULADA por la administración.",
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
    scannedByName: operatorName,
    scannedByUsername: operatorUsername,
    scannedDoor: doorName,
  };

  const updatedList = tickets.map((t) =>
    t.id === match.id ? updatedTicket : t
  );
  saveTickets(updatedList);

  return {
    outcome: "AUTORIZADO",
    message: "ACCESO AUTORIZADO · Entrada válida y registrada en puerta.",
    ticket: updatedTicket,
  };
}

export async function updateTicketStatus(
  ticketId: string,
  newStatus: "VALIDO" | "USADO" | "BLOQUEADO" | "ANULADO",
  operatorName = "Administración MAS30",
  doorName = "Panel Admin",
  operatorUsername?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const updated = getTickets().map((t) => {
    if (t.id !== ticketId) return t;
    if (newStatus === "VALIDO") {
      return {
        ...t,
        status: "VALIDO" as const,
        scannedAt: undefined,
        scannedBy: undefined,
        scannedByName: undefined,
        scannedByUsername: undefined,
        scannedDoor: undefined,
      };
    }
    if (newStatus === "USADO") {
      return {
        ...t,
        status: "USADO" as const,
        scannedAt: t.scannedAt || nowIso,
        scannedBy: t.scannedBy || operatorName,
        scannedByName: t.scannedByName || operatorName,
        scannedByUsername: t.scannedByUsername || operatorUsername,
        scannedDoor: t.scannedDoor || doorName,
      };
    }
    return {
      ...t,
      status: newStatus,
    };
  });
  saveTickets(updated);
}

export async function deleteSingleTicket(ticketId: string): Promise<void> {
  const current = getTickets();
  const updated = current.filter((t) => t.id !== ticketId);
  saveTickets(updated);
}

export async function resetTicketScanStatus(ticketId: string): Promise<void> {
  return updateTicketStatus(ticketId, "VALIDO");
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
}

export async function upsertInquiry(item: InquiryItem): Promise<InquiryItem[]> {
  const current = getInquiries();
  const exists = current.some((i) => i.id === item.id);
  const updated = exists
    ? current.map((i) => (i.id === item.id ? item : i))
    : [item, ...current];
  saveInquiries(updated);

  return updated;
}

export async function deleteInquiry(inquiryId: string): Promise<InquiryItem[]> {
  const updated = getInquiries().filter((i) => i.id !== inquiryId);
  saveInquiries(updated);

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

function normalizeAdminRolesList(
  rawRoles: AdminRoleDefinition[]
): AdminRoleDefinition[] {
  const map = new Map<string, AdminRoleDefinition>();
  for (const r of INITIAL_ADMIN_ROLES) {
    map.set(r.name, r);
  }
  if (Array.isArray(rawRoles)) {
    for (const r of rawRoles) {
      if (r && r.name) {
        if (r.name === "SUPERADMIN") {
          map.set("SUPERADMIN", INITIAL_ADMIN_ROLES[0]);
        } else {
          map.set(r.name, r);
        }
      }
    }
  }
  return Array.from(map.values());
}

function normalizeAdminUsersList(rawUsers: AdminUser[]): AdminUser[] {
  const list: AdminUser[] = Array.isArray(rawUsers)
    ? rawUsers.map((u) => {
        let role = u.role || "ADMIN";
        if (role === "ADMIN_GENERAL") role = "ADMIN";
        if (role === "PUERTA") role = "LECTOR_QR";
        return {
          ...u,
          role,
          assignedEventIds: Array.isArray(u.assignedEventIds)
            ? u.assignedEventIds
            : u.username === "admin"
            ? ["evt-halloween-3110"]
            : u.role === "PUERTA" || role === "LECTOR_QR"
            ? [
                "evt-halloween-3110",
                "evt-pena-mastreinta-0612",
                "evt-byebye-2026-2612",
                "evt-fiesta-calor-0901",
              ]
            : ["evt-halloween-3110"],
        };
      })
    : [];

  // Garantizar que superadmin y lector siempre existan
  if (!list.some((u) => u.username.toLowerCase() === "superadmin")) {
    list.unshift(INITIAL_ADMIN_USERS[0]);
  }
  if (!list.some((u) => u.username.toLowerCase() === "lector")) {
    const lectorDefault = INITIAL_ADMIN_USERS.find(
      (u) => u.username === "lector"
    );
    if (lectorDefault) list.push(lectorDefault);
  }
  return list;
}

export function getAdminRoles(): AdminRoleDefinition[] {
  if (typeof window === "undefined") return INITIAL_ADMIN_ROLES;
  ensureCloudSyncStarted();
  const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_ROLES);
  if (!raw) {
    localStorage.setItem(
      STORAGE_KEYS.ADMIN_ROLES,
      JSON.stringify(INITIAL_ADMIN_ROLES)
    );
    return INITIAL_ADMIN_ROLES;
  }
  try {
    return normalizeAdminRolesList(JSON.parse(raw));
  } catch {
    return INITIAL_ADMIN_ROLES;
  }
}

export function saveAdminRoles(roles: AdminRoleDefinition[]): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeAdminRolesList(roles);
  localStorage.setItem(STORAGE_KEYS.ADMIN_ROLES, JSON.stringify(normalized));
  notifyStoreUpdate();
  void pushToCloudStore({ adminRoles: normalized });
}

export function upsertAdminRole(
  roleDef: AdminRoleDefinition
): AdminRoleDefinition[] {
  const current = getAdminRoles();
  const cleanName = roleDef.name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_");
  const finalRole: AdminRoleDefinition = {
    ...roleDef,
    name: cleanName,
  };
  const exists = current.some(
    (r) => r.id === finalRole.id || r.name === finalRole.name
  );
  const updated = exists
    ? current.map((r) =>
        r.id === finalRole.id || r.name === finalRole.name ? finalRole : r
      )
    : [...current, finalRole];
  saveAdminRoles(updated);
  return updated;
}

export function deleteAdminRole(roleId: string): AdminRoleDefinition[] {
  const current = getAdminRoles();
  const target = current.find((r) => r.id === roleId);
  if (!target || target.isSystem || target.name === "SUPERADMIN") {
    return current;
  }
  const updated = current.filter((r) => r.id !== roleId);
  saveAdminRoles(updated);
  return updated;
}

export function isSuperAdminUser(
  user: AdminUser | null | undefined
): boolean {
  return Boolean(user && user.role === "SUPERADMIN");
}

export function getUserPermissions(
  user: AdminUser | null | undefined
): RolePermissions {
  const noPerms: RolePermissions = {
    canViewOrders: false,
    canApproveOrders: false,
    canIssueManualQR: false,
    canManageEvents: false,
    canDeleteEvents: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canViewTickets: false,
    canViewRendicion: false,
    canManageInquiries: false,
    canManageSettings: false,
    canUseScanner: false,
    scannerOnly: false,
    canResetScannedQR: false,
  };
  if (!user || !user.active) return noPerms;
  if (user.role === "SUPERADMIN") {
    return INITIAL_ADMIN_ROLES[0].permissions;
  }
  const roles = getAdminRoles();
  const foundRole =
    roles.find((r) => r.name === user.role) ||
    INITIAL_ADMIN_ROLES.find((r) => r.name === "ADMIN")!;
  return {
    ...foundRole.permissions,
    ...(user.customPermissions || {}),
  };
}

export function canUserAccessEvent(
  user: AdminUser | null | undefined,
  event: EventItem
): boolean {
  if (!user || !user.active) return false;
  if (isSuperAdminUser(user)) return true;
  const isCreator = Boolean(
    event.createdByUsername &&
      event.createdByUsername.trim().toLowerCase() ===
        user.username.trim().toLowerCase()
  );
  const assigned = Array.isArray(user.assignedEventIds)
    ? user.assignedEventIds
    : [];
  return isCreator || assigned.includes(event.id);
}

export function getAdminUsers(): AdminUser[] {
  if (typeof window === "undefined") return INITIAL_ADMIN_USERS;
  ensureCloudSyncStarted();
  const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_USERS);
  if (!raw) {
    localStorage.setItem(
      STORAGE_KEYS.ADMIN_USERS,
      JSON.stringify(INITIAL_ADMIN_USERS)
    );
    return INITIAL_ADMIN_USERS;
  }
  try {
    return normalizeAdminUsersList(JSON.parse(raw));
  } catch {
    return INITIAL_ADMIN_USERS;
  }
}

export function saveAdminUsers(users: AdminUser[]): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeAdminUsersList(users);
  localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(normalized));
  notifyStoreUpdate();
  void pushToCloudStore({ adminUsers: normalized });
}

export function upsertAdminUser(user: AdminUser): AdminUser[] {
  const current = getAdminUsers();
  const exists = current.some(
    (u) =>
      u.id === user.id ||
      u.username.trim().toLowerCase() === user.username.trim().toLowerCase()
  );
  const updated = exists
    ? current.map((u) =>
        u.id === user.id ||
        u.username.trim().toLowerCase() === user.username.trim().toLowerCase()
          ? user
          : u
      )
    : [...current, user];
  saveAdminUsers(updated);
  return updated;
}

export function deleteAdminUser(userId: string): AdminUser[] {
  const current = getAdminUsers();
  const target = current.find((u) => u.id === userId);
  if (!target || target.username.toLowerCase() === "superadmin") {
    return current;
  }
  const updated = current.filter((u) => u.id !== userId);
  saveAdminUsers(updated);
  return updated;
}

export function getCurrentAdminSession(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
  if (!raw) return null;
  try {
    const sessionUser = JSON.parse(raw) as AdminUser;
    const latestUsers = getAdminUsers();
    const fresh = latestUsers.find(
      (u) =>
        u.id === sessionUser.id ||
        u.username.toLowerCase() === sessionUser.username.toLowerCase()
    );
    return fresh && fresh.active ? fresh : sessionUser;
  } catch {
    return null;
  }
}

/** Inicia sesión contra el servidor (cookie HttpOnly). Devuelve el usuario o un mensaje de error. */
export async function loginAdminUser(
  usernameInput: string,
  passwordInput: string
): Promise<{ user: AdminUser | null; error?: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        username: usernameInput.trim(),
        password: passwordInput,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.user) {
      return { user: null, error: data.error || "Usuario o contraseña incorrectos" };
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(data.user));
      notifyStoreUpdate();
      void syncFromCloudStore();
    }
    return { user: data.user as AdminUser };
  } catch {
    return { user: null, error: "No se pudo conectar con el servidor" };
  }
}

export function logoutAdminUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
  void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
  notifyStoreUpdate();
}
export function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const INITIAL_ANALYTICS: SiteAnalytics = {
  totalSiteVisits: 0,
  uniqueVisitors: 0,
  totalWhatsappClicks: 0,
  dailyVisits: {},
  eventStats: {},
};

export function getAnalytics(): SiteAnalytics {
  if (typeof window === "undefined") return INITIAL_ANALYTICS;
  ensureCloudSyncStarted();
  const raw = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
  if (!raw) return INITIAL_ANALYTICS;
  try {
    const parsed = JSON.parse(raw);
    const eventStats: Record<string, EventAnalyticsItem> = {};
    if (parsed?.eventStats && typeof parsed.eventStats === "object") {
      for (const [key, val] of Object.entries(parsed.eventStats)) {
        const item = val as Partial<EventAnalyticsItem> | undefined;
        eventStats[key] = {
          views: Number(item?.views) || 0,
          modalOpens: Number(item?.modalOpens) || 0,
          pageViews: Number(item?.pageViews) || 0,
          whatsappClicks: Number(item?.whatsappClicks) || 0,
          lastVisitedAt: item?.lastVisitedAt,
          dailyVisits:
            item?.dailyVisits && typeof item.dailyVisits === "object"
              ? item.dailyVisits
              : {},
        };
      }
    }
    return {
      totalSiteVisits: Number(parsed?.totalSiteVisits) || 0,
      uniqueVisitors: Number(parsed?.uniqueVisitors) || 0,
      totalWhatsappClicks: Number(parsed?.totalWhatsappClicks) || 0,
      dailyVisits: parsed?.dailyVisits || {},
      eventStats,
      updatedAt: parsed?.updatedAt,
    };
  } catch {
    return INITIAL_ANALYTICS;
  }
}

export async function trackVisit(
  type: "site" | "event_modal" | "event_page" | "whatsapp_click",
  eventId?: string
): Promise<void> {
  if (typeof window === "undefined") return;

  // Evitar duplicados por React StrictMode en la misma carga (ventana de 1.5s)
  const dedupeKey = `mas30_track_${type}_${eventId || "global"}`;
  const lastTs = Number(sessionStorage.getItem(dedupeKey) || "0");
  const nowMs = Date.now();
  if (nowMs - lastTs < 1500) return;
  sessionStorage.setItem(dedupeKey, String(nowMs));

  let isNewVisitor = false;
  if (!localStorage.getItem(STORAGE_KEYS.VISITOR_KNOWN)) {
    localStorage.setItem(STORAGE_KEYS.VISITOR_KNOWN, "1");
    isNewVisitor = true;
  }

  // Actualizar optimistamente en localStorage respetando la zona horaria de Buenos Aires
  const current = getAnalytics();
  const nowIso = new Date().toISOString();
  const todayKey = getArgentinaDateKey();
  const dailyVisits = { ...current.dailyVisits };
  const eventStats = { ...current.eventStats };

  let totalSiteVisits = current.totalSiteVisits;
  let uniqueVisitors = current.uniqueVisitors + (isNewVisitor ? 1 : 0);
  let totalWhatsappClicks = current.totalWhatsappClicks;

  if (type === "site") {
    totalSiteVisits += 1;
    dailyVisits[todayKey] = (dailyVisits[todayKey] || 0) + 1;
  } else if (type === "event_modal" && eventId) {
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
  } else if (type === "event_page" && eventId) {
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
  } else if (type === "whatsapp_click") {
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

  const nextLocal: SiteAnalytics = {
    totalSiteVisits,
    uniqueVisitors,
    totalWhatsappClicks,
    dailyVisits,
    eventStats,
    updatedAt: nowIso,
  };

  try {
    localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(nextLocal));
    notifyStoreUpdate();
  } catch {
    // ignore
  }

  // Persistir en Supabase Cloud con la fecha de Buenos Aires
  try {
    const res = await fetch("/api/cloud-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "track_visit",
        type,
        eventId,
        isNewVisitor,
        todayKey,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.analytics) {
        localStorage.setItem(
          STORAGE_KEYS.ANALYTICS,
          JSON.stringify(data.analytics)
        );
        notifyStoreUpdate();
      }
    }
  } catch {
    // ignore network error
  }
}

export async function resetAnalytics(): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEYS.ANALYTICS,
    JSON.stringify(INITIAL_ANALYTICS)
  );
  notifyStoreUpdate();
  try {
    await fetch("/api/cloud-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_analytics" }),
    });
  } catch {
    // ignore
  }
}



