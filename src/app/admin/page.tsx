"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  MessageCircle,
  Plus,
  QrCode,
  Search,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import {
  approveOrderAndGenerateQRs,
  createManualAdminAccess,
  deleteEvent,
  formatARS,
  getBankSettings,
  getEvents,
  getInquiries,
  getOrders,
  getTickets,
  INITIAL_EVENTS,
  INITIAL_SETTINGS,
  rejectOrder,
  replyInquiry,
  saveBankSettings,
  upsertEvent,
} from "@/lib/store";
import {
  BankSettings,
  EventItem,
  InquiryItem,
  OrderItem,
  TicketQR,
  TicketTier,
} from "@/lib/types";
import {
  DEFAULT_SUPABASE_URL,
  getSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import TicketQRCard from "@/components/TicketQRCard";
import BreshPosterArt from "@/components/BreshPosterArt";

type AdminTab =
  | "reservas"
  | "eventos"
  | "tickets"
  | "consultas"
  | "configuracion";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("reservas");

  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [tickets, setTickets] = useState<TicketQR[]>([]);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [bankSettings, setBankSettings] =
    useState<BankSettings>(INITIAL_SETTINGS);

  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("TODOS");
  const [orderSearch, setOrderSearch] = useState("");
  const [expandedOrderCode, setExpandedOrderCode] = useState<string | null>(
    null
  );

  // Modal Crear Accesos Manuales / Cortesías QR
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEventId, setManualEventId] = useState("");
  const [manualTierId, setManualTierId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualDni, setManualDni] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualQty, setManualQty] = useState(2);
  const [manualIsCourtesy, setManualIsCourtesy] = useState(true);

  // Estado Carga / Edición de Evento
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [evTitle, setEvTitle] = useState("");
  const [evSubtitle, setEvSubtitle] = useState("");
  const [evCategory, setEvCategory] = useState("Fiestas");
  const [evDateLabel, setEvDateLabel] = useState("sáb. 21 nov.");
  const [evShortDate, setEvShortDate] = useState("21.11");
  const [evTime, setEvTime] = useState("23:30 a 06:00 hs");
  const [evVenueName, setEvVenueName] = useState("");
  const [evVenueAddress, setEvVenueAddress] = useState("");
  const [evVenueCity, setEvVenueCity] = useState("Buenos Aires");
  const [evFlyerUrl, setEvFlyerUrl] = useState(
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1000&q=85"
  );
  const [evFlyerColor, setEvFlyerColor] = useState("#AF2C75");
  const [evBadge, setEvBadge] = useState("Preventa Activa");
  const [evDressCode, setEvDressCode] = useState("Elegante Nocturno");
  const [evDescription, setEvDescription] = useState("");
  const [evLineupText, setEvLineupText] = useState(
    "DJ Residente MAS30\nInvitado Especial Retro Set"
  );
  const [evTiers, setEvTiers] = useState<TicketTier[]>([
    {
      id: "tier-1",
      name: "Entrada General MAS30",
      description: "Acceso general con 1 código QR individual.",
      price: 10000,
      stock: 400,
      sold: 0,
      includes: ["Acceso General +30", "Código QR Individual"],
    },
  ]);
  const [eventSavedMsg, setEventSavedMsg] = useState(false);

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [configSaved, setConfigSaved] = useState(false);
  const [supabaseKeyInput, setSupabaseKeyInput] = useState("");
  const [supabaseStatusMsg, setSupabaseStatusMsg] = useState("");

  const syncAll = () => {
    const evs = getEvents();
    setEvents(evs);
    setOrders(getOrders());
    setTickets(getTickets());
    setInquiries(getInquiries());
    setBankSettings(getBankSettings());
    if (typeof window !== "undefined") {
      setSupabaseKeyInput(
        localStorage.getItem("mas30_supabase_anon_key") || ""
      );
    }
    if (!manualEventId && evs.length > 0) {
      setManualEventId(evs[0].id);
      if (evs[0].ticketTiers.length > 0) {
        setManualTierId(evs[0].ticketTiers[0].id);
      }
    }
  };

  useEffect(() => {
    syncAll();
    window.addEventListener("mas30-store-updated", syncAll);
    window.addEventListener("storage", syncAll);
    return () => {
      window.removeEventListener("mas30-store-updated", syncAll);
      window.removeEventListener("storage", syncAll);
    };
  }, []);

  const pendingOrdersCount = orders.filter(
    (o) => o.status === "PENDIENTE"
  ).length;
  const approvedRevenue = orders
    .filter((o) => o.status === "APROBADA")
    .reduce((acc, o) => acc + o.totalAmount, 0);
  const pendingRevenue = orders
    .filter((o) => o.status === "PENDIENTE")
    .reduce((acc, o) => acc + o.totalAmount, 0);
  const scannedTicketsCount = tickets.filter(
    (t) => t.status === "USADO"
  ).length;
  const pendingInquiriesCount = inquiries.filter(
    (i) => i.status === "PENDIENTE"
  ).length;

  const handleApproveOrder = async (orderId: string, orderCode: string) => {
    await approveOrderAndGenerateQRs(orderId);
    syncAll();
    setExpandedOrderCode(orderCode);
  };

  const handleCreateManualAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualDni.trim()) return;
    const { order } = await createManualAdminAccess({
      eventId: manualEventId,
      tierId: manualTierId,
      holderName: manualName,
      holderDni: manualDni,
      buyerPhone: manualPhone || "+5491100000000",
      quantity: manualQty,
      isCourtesy: manualIsCourtesy,
    });
    syncAll();
    setShowManualModal(false);
    setManualName("");
    setManualDni("");
    setManualPhone("");
    setExpandedOrderCode(order.orderCode);
  };

  const handleFlyerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setEvFlyerUrl(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim() || !evVenueName.trim()) return;
    const slug = evTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const newEvent: EventItem = {
      id: editingEventId || `evt-${Date.now()}`,
      slug: editingEventId
        ? events.find((x) => x.id === editingEventId)?.slug || slug
        : slug,
      title: evTitle.toUpperCase(),
      subtitle:
        evSubtitle || "Fiesta exclusiva +30 · Acceso con QR individual",
      category: evCategory,
      date: "2026-12-20",
      dateLabel: evDateLabel,
      shortDate: evShortDate,
      time: evTime,
      doorsOpen: evTime.split(" ")[0] + " hs",
      venueName: evVenueName.toUpperCase(),
      venueAddress: evVenueAddress || evVenueName,
      venueCity: evVenueCity,
      country: "Argentina",
      mapUrl: `https://maps.google.com/?q=${encodeURIComponent(
        evVenueName + " " + evVenueAddress
      )}`,
      mapEmbedUrl: `https://www.google.com/maps?q=${encodeURIComponent(
        evVenueName + " " + evVenueAddress
      )}&output=embed`,
      flyerUrl: evFlyerUrl,
      flyerGradient: evFlyerColor,
      badge: evBadge,
      featured: true,
      ageRestriction:
        "Evento exclusivo para mayores de 30 años. Ingreso con DNI físico.",
      dressCode: evDressCode,
      description:
        evDescription ||
        "Viví una nueva edición de MAS30 con la mejor música, ambientación de primer nivel y acceso rápido mediante QR individual.",
      highlights: [
        "Exclusivo para mayores de 30 años",
        "Ingreso ágil con código QR individual en puerta",
        "Coctelería de autor y sector VIP",
      ],
      lineup: evLineupText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      ticketTiers: evTiers,
      status: "ACTIVO",
      createdAt: new Date().toISOString(),
    };

    await upsertEvent(newEvent);
    syncAll();
    setEditingEventId(null);
    setEvTitle("");
    setEvSubtitle("");
    setEvVenueName("");
    setEvVenueAddress("");
    setEvDescription("");
    setEventSavedMsg(true);
    setTimeout(() => setEventSavedMsg(false), 3500);
  };

  const handleLoadEventToEdit = (ev: EventItem) => {
    setEditingEventId(ev.id);
    setEvTitle(ev.title);
    setEvSubtitle(ev.subtitle);
    setEvCategory(ev.category);
    setEvDateLabel(ev.dateLabel);
    setEvShortDate(ev.shortDate || "14.11");
    setEvTime(ev.time);
    setEvVenueName(ev.venueName);
    setEvVenueAddress(ev.venueAddress);
    setEvVenueCity(ev.venueCity);
    setEvFlyerUrl(ev.flyerUrl);
    setEvFlyerColor(ev.flyerGradient || "#AF2C75");
    setEvBadge(ev.badge);
    setEvDressCode(ev.dressCode);
    setEvDescription(ev.description);
    setEvLineupText(ev.lineup.join("\n"));
    setEvTiers(ev.ticketTiers);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExportTicketsCSV = () => {
    const headers = [
      "Codigo Puerta",
      "Orden",
      "Evento",
      "Sector",
      "Nombre Asistente",
      "DNI",
      "Estado",
      "Hora Escaneo",
    ];
    const rows = tickets.map((t) => [
      t.shortCode,
      t.orderCode,
      `"${t.eventTitle}"`,
      `"${t.tierName}"`,
      `"${t.holderName}"`,
      t.holderDni,
      t.status,
      t.scannedAt || "-",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Padron-Puerta-MAS30-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const filteredOrders = orders.filter((o) => {
    const matchStatus =
      orderStatusFilter === "TODOS" || o.status === orderStatusFilter;
    const q = orderSearch.trim().toLowerCase();
    const matchText =
      !q ||
      o.orderCode.toLowerCase().includes(q) ||
      o.buyerName.toLowerCase().includes(q) ||
      o.buyerDni.toLowerCase().includes(q) ||
      o.transferReference.toLowerCase().includes(q);
    return matchStatus && matchText;
  });

  const selectedManualEvent =
    events.find((e) => e.id === manualEventId) || events[0];

  return (
    <div className="bg-dark-background text-white min-h-screen py-12">
      <div className="container space-y-10">
        {/* CABECERA ESTILO BRESH */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-sm text-[#8a8a8a] mb-1">
              MAS30 Producciones · Gestión Integral
            </p>
            <h1 className="text-2xl md:text-5xl font-normal">Administración</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="px-4 py-2.5 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm flex items-center gap-2 cursor-pointer hover:brightness-90"
            >
              <UserPlus className="w-4 h-4" />
              Emitir Cortesía / QR Manual
            </button>

            <Link
              href="/admin/scanner"
              className="px-4 py-2.5 rounded-[3px] bg-bresh text-white font-medium text-sm flex items-center gap-2 hover:brightness-90"
            >
              <QrCode className="w-4 h-4" />
              Lector QR Puerta
            </Link>
          </div>
        </div>

        {/* MÉTRICAS RÁPIDAS (#1c1c1c) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-lg bg-[#1c1c1c] space-y-1">
            <span className="text-xs text-[#8a8a8a] block">
              Transferencias Pendientes
            </span>
            <p className="text-3xl font-normal text-[#ffb5d7]">
              {pendingOrdersCount}
            </p>
            <p className="text-xs text-[#8a8a8a]">
              Por autorizar: {formatARS(pendingRevenue)}
            </p>
          </div>

          <div className="p-6 rounded-lg bg-[#1c1c1c] space-y-1">
            <span className="text-xs text-[#8a8a8a] block">
              Ventas Autorizadas
            </span>
            <p className="text-3xl font-normal text-white">
              {formatARS(approvedRevenue)}
            </p>
            <p className="text-xs text-[#8a8a8a]">
              {orders.filter((o) => o.status === "APROBADA").length} órdenes aprobadas
            </p>
          </div>

          <div className="p-6 rounded-lg bg-[#1c1c1c] space-y-1">
            <span className="text-xs text-[#8a8a8a] block">
              Tickets QR Emitidos
            </span>
            <p className="text-3xl font-normal text-white">
              {tickets.length}{" "}
              <span className="text-sm text-[#ffb5d7]">
                ({scannedTicketsCount} en puerta)
              </span>
            </p>
            <p className="text-xs text-[#8a8a8a]">1 QR por cada entrada</p>
          </div>

          <div className="p-6 rounded-lg bg-[#1c1c1c] space-y-1">
            <span className="text-xs text-[#8a8a8a] block">
              Preguntas & Contactos
            </span>
            <p className="text-3xl font-normal text-white">
              {inquiries.length}
            </p>
            <p className="text-xs text-[#ffb5d7]">
              {pendingInquiriesCount} sin responder
            </p>
          </div>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS ESTILO BRESH (bg-white text-black vs bg-[#3F3F3F] text-white/40) */}
        <nav className="flex gap-3 overflow-x-auto scrollbar-hide whitespace-nowrap pb-2">
          {[
            {
              id: "reservas",
              label: `Reservas & Ventas (${orders.length})`,
            },
            {
              id: "eventos",
              label: `Carga de Eventos (${events.length})`,
            },
            {
              id: "tickets",
              label: `Accesos QR (${tickets.length})`,
            },
            {
              id: "consultas",
              label: `Preguntas & Contactos (${inquiries.length})`,
            },
            {
              id: "configuracion",
              label: "CBU / Alias & Supabase",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`text-sm transition-colors px-4 py-2 rounded-sm block cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-black font-medium"
                  : "bg-[#3F3F3F] text-white/40 hover:text-white/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* TAB 1: RESERVAS Y VENTAS */}
        {activeTab === "reservas" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {["TODOS", "PENDIENTE", "APROBADA", "RECHAZADA"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3.5 py-1.5 rounded-sm text-xs cursor-pointer ${
                      orderStatusFilter === st
                        ? "bg-soft-pink text-[#1c1c1c] font-medium"
                        : "bg-[#1c1c1c] text-[#8a8a8a] hover:text-white"
                    }`}
                  >
                    {st === "TODOS"
                      ? "Todas"
                      : st === "PENDIENTE"
                      ? "Pendientes de Autorizar"
                      : st === "APROBADA"
                      ? "Autorizadas (Con QR)"
                      : "Rechazadas"}
                  </button>
                ))}
              </div>

              <div className="relative p-2 bg-gray-100/20 text-white rounded-md w-full sm:w-80">
                <Search className="w-4 h-4 text-white absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Buscar orden, nombre, DNI o comprobante..."
                  className="w-full pl-8 pr-3 py-1 bg-transparent text-xs text-white outline-none placeholder:text-[#A1A199]"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const orderTickets = tickets.filter(
                  (t) => t.orderCode === order.orderCode
                );
                const isExpanded = expandedOrderCode === order.orderCode;
                const waUrl = `https://wa.me/${order.buyerPhone.replace(
                  /[^0-9]/g,
                  ""
                )}?text=${encodeURIComponent(
                  `¡Hola ${order.buyerName}! Tu transferencia para *${order.eventTitle}* fue autorizada por MAS30. Acá tenés tus *${order.quantity} entradas con código QR individual* para mostrar en puerta: ${
                    typeof window !== "undefined" ? window.location.origin : ""
                  }/mi-entrada/${order.orderCode}`
                )}`;

                return (
                  <div
                    key={order.id}
                    className="rounded-lg bg-[#1c1c1c] p-6 space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-sm bg-[#353535] font-mono text-xs text-white">
                            {order.orderCode}
                          </span>
                          {order.status === "PENDIENTE" && (
                            <span className="px-2.5 py-1 rounded-sm bg-[#353535] text-[#ffb5d7] text-xs font-medium">
                              Pendiente de Verificación
                            </span>
                          )}
                          {order.status === "APROBADA" && (
                            <span className="px-2.5 py-1 rounded-sm bg-[#AF2C75] text-white text-xs font-medium">
                              ✓ Autorizada ({orderTickets.length} QRs emitidos)
                            </span>
                          )}
                          {order.status === "RECHAZADA" && (
                            <span className="px-2.5 py-1 rounded-sm bg-red-950 text-red-300 text-xs font-medium">
                              Rechazada
                            </span>
                          )}
                          <span className="text-xs text-[#8a8a8a]">
                            {order.eventTitle} ({order.eventDateLabel})
                          </span>
                        </div>

                        <h3 className="text-lg font-medium text-white">
                          {order.buyerName}{" "}
                          <span className="text-xs font-normal text-[#8a8a8a]">
                            (DNI {order.buyerDni} · {order.buyerPhone} ·{" "}
                            {order.buyerEmail})
                          </span>
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8a8a8a]">
                          <span>
                            Tickets:{" "}
                            <strong className="text-white">
                              {order.quantity}x {order.tierName}
                            </strong>
                          </span>
                          <span>
                            Total:{" "}
                            <strong className="text-[#ffb5d7] text-sm">
                              {formatARS(order.totalAmount)}
                            </strong>
                          </span>
                          <span>
                            Comprobante:{" "}
                            <strong className="font-mono text-white">
                              {order.transferReference}
                            </strong>{" "}
                            ({order.transferSender})
                          </span>
                        </div>

                        {order.notes && (
                          <p className="text-xs text-[#ffb5d7]">
                            Nota: &ldquo;{order.notes}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {order.status === "PENDIENTE" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleApproveOrder(order.id, order.orderCode)
                              }
                              className="px-4 py-2.5 rounded-[3px] bg-soft-pink hover:brightness-90 text-[#1c1c1c] font-medium text-xs cursor-pointer transition-all"
                            >
                              Autorizar Pago y Crear {order.quantity} QRs
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await rejectOrder(order.id);
                                syncAll();
                              }}
                              className="px-3 py-2.5 rounded-[3px] bg-[#353535] text-white/70 hover:text-white text-xs cursor-pointer"
                            >
                              Rechazar
                            </button>
                          </>
                        )}

                        {order.status === "APROBADA" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOrderCode(
                                  isExpanded ? null : order.orderCode
                                )
                              }
                              className="px-3.5 py-2 rounded-[3px] bg-[#353535] hover:bg-[#444] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                            >
                              <QrCode className="w-4 h-4" />
                              {isExpanded
                                ? "Ocultar QRs"
                                : `Ver ${orderTickets.length} QRs`}
                            </button>

                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-2 rounded-[3px] bg-soft-pink text-[#1c1c1c] text-xs font-medium flex items-center gap-1.5"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Enviar QRs por WhatsApp
                            </a>

                            <Link
                              href={`/mi-entrada/${order.orderCode}`}
                              className="px-3 py-2 rounded-[3px] bg-[#121212] text-white text-xs flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Link
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                    {isExpanded && orderTickets.length > 0 && (
                      <div className="pt-4 border-t border-white/10 space-y-3">
                        <p className="text-xs text-[#ffb5d7]">
                          Códigos QR individuales emitidos para {order.orderCode}:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {orderTickets.map((t) => (
                            <TicketQRCard key={t.id} ticket={t} compact />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CARGA Y EDICIÓN DE EVENTOS */}
        {activeTab === "eventos" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-normal text-white">
                  {editingEventId ? "Editar Evento" : "Cargar Nuevo Evento"}
                </h2>
                {editingEventId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEventId(null);
                      setEvTitle("");
                      setEvSubtitle("");
                    }}
                    className="text-xs text-[#8a8a8a] hover:text-white underline cursor-pointer"
                  >
                    Cancelar edición
                  </button>
                )}
              </div>

              {eventSavedMsg && (
                <div className="p-3.5 rounded bg-[#353535] text-xs text-[#ffb5d7] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Evento publicado en la cartelera.
                </div>
              )}

              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Título de Tarjeta (Ej: PALERMO - CROBAR) *
                    </label>
                    <input
                      type="text"
                      required
                      value={evTitle}
                      onChange={(e) => setEvTitle(e.target.value)}
                      placeholder="PALERMO - CROBAR"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Categoría
                    </label>
                    <select
                      value={evCategory}
                      onChange={(e) => setEvCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    >
                      <option value="Fiestas">Fiestas</option>
                      <option value="Festivales">Festivales</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Fecha texto (Ej: sáb. 21 nov.) *
                    </label>
                    <input
                      type="text"
                      required
                      value={evDateLabel}
                      onChange={(e) => setEvDateLabel(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Fecha corta (Ej: 21.11) *
                    </label>
                    <input
                      type="text"
                      required
                      value={evShortDate}
                      onChange={(e) => setEvShortDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Horario *
                    </label>
                    <input
                      type="text"
                      required
                      value={evTime}
                      onChange={(e) => setEvTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Nombre del Predio / Club *
                    </label>
                    <input
                      type="text"
                      required
                      value={evVenueName}
                      onChange={(e) => setEvVenueName(e.target.value)}
                      placeholder="CROBAR PALERMO"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Dirección Exacta *
                    </label>
                    <input
                      type="text"
                      required
                      value={evVenueAddress}
                      onChange={(e) => setEvVenueAddress(e.target.value)}
                      placeholder="Av. Marcelino Freyre s/n, Palermo"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs text-[#8a8a8a]">
                    Imagen del Flyer (URL o subir desde tu PC) *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={evFlyerUrl}
                      onChange={(e) => setEvFlyerUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                    <label className="px-4 py-2.5 rounded-[3px] bg-[#353535] text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer shrink-0">
                      <Upload className="w-4 h-4" />
                      Subir Imagen
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFlyerFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#8a8a8a] mb-1">
                    Descripción del Evento
                  </label>
                  <textarea
                    rows={3}
                    value={evDescription}
                    onChange={(e) => setEvDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                  />
                </div>

                {/* Tandas de Precios */}
                <div className="space-y-2.5 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-[#ffb5d7]">
                      Precios y Tandas de Entradas
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEvTiers((prev) => [
                          ...prev,
                          {
                            id: `tier-${Date.now()}`,
                            name: "Nueva Tanda",
                            description: "Acceso con código QR individual.",
                            price: 25000,
                            stock: 100,
                            sold: 0,
                            includes: ["Acceso QR Individual"],
                          },
                        ])
                      }
                      className="text-xs text-white hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Tanda
                    </button>
                  </div>

                  {evTiers.map((tier, idx) => (
                    <div
                      key={tier.id}
                      className="p-3 rounded-md bg-[#121212] grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) =>
                          setEvTiers((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, name: e.target.value }
                                : item
                            )
                          )
                        }
                        className="sm:col-span-5 px-2.5 py-1.5 rounded bg-[#1c1c1c] text-xs text-white"
                      />
                      <input
                        type="number"
                        value={tier.price}
                        onChange={(e) =>
                          setEvTiers((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, price: Number(e.target.value) }
                                : item
                            )
                          )
                        }
                        className="sm:col-span-3 px-2.5 py-1.5 rounded bg-[#1c1c1c] text-xs text-white"
                      />
                      <input
                        type="number"
                        value={tier.stock}
                        onChange={(e) =>
                          setEvTiers((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, stock: Number(e.target.value) }
                                : item
                            )
                          )
                        }
                        className="sm:col-span-3 px-2.5 py-1.5 rounded bg-[#1c1c1c] text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEvTiers((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="sm:col-span-1 text-white/50 hover:text-white flex justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-[3px] bg-soft-pink hover:brightness-90 text-[#1c1c1c] font-medium text-sm cursor-pointer"
                >
                  {editingEventId ? "Guardar Cambios" : "Publicar Evento"}
                </button>
              </form>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-lg font-normal text-white">
                Eventos Activos ({events.length})
              </h3>
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-lg bg-[#1c1c1c] flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded overflow-hidden shrink-0">
                    <BreshPosterArt event={ev} variant="square" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#8a8a8a]">{ev.dateLabel}</p>
                    <h4 className="text-base font-medium text-white truncate">
                      {ev.title}
                    </h4>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoadEventToEdit(ev)}
                        className="px-2.5 py-1 rounded-sm bg-[#353535] text-xs text-white cursor-pointer"
                      >
                        Editar
                      </button>
                      <Link
                        href={`/eventos/${ev.slug}`}
                        className="px-2.5 py-1 rounded-sm bg-[#121212] text-xs text-white/80"
                      >
                        Ver
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteEvent(ev.id);
                          syncAll();
                        }}
                        className="p-1 text-white/40 hover:text-white ml-auto cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ACCESOS QR */}
        {activeTab === "tickets" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-normal text-white">
                Padrón de Tickets QR Individuales ({tickets.length})
              </h2>
              <button
                type="button"
                onClick={handleExportTicketsCSV}
                className="px-4 py-2.5 rounded-[3px] bg-white text-black text-xs font-medium flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Exportar Lista Puerta (CSV)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {tickets.map((t) => (
                <TicketQRCard key={t.id} ticket={t} compact />
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CONSULTAS Y PREGUNTAS */}
        {activeTab === "consultas" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-normal text-white">
              Preguntas y Contactos ({inquiries.length})
            </h2>
            {inquiries.map((inq) => {
              const draft = replyDrafts[inq.id] ?? inq.reply ?? "";
              return (
                <div
                  key={inq.id}
                  className="rounded-lg bg-[#1c1c1c] p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-[#ffb5d7]">
                      {inq.type === "PREGUNTA_EVENTO"
                        ? `Evento: ${inq.eventTitle}`
                        : "Contacto General"}
                    </span>
                    <span className="text-xs text-[#8a8a8a]">
                      {inq.name} · {inq.email} · {inq.phone}
                    </span>
                  </div>

                  <p className="text-sm text-white bg-[#121212] p-3.5 rounded-md">
                    &ldquo;{inq.message}&rdquo;
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [inq.id]: e.target.value,
                        }))
                      }
                      placeholder="Escribir respuesta oficial de MAS30..."
                      className="flex-1 px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!draft.trim()) return;
                        await replyInquiry(inq.id, draft, true);
                        syncAll();
                      }}
                      className="px-4 py-2.5 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-xs cursor-pointer"
                    >
                      Responder y Publicar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 5: CONFIGURACIÓN */}
        {activeTab === "configuracion" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-5">
              <h2 className="text-2xl font-normal text-white">
                Datos Bancarios para Transferencias
              </h2>
              {configSaved && (
                <div className="p-3 rounded bg-[#353535] text-xs text-[#ffb5d7]">
                  ✓ Datos actualizados.
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveBankSettings(bankSettings);
                  setConfigSaved(true);
                  setTimeout(() => setConfigSaved(false), 3000);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Alias Oficial
                    </label>
                    <input
                      type="text"
                      value={bankSettings.alias}
                      onChange={(e) =>
                        setBankSettings({
                          ...bankSettings,
                          alias: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      CBU / CVU
                    </label>
                    <input
                      type="text"
                      value={bankSettings.cbu}
                      onChange={(e) =>
                        setBankSettings({
                          ...bankSettings,
                          cbu: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs font-mono text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Banco
                    </label>
                    <input
                      type="text"
                      value={bankSettings.bankName}
                      onChange={(e) =>
                        setBankSettings({
                          ...bankSettings,
                          bankName: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Titular
                    </label>
                    <input
                      type="text"
                      value={bankSettings.accountHolder}
                      onChange={(e) =>
                        setBankSettings({
                          ...bankSettings,
                          accountHolder: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-xs cursor-pointer"
                >
                  Guardar Configuración
                </button>
              </form>
            </div>

            <div className="lg:col-span-5 rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2 text-[#ffb5d7] text-xs uppercase">
                <Database className="w-4 h-4" />
                Supabase Cloud · Proyecto mastreinta
              </div>
              <h3 className="text-xl font-normal text-white">
                {isSupabaseConfigured || supabaseKeyInput.trim()
                  ? "Conectado a hpbwcewuekxfqlofwpzu"
                  : "Proyecto Detectado: hpbwcewuekxfqlofwpzu"}
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="block text-[#8a8a8a] mb-1">
                    Project URL (Preconfigurada)
                  </span>
                  <div className="px-3 py-2 rounded bg-[#121212] border border-[#353535] font-mono text-white/90 break-all">
                    {DEFAULT_SUPABASE_URL}
                  </div>
                </div>
                <div>
                  <label className="block text-[#8a8a8a] mb-1">
                    Publishable Key / anon public Key (Pegar con botón Copy de Supabase)
                  </label>
                  <input
                    type="text"
                    value={supabaseKeyInput}
                    onChange={(e) => setSupabaseKeyInput(e.target.value)}
                    placeholder="sb_publishable_... o eyJhbGciOiJIUzI1NiIs..."
                    className="w-full px-3 py-2 rounded bg-[#121212] border border-[#353535] font-mono text-white text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      if (typeof window !== "undefined") {
                        localStorage.setItem(
                          "mas30_supabase_anon_key",
                          supabaseKeyInput.trim()
                        );
                      }
                      const client = getSupabaseClient();
                      if (client) {
                        for (const ev of events) {
                          await upsertEvent(ev);
                        }
                        setSupabaseStatusMsg(
                          "✓ Clave guardada y los 4 eventos sincronizados con Supabase."
                        );
                      } else {
                        setSupabaseStatusMsg("Pegá una clave válida primero.");
                      }
                    }}
                    className="px-4 py-2.5 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-xs cursor-pointer"
                  >
                    Guardar Key & Sincronizar Eventos
                  </button>
                </div>
                {supabaseStatusMsg && (
                  <p className="text-xs text-[#ffb5d7] pt-1">
                    {supabaseStatusMsg}
                  </p>
                )}
              </div>
              <p className="text-xs text-[#8a8a8a] leading-relaxed pt-2 border-t border-[#353535]">
                Recordá ejecutar una única vez el archivo{" "}
                <code className="text-white">supabase/schema.sql</code> en el{" "}
                <strong className="text-white">SQL Editor</strong> de Supabase
                para crear las tablas (<code className="text-white">events</code>
                , <code className="text-white">orders</code>,{" "}
                <code className="text-white">tickets</code>,{" "}
                <code className="text-white">inquiries</code>).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PARA EMITIR CORTESÍA / QR MANUAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg bg-[#1c1c1c] border border-[#353535] p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-normal text-white">
                Emitir Accesos / Cortesía QR
              </h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-2 text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualAccess} className="space-y-4">
              <select
                value={manualEventId}
                onChange={(e) => {
                  const evId = e.target.value;
                  setManualEventId(evId);
                  const ev = events.find((x) => x.id === evId);
                  if (ev && ev.ticketTiers.length > 0) {
                    setManualTierId(ev.ticketTiers[0].id);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.dateLabel})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <select
                  value={manualTierId}
                  onChange={(e) => setManualTierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                >
                  {selectedManualEvent?.ticketTiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={manualQty}
                  onChange={(e) => setManualQty(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Nombre del Invitado *"
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                />
                <input
                  type="text"
                  required
                  value={manualDni}
                  onChange={(e) => setManualDni(e.target.value)}
                  placeholder="DNI *"
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                />
              </div>

              <input
                type="text"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                placeholder="WhatsApp del Invitado"
                className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
              />

              <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualIsCourtesy}
                  onChange={(e) => setManualIsCourtesy(e.target.checked)}
                />
                Cortesía sin cargo ($0)
              </label>

              <button
                type="submit"
                className="w-full py-3 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm cursor-pointer"
              >
                Emitir {manualQty} Código(s) QR
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
