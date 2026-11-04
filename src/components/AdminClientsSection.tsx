"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  QrCode,
  Search,
  ShoppingBag,
  Sparkles,
  Ticket,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { EventItem, OrderItem, TicketQR } from "@/lib/types";
import { formatARS } from "@/lib/store";

/* ------------------------------------------------------------------ */
/* Modelos                                                            */
/* ------------------------------------------------------------------ */

export interface ClientRecord {
  id: string;
  name: string;
  dni: string;
  email: string;
  phone: string;
  cleanPhone: string;
  firstOrderDate: string;
  lastOrderDate: string;
  ordersCount: number;
  approvedOrdersCount: number;
  pendingOrdersCount: number;
  rejectedOrdersCount: number;
  totalSpent: number;
  totalTicketsCount: number;
  events: Array<{
    id: string;
    title: string;
    dateLabel?: string;
  }>;
  orders: OrderItem[];
  tickets: TicketQR[];
}

interface AdminClientsSectionProps {
  orders: OrderItem[];
  tickets: TicketQR[];
  events: EventItem[];
  selectedEventId?: string | null;
  onSendOrderEmail?: (
    order: OrderItem,
    orderTickets: TicketQR[],
    overrideEmail?: string
  ) => Promise<void>;
  onApproveOrder?: (orderId: string) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Helpers de Normalización y Contacto                                 */
/* ------------------------------------------------------------------ */

function cleanWhatsAppNumber(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return `549${digits.slice(2)}`;
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("15") && digits.length >= 10) digits = digits.slice(2);
  if (digits.length === 10) return `549${digits}`; // ej 1123456789 -> 5491123456789
  return digits;
}

function normalizeDni(dni?: string): string {
  if (!dni) return "";
  return dni.replace(/\D/g, "");
}

function normalizeEmail(email?: string): string {
  if (!email) return "";
  const e = email.trim().toLowerCase();
  if (
    e.includes("cortesia@") ||
    e.includes("manual@") ||
    e.endsWith("@example.com")
  ) {
    return "";
  }
  return e;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} ${d.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    })} hs`;
  } catch {
    return iso;
  }
}

function getInitials(name: string): string {
  if (!name) return "CL";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "from-[#ffb5d7]/30 to-[#AF2C75]/40 text-[#ffb5d7] border-[#ffb5d7]/40",
  "from-emerald-500/20 to-teal-700/30 text-emerald-300 border-emerald-500/40",
  "from-violet-500/20 to-purple-700/30 text-violet-300 border-violet-500/40",
  "from-amber-500/20 to-orange-700/30 text-amber-300 border-amber-500/40",
  "from-cyan-500/20 to-blue-700/30 text-cyan-300 border-cyan-500/40",
  "from-rose-500/20 to-pink-700/30 text-rose-300 border-rose-500/40",
];

function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

/* ------------------------------------------------------------------ */
/* Componente Principal                                                */
/* ------------------------------------------------------------------ */

export default function AdminClientsSection({
  orders,
  tickets,
  events,
  selectedEventId,
  onSendOrderEmail,
  onApproveOrder,
}: AdminClientsSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState<string>(
    selectedEventId || "__ALL__"
  );
  const [segmentFilter, setSegmentFilter] = useState<
    "ALL" | "RECURRENTES" | "APROBADAS" | "PENDIENTES"
  >("ALL");
  const [sortBy, setSortBy] = useState<
    "RECENT" | "SPENT_DESC" | "TICKETS_DESC" | "NAME_ASC"
  >("RECENT");

  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    if (!text || typeof navigator === "undefined") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  /* ------------------------------------------------------------------ */
  /* Agregación de Clientes                                              */
  /* ------------------------------------------------------------------ */
  const allClients = useMemo(() => {
    const clientsMap = new Map<string, ClientRecord>();
    const dniIndex = new Map<string, string>(); // dni -> clientId
    const emailIndex = new Map<string, string>(); // email -> clientId
    const phoneIndex = new Map<string, string>(); // phone -> clientId
    const nameIndex = new Map<string, string>(); // name -> clientId

    const sortedOrders = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    for (const order of sortedOrders) {
      const buyerName = String(order.buyerName || "").trim();
      const buyerDni = normalizeDni(order.buyerDni);
      const buyerEmail = normalizeEmail(order.buyerEmail);
      const cleanPhone = cleanWhatsAppNumber(order.buyerPhone || "");
      const normalizedName = buyerName.toLowerCase();

      // Buscar si este comprador ya existe por DNI, email, teléfono o nombre
      let clientId: string | undefined;

      if (buyerDni && buyerDni.length >= 6 && dniIndex.has(buyerDni)) {
        clientId = dniIndex.get(buyerDni);
      } else if (buyerEmail && emailIndex.has(buyerEmail)) {
        clientId = emailIndex.get(buyerEmail);
      } else if (cleanPhone && cleanPhone.length >= 8 && phoneIndex.has(cleanPhone)) {
        clientId = phoneIndex.get(cleanPhone);
      } else if (
        normalizedName.length >= 5 &&
        normalizedName.includes(" ") &&
        nameIndex.has(normalizedName)
      ) {
        clientId = nameIndex.get(normalizedName);
      }

      if (!clientId) {
        // Crear nuevo cliente
        clientId = `cli-${order.id}-${Math.random().toString(36).slice(2, 6)}`;
        const newRecord: ClientRecord = {
          id: clientId,
          name: buyerName || "Cliente sin nombre",
          dni: order.buyerDni || "",
          email: order.buyerEmail || "",
          phone: order.buyerPhone || "",
          cleanPhone,
          firstOrderDate: order.createdAt,
          lastOrderDate: order.createdAt,
          ordersCount: 0,
          approvedOrdersCount: 0,
          pendingOrdersCount: 0,
          rejectedOrdersCount: 0,
          totalSpent: 0,
          totalTicketsCount: 0,
          events: [],
          orders: [],
          tickets: [],
        };
        clientsMap.set(clientId, newRecord);
      }

      const client = clientsMap.get(clientId)!;

      // Actualizar datos si la orden actual tiene datos más completos
      if (!client.dni && order.buyerDni) client.dni = order.buyerDni;
      if (
        (!client.email ||
          client.email.includes("cortesia@") ||
          client.email.includes("manual@")) &&
        order.buyerEmail
      ) {
        client.email = order.buyerEmail;
      }
      if (!client.phone && order.buyerPhone) {
        client.phone = order.buyerPhone;
        client.cleanPhone = cleanWhatsAppNumber(order.buyerPhone);
      }
      if (
        (!client.name || client.name.length < buyerName.length) &&
        buyerName
      ) {
        client.name = buyerName;
      }

      // Asociar la orden
      client.orders.push(order);

      // Indexar para próximas órdenes del mismo cliente
      if (buyerDni && buyerDni.length >= 6) dniIndex.set(buyerDni, clientId);
      if (buyerEmail) emailIndex.set(buyerEmail, clientId);
      if (cleanPhone && cleanPhone.length >= 8) phoneIndex.set(cleanPhone, clientId);
      if (normalizedName.length >= 5) nameIndex.set(normalizedName, clientId);
    }

    // Indexar tickets por orden para vincularlos rápidamente
    const ticketsByOrder = new Map<string, TicketQR[]>();
    for (const t of tickets) {
      const key = t.orderId || t.orderCode;
      if (!ticketsByOrder.has(key)) ticketsByOrder.set(key, []);
      ticketsByOrder.get(key)!.push(t);
      if (t.orderCode && t.orderCode !== key) {
        if (!ticketsByOrder.has(t.orderCode)) ticketsByOrder.set(t.orderCode, []);
        ticketsByOrder.get(t.orderCode)!.push(t);
      }
    }

    // Calcular estadísticas de cada cliente
    const clientsList = Array.from(clientsMap.values());
    for (const c of clientsList) {
      c.ordersCount = c.orders.length;
      c.approvedOrdersCount = c.orders.filter(
        (o) => o.status === "APROBADA"
      ).length;
      c.pendingOrdersCount = c.orders.filter(
        (o) => o.status === "PENDIENTE"
      ).length;
      c.rejectedOrdersCount = c.orders.filter(
        (o) => o.status === "RECHAZADA"
      ).length;

      // Dinero y entradas acumuladas solo de compras aprobadas
      c.totalSpent = c.orders
        .filter((o) => o.status === "APROBADA")
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      c.totalTicketsCount = c.orders
        .filter((o) => o.status === "APROBADA")
        .reduce((sum, o) => sum + (o.totalQrCount || o.quantity || 1), 0);

      // Fechas
      const dates = c.orders
        .map((o) => new Date(o.createdAt).getTime())
        .filter((t) => !isNaN(t));
      if (dates.length > 0) {
        c.firstOrderDate = new Date(Math.min(...dates)).toISOString();
        c.lastOrderDate = new Date(Math.max(...dates)).toISOString();
      }

      // Eventos únicos
      const evMap = new Map<string, { id: string; title: string; dateLabel?: string }>();
      for (const o of c.orders) {
        if (!evMap.has(o.eventId)) {
          evMap.set(o.eventId, {
            id: o.eventId,
            title: o.eventTitle || "Evento",
            dateLabel: o.eventDateLabel,
          });
        }
      }
      c.events = Array.from(evMap.values());

      // Vincular tickets
      const allClientTickets: TicketQR[] = [];
      const seenTicketIds = new Set<string>();
      for (const o of c.orders) {
        const found = [
          ...(ticketsByOrder.get(o.id) || []),
          ...(ticketsByOrder.get(o.orderCode) || []),
        ];
        for (const tk of found) {
          if (!seenTicketIds.has(tk.id)) {
            seenTicketIds.add(tk.id);
            allClientTickets.push(tk);
          }
        }
      }
      c.tickets = allClientTickets;
    }

    return clientsList;
  }, [orders, tickets]);

  /* ------------------------------------------------------------------ */
  /* Filtrado y Ordenamiento                                             */
  /* ------------------------------------------------------------------ */
  const filteredClients = useMemo(() => {
    let list = [...allClients];

    // Filtro por evento
    if (eventFilter !== "__ALL__") {
      list = list.filter((c) =>
        c.orders.some((o) => o.eventId === eventFilter)
      );
    }

    // Filtro por segmento
    if (segmentFilter === "RECURRENTES") {
      list = list.filter((c) => c.ordersCount >= 2);
    } else if (segmentFilter === "APROBADAS") {
      list = list.filter((c) => c.approvedOrdersCount > 0);
    } else if (segmentFilter === "PENDIENTES") {
      list = list.filter((c) => c.pendingOrdersCount > 0);
    }

    // Búsqueda por texto (nombre, DNI, email, teléfono, código de orden)
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const qDigits = q.replace(/\D/g, "");
      list = list.filter((c) => {
        const matchName = c.name.toLowerCase().includes(q);
        const matchEmail = c.email.toLowerCase().includes(q);
        const matchDni = qDigits && normalizeDni(c.dni).includes(qDigits);
        const matchPhone = qDigits && c.cleanPhone.includes(qDigits);
        const matchOrder = c.orders.some((o) =>
          o.orderCode.toLowerCase().includes(q)
        );
        return matchName || matchEmail || matchDni || matchPhone || matchOrder;
      });
    }

    // Ordenamiento
    list.sort((a, b) => {
      if (sortBy === "RECENT") {
        return (
          new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
        );
      }
      if (sortBy === "SPENT_DESC") {
        return b.totalSpent - a.totalSpent;
      }
      if (sortBy === "TICKETS_DESC") {
        return b.totalTicketsCount - a.totalTicketsCount;
      }
      if (sortBy === "NAME_ASC") {
        return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      }
      return 0;
    });

    return list;
  }, [allClients, eventFilter, segmentFilter, searchTerm, sortBy]);

  /* ------------------------------------------------------------------ */
  /* Métricas Globales de Clientes                                      */
  /* ------------------------------------------------------------------ */
  const totalUniqueClients = allClients.length;
  const recurringClientsCount = allClients.filter((c) => c.ordersCount >= 2).length;
  const totalRevenue = allClients.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalTicketsIssued = allClients.reduce(
    (sum, c) => sum + c.totalTicketsCount,
    0
  );

  /* ------------------------------------------------------------------ */
  /* Exportación a CSV                                                  */
  /* ------------------------------------------------------------------ */
  const exportClientsCsv = () => {
    const headers = [
      "Nombre",
      "DNI",
      "Email",
      "Telefono",
      "WhatsApp_Directo",
      "Compras_Totales",
      "Compras_Autorizadas",
      "Entradas_Totales",
      "Total_Gastado_ARS",
      "Primer_Contacto",
      "Ultima_Compra",
      "Ultimo_Evento",
    ];

    const rows = filteredClients.map((c) => {
      const lastOrder = c.orders[0];
      const waLink = c.cleanPhone ? `https://wa.me/${c.cleanPhone}` : "";
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.dni || ""}"`,
        `"${c.email || ""}"`,
        `"${c.phone || ""}"`,
        `"${waLink}"`,
        c.ordersCount,
        c.approvedOrdersCount,
        c.totalTicketsCount,
        c.totalSpent,
        `"${formatDate(c.firstOrderDate)}"`,
        `"${formatDate(c.lastOrderDate)}"`,
        `"${(lastOrder?.eventTitle || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    // \uFEFF añade BOM UTF-8 para que Excel abra acentos y ñ correctamente
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `clientes-mas30-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* HEADER Y KPIS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <UserCheck className="w-6 h-6 text-[#ffb5d7]" />
              <span>Base de Clientes</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ffb5d7]/20 border border-[#ffb5d7]/40 text-[#ffb5d7] font-semibold">
              {totalUniqueClients} registrados
            </span>
          </div>
          <p className="text-xs text-[#8a8a8a] mt-1">
            Directorio consolidado de compradores con historial de pedidos,
            contactos y accesos QR emitidos.
          </p>
        </div>

        <button
          type="button"
          onClick={exportClientsCsv}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-white border border-[#353535] text-xs font-semibold transition-colors cursor-pointer self-start lg:self-center"
          title="Exportar listado a Excel / CSV"
        >
          <Download className="w-4 h-4 text-[#ffb5d7]" />
          <span>Exportar Directorio (CSV)</span>
        </button>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#181818] border border-[#2e2e2e]">
          <div className="flex items-center justify-between text-xs text-[#8a8a8a] mb-1">
            <span>Total Clientes</span>
            <Users className="w-4 h-4 text-[#ffb5d7]" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">
            {totalUniqueClients}
          </p>
          <p className="text-[11px] text-[#8a8a8a] mt-0.5">
            Compradores registrados
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#181818] border border-[#2e2e2e]">
          <div className="flex items-center justify-between text-xs text-[#8a8a8a] mb-1">
            <span>Recurrentes (2+ compras)</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400">
            {recurringClientsCount}
          </p>
          <p className="text-[11px] text-[#8a8a8a] mt-0.5">
            {totalUniqueClients > 0
              ? `${Math.round((recurringClientsCount / totalUniqueClients) * 100)}% de fidelidad`
              : "0%"}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#181818] border border-[#2e2e2e]">
          <div className="flex items-center justify-between text-xs text-[#8a8a8a] mb-1">
            <span>Entradas Adquiridas</span>
            <Ticket className="w-4 h-4 text-[#ffb5d7]" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">
            {totalTicketsIssued}
          </p>
          <p className="text-[11px] text-[#8a8a8a] mt-0.5">
            QRs y tickets autorizados
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#181818] border border-[#2e2e2e]">
          <div className="flex items-center justify-between text-xs text-[#8a8a8a] mb-1">
            <span>Facturación Acumulada</span>
            <Wallet className="w-4 h-4 text-[#ffb5d7]" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#ffb5d7]">
            {formatARS(totalRevenue)}
          </p>
          <p className="text-[11px] text-[#8a8a8a] mt-0.5">
            Ventas aprobadas en total
          </p>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS: BÚSQUEDA Y FILTROS */}
      <div className="p-4 rounded-xl bg-[#181818] border border-[#2e2e2e] space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a8a]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, DNI, email, teléfono o #orden..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#121212] border border-[#353535] text-xs text-white placeholder-[#6a6a6a] outline-none focus:border-[#ffb5d7]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a8a8a] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Evento */}
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#121212] border border-[#353535] text-xs text-white outline-none focus:border-[#ffb5d7]"
          >
            <option value="__ALL__">Todos los eventos</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({ev.dateLabel})
              </option>
            ))}
          </select>

          {/* Filtro por Segmento */}
          <select
            value={segmentFilter}
            onChange={(e) =>
              setSegmentFilter(
                e.target.value as "ALL" | "RECURRENTES" | "APROBADAS" | "PENDIENTES"
              )
            }
            className="px-3 py-2 rounded-lg bg-[#121212] border border-[#353535] text-xs text-white outline-none focus:border-[#ffb5d7]"
          >
            <option value="ALL">Todos los clientes</option>
            <option value="RECURRENTES">⭐ Recurrentes (2+ compras)</option>
            <option value="APROBADAS">✓ Con compras aprobadas</option>
            <option value="PENDIENTES">⏳ Con compras pendientes</option>
          </select>

          {/* Ordenamiento */}
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as
                  | "RECENT"
                  | "SPENT_DESC"
                  | "TICKETS_DESC"
                  | "NAME_ASC"
              )
            }
            className="px-3 py-2 rounded-lg bg-[#121212] border border-[#353535] text-xs text-white outline-none focus:border-[#ffb5d7]"
          >
            <option value="RECENT">Más recientes primero</option>
            <option value="SPENT_DESC">Mayor gasto acumulado ($)</option>
            <option value="TICKETS_DESC">Más entradas compradas</option>
            <option value="NAME_ASC">Nombre (A - Z)</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-[#8a8a8a] pt-1">
          <span>
            Mostrando <strong>{filteredClients.length}</strong> de{" "}
            <strong>{allClients.length}</strong> clientes
          </span>
          {(searchTerm || eventFilter !== "__ALL__" || segmentFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setEventFilter("__ALL__");
                setSegmentFilter("ALL");
              }}
              className="text-[#ffb5d7] hover:underline text-xs cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* LISTADO DE CLIENTES */}
      {filteredClients.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#181818] border border-[#2e2e2e] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#242424] flex items-center justify-center mx-auto text-[#8a8a8a]">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            No se encontraron clientes
          </h3>
          <p className="text-xs text-[#8a8a8a] max-w-sm mx-auto">
            {searchTerm || eventFilter !== "__ALL__" || segmentFilter !== "ALL"
              ? "No hay resultados para los filtros seleccionados. Probá modificando el término de búsqueda."
              : "Aún no se han registrado compras u órdenes en los eventos seleccionados."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#181818] border border-[#2e2e2e] overflow-hidden shadow-xl">
          {/* TABLA DESKTOP */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#2e2e2e] bg-[#121212]/80 text-[#8a8a8a] uppercase text-[11px] tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">DNI</th>
                  <th className="py-3.5 px-4">Contacto</th>
                  <th className="py-3.5 px-4 text-center">Compras</th>
                  <th className="py-3.5 px-4 text-center">Entradas</th>
                  <th className="py-3.5 px-4 text-right">Total Gastado</th>
                  <th className="py-3.5 px-4">Última Actividad</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {filteredClients.map((client) => {
                  const avatarColor = getAvatarColor(client.name);
                  const lastOrder = client.orders[0];
                  const hasMultiple = client.ordersCount >= 2;

                  return (
                    <tr
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className="hover:bg-[#202020] transition-colors cursor-pointer group"
                    >
                      {/* Nombre y Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-xs border shrink-0 ${avatarColor}`}
                          >
                            {getInitials(client.name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-white group-hover:text-[#ffb5d7] transition-colors">
                                {client.name}
                              </p>
                              {hasMultiple && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-300 font-semibold">
                                  Frecuente
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#8a8a8a]">
                              {client.events.length} evento
                              {client.events.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* DNI */}
                      <td className="py-3.5 px-4 font-mono text-white/90">
                        {client.dni ? (
                          <div className="flex items-center gap-1.5">
                            <span>{client.dni}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(client.dni, `dni-${client.id}`);
                              }}
                              className="text-[#8a8a8a] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                              title="Copiar DNI"
                            >
                              {copiedKey === `dni-${client.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>

                      {/* Contacto: Email & WhatsApp */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {client.email &&
                          !client.email.includes("cortesia@") &&
                          !client.email.includes("manual@") ? (
                            <div className="flex items-center gap-1.5 text-white/90">
                              <Mail className="w-3 h-3 text-[#8a8a8a] shrink-0" />
                              <span className="truncate max-w-[180px]">
                                {client.email}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(
                                    client.email,
                                    `mail-${client.id}`
                                  );
                                }}
                                className="text-[#8a8a8a] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                title="Copiar email"
                              >
                                {copiedKey === `mail-${client.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-white/30 italic">
                              Sin email registrado
                            </span>
                          )}

                          {client.cleanPhone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="font-mono text-white/80 text-[11px]">
                                {client.phone}
                              </span>
                              <a
                                href={`https://wa.me/${client.cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-emerald-400 hover:text-emerald-300 p-0.5 ml-1"
                                title="Abrir chat de WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Compras / Órdenes */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#242424] text-white font-bold">
                          {client.ordersCount}
                        </span>
                        {client.pendingOrdersCount > 0 && (
                          <span className="block text-[10px] text-amber-400 mt-0.5">
                            {client.pendingOrdersCount} pendiente
                            {client.pendingOrdersCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>

                      {/* Entradas */}
                      <td className="py-3.5 px-4 text-center font-bold text-white">
                        {client.totalTicketsCount}
                      </td>

                      {/* Total Gastado */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-[#ffb5d7] text-sm">
                          {formatARS(client.totalSpent)}
                        </span>
                      </td>

                      {/* Última Actividad */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-white truncate max-w-[160px]">
                          {lastOrder?.eventTitle || "—"}
                        </p>
                        <p className="text-[11px] text-[#8a8a8a]">
                          {formatDate(client.lastOrderDate)}
                        </p>
                      </td>

                      {/* Acción */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClient(client);
                          }}
                          className="px-2.5 py-1 rounded-md bg-[#282828] hover:bg-[#ffb5d7] hover:text-[#1c1c1c] text-white text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Historial</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DETALLE / HISTORIAL DEL CLIENTE */}
      {selectedClient && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedClient(null)}
        >
          <div
            className="w-full max-w-4xl bg-[#161616] border border-[#2e2e2e] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABECERA DEL MODAL */}
            <div className="p-5 sm:p-6 border-b border-[#262626] bg-[#1a1a1a] flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center font-black text-lg border ${getAvatarColor(
                    selectedClient.name
                  )}`}
                >
                  {getInitials(selectedClient.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      {selectedClient.name}
                    </h3>
                    {selectedClient.ordersCount >= 2 && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-600/60 text-emerald-300 font-bold">
                        ⭐ Cliente Frecuente ({selectedClient.ordersCount} compras)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#8a8a8a] mt-0.5">
                    Cliente desde el {formatDate(selectedClient.firstOrderDate)} ·{" "}
                    {selectedClient.events.length} evento
                    {selectedClient.events.length !== 1 ? "s" : ""} visitado
                    {selectedClient.events.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="p-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-[#8a8a8a] hover:text-white transition-colors cursor-pointer"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CONTENIDO DEL MODAL (SCROLLEABLE) */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* DATOS DE CONTACTO Y ACCIONES RÁPIDAS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* DNI */}
                <div className="p-3.5 rounded-xl bg-[#1c1c1c] border border-[#2e2e2e] space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-[#8a8a8a] font-semibold block">
                    Documento (DNI)
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white text-sm">
                      {selectedClient.dni || "No especificado"}
                    </span>
                    {selectedClient.dni && (
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(selectedClient.dni, "modal-dni")
                        }
                        className="text-[#8a8a8a] hover:text-white p-1"
                        title="Copiar DNI"
                      >
                        {copiedKey === "modal-dni" ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="p-3.5 rounded-xl bg-[#1c1c1c] border border-[#2e2e2e] space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-[#8a8a8a] font-semibold block">
                    Correo Electrónico
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-white text-xs truncate max-w-[190px]">
                      {selectedClient.email || "Sin email"}
                    </span>
                    {selectedClient.email && (
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`mailto:${selectedClient.email}`}
                          className="text-[#8a8a8a] hover:text-white p-1"
                          title="Enviar correo"
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(selectedClient.email, "modal-mail")
                          }
                          className="text-[#8a8a8a] hover:text-white p-1"
                          title="Copiar email"
                        >
                          {copiedKey === "modal-mail" ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Teléfono / WhatsApp */}
                <div className="p-3.5 rounded-xl bg-[#1c1c1c] border border-[#2e2e2e] space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-[#8a8a8a] font-semibold block">
                    Teléfono / WhatsApp
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-white text-xs truncate">
                      {selectedClient.phone || "Sin teléfono"}
                    </span>
                    {selectedClient.cleanPhone ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`https://wa.me/${selectedClient.cleanPhone}?text=${encodeURIComponent(
                            `¡Hola ${selectedClient.name}! Te escribimos desde MAS30.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1"
                          title="Abrir WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(selectedClient.phone, "modal-phone")
                          }
                          className="text-[#8a8a8a] hover:text-white p-1"
                          title="Copiar teléfono"
                        >
                          {copiedKey === "modal-phone" ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* RESUMEN DE TOTALES DEL CLIENTE */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#121212] border border-[#262626]">
                <div>
                  <span className="text-[11px] text-[#8a8a8a] block">
                    Gasto Acumulado
                  </span>
                  <span className="text-lg font-black text-[#ffb5d7]">
                    {formatARS(selectedClient.totalSpent)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#8a8a8a] block">
                    Entradas Aprobadas
                  </span>
                  <span className="text-lg font-black text-white">
                    {selectedClient.totalTicketsCount} tickets
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#8a8a8a] block">
                    Órdenes
                  </span>
                  <span className="text-lg font-bold text-white">
                    {selectedClient.ordersCount} total
                    <span className="text-xs text-white/50 block font-normal">
                      {selectedClient.approvedOrdersCount} aprobadas ·{" "}
                      {selectedClient.pendingOrdersCount} pend.
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#8a8a8a] block">
                    Última Actividad
                  </span>
                  <span className="text-xs font-semibold text-white block mt-1">
                    {formatDate(selectedClient.lastOrderDate)}
                  </span>
                </div>
              </div>

              {actionMsg && (
                <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-600/60 text-xs text-emerald-200 text-center font-medium">
                  {actionMsg}
                </div>
              )}

              {/* HISTORIAL COMPLETO DE COMPRAS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#ffb5d7]" />
                    <span>Historial de Compras ({selectedClient.orders.length})</span>
                  </h4>
                  <span className="text-xs text-[#8a8a8a]">
                    Ordenado por fecha descendente
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedClient.orders.map((order, idx) => {
                    const orderTickets = selectedClient.tickets.filter(
                      (t) =>
                        t.orderId === order.id || t.orderCode === order.orderCode
                    );

                    const isApproved = order.status === "APROBADA";
                    const isPending = order.status === "PENDIENTE";
                    const isRejected = order.status === "RECHAZADA";

                    const badgeColor = isApproved
                      ? "bg-emerald-950/80 border-emerald-600/60 text-emerald-300"
                      : isPending
                      ? "bg-amber-950/80 border-amber-600/60 text-amber-300"
                      : "bg-red-950/80 border-red-600/60 text-red-300";

                    return (
                      <div
                        key={order.id || idx}
                        className="p-4 rounded-xl bg-[#1c1c1c] border border-[#2e2e2e] space-y-3"
                      >
                        {/* Cabecera de la orden */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#282828] pb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-sm text-white">
                              #{order.orderCode}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badgeColor}`}
                            >
                              {order.status}
                            </span>
                            <span className="text-[11px] text-[#8a8a8a] bg-[#121212] px-2 py-0.5 rounded border border-[#262626]">
                              {(order.issueType || "TRANSFERENCIA_WEB").replace(/_/g, " ")}
                            </span>
                          </div>

                          <div className="text-xs text-[#8a8a8a] flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatDateTime(order.createdAt)}</span>
                          </div>
                        </div>

                        {/* Detalles del Evento y Tickets */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[#8a8a8a] block">Evento:</span>
                            <span className="font-bold text-white text-sm">
                              {order.eventTitle}
                            </span>
                            {order.eventDateLabel && (
                              <span className="text-[#8a8a8a] text-[11px] block">
                                {order.eventDateLabel} · {order.eventTime || ""}
                              </span>
                            )}
                          </div>

                          <div>
                            <span className="text-[#8a8a8a] block">
                              Detalle del ítem:
                            </span>
                            <span className="font-semibold text-white">
                              {order.tierName}
                            </span>
                            <span className="text-[#8a8a8a] text-[11px] block">
                              {order.quantity} unid. · {order.totalQrCount} QRs ·{" "}
                              <strong className="text-white">
                                {formatARS(order.totalAmount)}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* Nominaciones / Asistentes */}
                        {Array.isArray(order.attendees) &&
                          order.attendees.length > 0 && (
                            <div className="p-2.5 rounded-lg bg-[#121212] border border-[#262626] space-y-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a8a8a] block">
                                Asistentes registrados ({order.attendees.length}):
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {order.attendees.map((att, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 rounded bg-[#1c1c1c] border border-[#353535] text-[11px] text-white/90 flex items-center gap-1.5"
                                  >
                                    <strong>#{i + 1}</strong> {att.name}
                                    {att.dni && (
                                      <span className="font-mono text-[#8a8a8a]">
                                        (DNI: {att.dni})
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* QRs / Entradas emitidas */}
                        {orderTickets.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a8a8a] block">
                              Accesos QR asociados ({orderTickets.length}):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {orderTickets.map((t) => (
                                <div
                                  key={t.id}
                                  className="p-2 rounded bg-[#121212] border border-[#282828] text-xs flex items-center justify-between"
                                >
                                  <div>
                                    <p className="font-bold text-white text-[11px] truncate max-w-[130px]">
                                      {t.holderName}
                                    </p>
                                    <p className="font-mono text-[10px] text-[#ffb5d7]">
                                      Cod: <strong>{t.shortCode}</strong>
                                    </p>
                                  </div>
                                  <span
                                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                      t.status === "VALIDO"
                                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                        : t.status === "USADO"
                                        ? "bg-zinc-800 text-zinc-400"
                                        : "bg-red-950 text-red-300"
                                    }`}
                                  >
                                    {t.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Botones de acción para la orden */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#262626]">
                          <Link
                            href={`/mi-entrada/${order.orderCode}`}
                            target="_blank"
                            className="px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#303030] text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#ffb5d7]" />
                            <span>Ver Comprobante / Web</span>
                          </Link>

                          {isApproved && onSendOrderEmail && (
                            <button
                              type="button"
                              onClick={async () => {
                                setActionMsg("Enviando entradas por email...");
                                await onSendOrderEmail(
                                  order,
                                  orderTickets,
                                  selectedClient.email
                                );
                                setActionMsg(
                                  `✓ Entradas de la orden #${order.orderCode} reenviadas a ${selectedClient.email}`
                                );
                                setTimeout(() => setActionMsg(null), 4000);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#303030] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5 text-[#ffb5d7]" />
                              <span>Reenviar Email</span>
                            </button>
                          )}

                          {isPending && onApproveOrder && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  confirm(
                                    `¿Aprobar orden #${order.orderCode} de ${selectedClient.name}? Se generarán los QRs inmediatamente.`
                                  )
                                ) {
                                  setActionMsg("Aprobando orden...");
                                  await onApproveOrder(order.id);
                                  setActionMsg(
                                    `✓ Orden #${order.orderCode} aprobada con éxito.`
                                  );
                                  setTimeout(() => setActionMsg(null), 4000);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aprobar Pago</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* PIE DEL MODAL */}
            <div className="p-4 bg-[#141414] border-t border-[#262626] flex items-center justify-between">
              <span className="text-xs text-[#8a8a8a]">
                ID Cliente: <code className="text-white/60">{selectedClient.id}</code>
              </span>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
