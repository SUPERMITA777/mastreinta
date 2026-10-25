import fs from "fs";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env", ".env.local"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

const BUCKET = "mas30-private";
const FILE = "mas30-state-v1.json";

const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
if (error || !data) {
  console.error("No se pudo descargar el estado:", error);
  process.exit(1);
}

const state = JSON.parse(await data.text());
if (!Array.isArray(state.orders)) state.orders = [];
if (!Array.isArray(state.tickets)) state.tickets = [];

const targetOrder = state.orders.find(
  (o) => o.orderCode === "MAS30-1824" || (o.orderCode && o.orderCode.trim().toUpperCase() === "MAS30-1824")
);

if (!targetOrder) {
  console.error("No se encontró la orden MAS30-1824 en el estado privado.");
  process.exit(1);
}

console.log("Orden encontrada:", targetOrder.orderCode, targetOrder.buyerName, "ID:", targetOrder.id);

const expectedCodes = [
  { num: 1, code: "UPEE", name: "Gabriela Sotelo" },
  { num: 2, code: "WJHX", name: "Gabriela Sotelo (Acceso #2)" },
  { num: 3, code: "PJTB", name: "Gabriela Sotelo (Acceso #3)" },
  { num: 4, code: "DNCN", name: "Gabriela Sotelo (Acceso #4)" },
];

// Remover tickets anteriores para esta orden si existieran
state.tickets = state.tickets.filter(
  (t) => t.orderCode !== targetOrder.orderCode && t.orderId !== targetOrder.id
);

const nowIso = new Date().toISOString();
const newTickets = expectedCodes.map(({ num, code, name }) => ({
  id: `tkt-${targetOrder.id}-${num}`,
  qrCode: `MAS30|TKT|${code}|${targetOrder.orderCode}|${num}`,
  shortCode: code,
  orderId: targetOrder.id,
  orderCode: targetOrder.orderCode,
  eventId: targetOrder.eventId,
  eventTitle: targetOrder.eventTitle,
  eventDateLabel: targetOrder.eventDateLabel,
  eventTime: targetOrder.eventTime,
  eventVenue: targetOrder.eventVenue,
  tierName: targetOrder.tierName,
  spotId: targetOrder.spotId,
  spotName: targetOrder.spotName,
  spotPerks: targetOrder.spotPerks,
  sectorName: targetOrder.sectorName,
  holderName: name,
  holderDni: targetOrder.buyerDni || "",
  buyerPhone: targetOrder.buyerPhone || "",
  buyerEmail: targetOrder.buyerEmail || "",
  ticketNumber: num,
  totalInOrder: 4,
  unitPrice: targetOrder.unitPrice || Math.round((targetOrder.totalAmount || 25000) / 4),
  generatedByUsername: targetOrder.approvedByUsername || "superadmin",
  generatedByName: targetOrder.approvedByName || "Superadministrador MASTREINTA",
  status: "VALIDO",
  createdAt: targetOrder.approvedAt || nowIso,
}));

state.tickets.push(...newTickets);
targetOrder.status = "APROBADA";
targetOrder.totalQrCount = 4;

const up = await supabase.storage.from(BUCKET).upload(FILE, Buffer.from(JSON.stringify(state)), {
  contentType: "application/json",
  upsert: true,
  cacheControl: "0",
});

if (up.error) {
  console.error("Error al subir el estado actualizado:", up.error);
  process.exit(1);
}

console.log("¡Éxito! 4 tickets creados/actualizados para MAS30-1824 con los códigos exactos:");
newTickets.forEach((t) => console.log(`• #${t.ticketNumber}: ${t.holderName} -> Código: ${t.shortCode} (${t.qrCode})`));
