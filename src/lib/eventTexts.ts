import type { EventItem } from "./types";

/**
 * Textos por defecto de la página/modal del evento.
 * Todos se pueden sobrescribir desde el admin (Eventos → Textos de la página del evento).
 * Variables disponibles: {precio}, {evento}, {fecha}
 */
export const EVENT_TEXT_DEFAULTS = {
  headerLabel: "MAS30",
  ageRestriction:
    "Evento exclusivo para mayores de 30 años. Ingreso con DNI físico.",
  ticketInfoText:
    "Entradas desde {precio} por transferencia. Al autorizarse tu pago recibís un QR individual por cada entrada.",
  checkoutNote:
    "Pago por transferencia · El administrador autoriza y emite 1 QR por entrada",
  whatsappMessage:
    "¡Hola MAS30! Quiero hacer una consulta / comprar entradas para el evento *{evento}* ({fecha}).",
  whatsappLabel: "WhatsApp Organizador (Consultas & Tickets)",
  instagramLabel: "Instagram Oficial",
  tiktokLabel: "Red Social / Video",
} as const;

export type EventTextKey = keyof typeof EVENT_TEXT_DEFAULTS;

/**
 * Devuelve el texto configurado en el evento o el valor por defecto si nunca se configuró.
 * Si el admin lo dejó vacío a propósito devuelve "" (para ocultarlo),
 * salvo en los textos de botones, que siempre necesitan un texto.
 */
export function getEventText(event: EventItem, key: EventTextKey): string {
  const value = event[key];
  if (typeof value !== "string") return EVENT_TEXT_DEFAULTS[key];
  const isButtonLabel = key.endsWith("Label") && key !== "headerLabel";
  if (isButtonLabel && value.trim() === "") return EVENT_TEXT_DEFAULTS[key];
  return value;
}

export function getMinPrice(event: EventItem): number {
  const prices = event.ticketTiers.map((t) => t.price);
  return prices.length ? Math.min(...prices) : 0;
}

/** Reemplaza {evento} y {fecha} (y opcionalmente {precio}) en un texto. */
export function fillEventTemplate(
  text: string,
  event: EventItem,
  price?: string
): string {
  return text
    .replace(/\{evento\}/gi, event.title)
    .replace(/\{fecha\}/gi, event.dateLabel)
    .replace(/\{precio\}/gi, price ?? "{precio}");
}

/** Construye el link embebido de Google Maps del evento. */
export function buildMapEmbedUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}
