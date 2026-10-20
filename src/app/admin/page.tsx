"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  MessageCircle,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  approveOrderAndGenerateQRs,
  createManualAdminAccess,
  deleteAdminUser,
  deleteEvent,
  deleteInquiry,
  deleteOrder,
  formatARS,
  getAdminUsers,
  getBankSettings,
  getCurrentAdminSession,
  getEvents,
  getInquiries,
  getOrders,
  getTickets,
  INITIAL_ADMIN_USERS,
  INITIAL_EVENTS,
  INITIAL_SETTINGS,
  isEventVisiblePublicly,
  loginAdminUser,
  logoutAdminUser,
  pushToCloudStore,
  rejectOrder,
  replyInquiry,
  saveBankSettings,
  toggleEventHidden,
  upsertAdminUser,
  upsertEvent,
  upsertInquiry,
} from "@/lib/store";
import {
  AdminUser,
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
import {
  EVENT_TEXT_DEFAULTS,
  EventTextKey,
  buildMapEmbedUrl,
  getEventText,
} from "@/lib/eventTexts";

type AdminTab =
  | "reservas"
  | "rendicion"
  | "eventos"
  | "tickets"
  | "consultas"
  | "configuracion";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("reservas");

  // Autenticación y Usuarios Admin
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [adminUsers, setAdminUsers] =
    useState<AdminUser[]>(INITIAL_ADMIN_USERS);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Filtros de Rendición de Cuentas y Creación de Usuarios
  const [rendicionEventFilter, setRendicionEventFilter] =
    useState<string>("TODOS");
  const [rendicionUserFilter, setRendicionUserFilter] =
    useState<string>("TODOS");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] =
    useState<AdminUser["role"]>("CAJA_VENTAS");
  const [userSavedMsg, setUserSavedMsg] = useState("");

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
  const [evHidden, setEvHidden] = useState(false);
  const [evPublishAt, setEvPublishAt] = useState("");
  const [evOrganizerWhatsapp, setEvOrganizerWhatsapp] =
    useState("+5491155553030");
  const [evInstagramUrl, setEvInstagramUrl] = useState(
    "https://instagram.com/mas30.eventos"
  );
  const [evTiktokUrl, setEvTiktokUrl] = useState("");
  // Textos editables de la página / modal del evento
  const [evTexts, setEvTexts] = useState<Record<EventTextKey, string>>({
    ...EVENT_TEXT_DEFAULTS,
  });
  const [evMapQuery, setEvMapQuery] = useState("");
  const setEvText = (key: EventTextKey, value: string) =>
    setEvTexts((prev) => ({ ...prev, [key]: value }));
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
  const [editingInquiryId, setEditingInquiryId] = useState<string | null>(null);
  const [faqEventId, setFaqEventId] = useState<string>("ALL");
  const [faqAuthorName, setFaqAuthorName] = useState<string>(
    "Preguntas Frecuentes MAS30"
  );
  const [faqQuestion, setFaqQuestion] = useState<string>("");
  const [faqAnswer, setFaqAnswer] = useState<string>("");
  const [faqIsPublic, setFaqIsPublic] = useState<boolean>(true);
  const [faqSavedMsg, setFaqSavedMsg] = useState<string>("");

  const [configSaved, setConfigSaved] = useState(false);
  const [shareSaved, setShareSaved] = useState(false);
  const [shareUploading, setShareUploading] = useState(false);

  // Sube la imagen de la vista previa (OG) a Supabase Storage
  const handleShareImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target?.result as string;
      if (!rawDataUrl) return;
      const img = new Image();
      img.onload = async () => {
        const maxW = 1200;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // JPEG liviano (WhatsApp ignora imágenes muy pesadas)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        setShareUploading(true);
        try {
          const res = await fetch("/api/cloud-store", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "upload_flyer", dataUrl }),
          });
          const data = await res.json();
          if (res.ok && data.url) {
            setBankSettings((prev) => ({ ...prev, shareImageUrl: data.url }));
          } else {
            alert("No se pudo subir la imagen.");
          }
        } catch {
          alert("No se pudo subir la imagen.");
        } finally {
          setShareUploading(false);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };
  const [supabaseKeyInput, setSupabaseKeyInput] = useState("");
  const [supabaseStatusMsg, setSupabaseStatusMsg] = useState("");

  const syncAll = () => {
    const evs = getEvents();
    setEvents(evs);
    setOrders(getOrders());
    setTickets(getTickets());
    setInquiries(getInquiries());
    setBankSettings(getBankSettings());
    setAdminUsers(getAdminUsers());
    setCurrentUser(getCurrentAdminSession());
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
    const { order, generatedTickets } = await approveOrderAndGenerateQRs(
      orderId,
      currentUser
        ? { username: currentUser.username, fullName: currentUser.fullName }
        : undefined
    );
    syncAll();
    setExpandedOrderCode(orderCode);

    // Intenta enviar automáticamente los QRs por Email al comprador
    try {
      await fetch("/api/send-tickets-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: order.buyerEmail,
          buyerName: order.buyerName,
          orderCode: order.orderCode,
          eventTitle: order.eventTitle,
          eventDateLabel: order.eventDateLabel,
          eventTime: order.eventTime,
          eventVenue: order.eventVenue,
          tickets: generatedTickets,
          originUrl:
            typeof window !== "undefined"
              ? window.location.origin
              : "https://mastreinta.vercel.app",
        }),
      });
    } catch {
      // continua normalmente
    }
  };

  const handleCreateManualAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualDni.trim()) return;
    const { order } = await createManualAdminAccess(
      {
        eventId: manualEventId,
        tierId: manualTierId,
        holderName: manualName,
        holderDni: manualDni,
        buyerPhone: manualPhone || "+5491100000000",
        quantity: manualQty,
        isCourtesy: manualIsCourtesy,
      },
      currentUser
        ? { username: currentUser.username, fullName: currentUser.fullName }
        : undefined
    );
    syncAll();
    setShowManualModal(false);
    setManualName("");
    setManualDni("");
    setManualPhone("");
    setExpandedOrderCode(order.orderCode);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const logged = loginAdminUser(loginUsername, loginPassword);
    if (!logged) {
      setLoginError(
        "Usuario o contraseña incorrectos. Revisá las credenciales."
      );
      return;
    }
    setLoginError("");
    setCurrentUser(logged);
    syncAll();
  };

  const handleCreateAdminUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newUserFullName.trim() ||
      !newUsername.trim() ||
      !newUserPassword.trim()
    )
      return;
    const cleanUsername = newUsername
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "");
    const existing = adminUsers.find((u) => u.username === cleanUsername);
    const created: AdminUser = {
      id: existing ? existing.id : `usr-${Date.now()}`,
      username: cleanUsername,
      password: newUserPassword.trim(),
      fullName: newUserFullName.trim(),
      role: newUserRole,
      active: true,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
    };
    upsertAdminUser(created);
    syncAll();
    setNewUserFullName("");
    setNewUsername("");
    setNewUserPassword("");
    setUserSavedMsg(
      `✓ Usuario @${cleanUsername} (${created.fullName}) guardado con éxito.`
    );
    setTimeout(() => setUserSavedMsg(""), 4000);
  };

  const handleFlyerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target?.result as string;
      if (!rawDataUrl) return;
      const img = new Image();
      img.onload = async () => {
        const maxDim = 1080;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setEvFlyerUrl(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.84);
        setEvFlyerUrl(compressedDataUrl);

        // Sube automáticamente la imagen a Supabase Storage (mas30-cloud-db)
        try {
          const res = await fetch("/api/cloud-store", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "upload_flyer",
              dataUrl: compressedDataUrl,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              setEvFlyerUrl(data.url);
            }
          }
        } catch {
          // Mantiene la versión comprimida si falla la red
        }
      };
      img.src = rawDataUrl;
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

    const mapQuery =
      evMapQuery.trim() || `${evVenueName} ${evVenueAddress} ${evVenueCity}`.trim();

    const newEvent: EventItem = {
      id: editingEventId || `evt-${Date.now()}`,
      slug: editingEventId
        ? events.find((x) => x.id === editingEventId)?.slug || slug
        : slug,
      title: evTitle.toUpperCase(),
      subtitle: evSubtitle,
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
      mapUrl: `https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`,
      mapEmbedUrl: buildMapEmbedUrl(mapQuery),
      mapQuery: evMapQuery.trim() || undefined,
      flyerUrl: evFlyerUrl,
      flyerGradient: evFlyerColor,
      badge: evBadge,
      featured: true,
      ageRestriction: evTexts.ageRestriction,
      dressCode: evDressCode,
      description: evDescription,
      headerLabel: evTexts.headerLabel,
      ticketInfoText: evTexts.ticketInfoText,
      checkoutNote: evTexts.checkoutNote,
      whatsappMessage: evTexts.whatsappMessage,
      whatsappLabel: evTexts.whatsappLabel,
      instagramLabel: evTexts.instagramLabel,
      tiktokLabel: evTexts.tiktokLabel,
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
      hidden: evHidden,
      publishAt: evPublishAt.trim() || undefined,
      organizerWhatsapp: evOrganizerWhatsapp.trim() || "+5491155553030",
      instagramUrl:
        evInstagramUrl.trim() || "https://instagram.com/mas30.eventos",
      tiktokUrl: evTiktokUrl.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    await upsertEvent(newEvent);
    syncAll();
    setEditingEventId(null);
    setEvTitle("");
    setEvSubtitle("");
    setEvVenueName("");
    setEvVenueAddress("");
    setEvVenueCity("Buenos Aires");
    setEvMapQuery("");
    setEvDescription("");
    setEvTexts({ ...EVENT_TEXT_DEFAULTS });
    setEvHidden(false);
    setEvPublishAt("");
    setEventSavedMsg(true);
    setTimeout(() => setEventSavedMsg(false), 3500);
  };

  const handleLoadEventToEdit = (ev: EventItem) => {
    setEditingEventId(ev.id);
    setEvTitle(ev.title);
    setEvSubtitle(ev.subtitle || "");
    setEvCategory(ev.category);
    setEvDateLabel(ev.dateLabel);
    setEvShortDate(ev.shortDate || "14.11");
    setEvTime(ev.time);
    setEvVenueName(ev.venueName);
    setEvVenueAddress(ev.venueAddress);
    setEvVenueCity(ev.venueCity || "");
    setEvMapQuery(ev.mapQuery || "");
    setEvFlyerUrl(ev.flyerUrl);
    setEvFlyerColor(ev.flyerGradient || "#AF2C75");
    setEvBadge(ev.badge);
    setEvDressCode(ev.dressCode);
    setEvDescription(ev.description || "");
    setEvTexts({
      headerLabel: getEventText(ev, "headerLabel"),
      ageRestriction: getEventText(ev, "ageRestriction"),
      ticketInfoText: getEventText(ev, "ticketInfoText"),
      checkoutNote: getEventText(ev, "checkoutNote"),
      whatsappMessage: getEventText(ev, "whatsappMessage"),
      whatsappLabel: getEventText(ev, "whatsappLabel"),
      instagramLabel: getEventText(ev, "instagramLabel"),
      tiktokLabel: getEventText(ev, "tiktokLabel"),
    });
    setEvHidden(Boolean(ev.hidden));
    setEvPublishAt(ev.publishAt || "");
    setEvOrganizerWhatsapp(ev.organizerWhatsapp || "+5491155553030");
    setEvInstagramUrl(
      ev.instagramUrl || "https://instagram.com/mas30.eventos"
    );
    setEvTiktokUrl(ev.tiktokUrl || "");
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
      "Precio Unitario",
      "Emitido Por Usuario",
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
      t.unitPrice ?? 10000,
      `"${t.generatedByName || "Admin"} (@${t.generatedByUsername || "admin"})"`,
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

  // Órdenes aprobadas filtradas para la Rendición de Dinero
  const approvedOrdersForRendicion = orders.filter((o) => {
    if (o.status !== "APROBADA") return false;
    if (
      rendicionEventFilter !== "TODOS" &&
      o.eventId !== rendicionEventFilter
    ) {
      return false;
    }
    if (
      rendicionUserFilter !== "TODOS" &&
      (o.approvedByUsername || "admin") !== rendicionUserFilter
    ) {
      return false;
    }
    return true;
  });

  // Resumen de Rendición agrupado por cada Usuario / Operador
  const operatorSummaries = adminUsers.map((usr) => {
    const userOrders = orders.filter(
      (o) =>
        o.status === "APROBADA" &&
        (o.approvedByUsername || "admin") === usr.username &&
        (rendicionEventFilter === "TODOS" || o.eventId === rendicionEventFilter)
    );
    const paidOrders = userOrders.filter((o) => o.totalAmount > 0);
    const courtesyOrders = userOrders.filter((o) => o.totalAmount === 0);
    const paidQRsCount = paidOrders.reduce((acc, o) => acc + o.quantity, 0);
    const courtesyQRsCount = courtesyOrders.reduce(
      (acc, o) => acc + o.quantity,
      0
    );
    const totalMoneyToRender = paidOrders.reduce(
      (acc, o) => acc + o.totalAmount,
      0
    );
    return {
      user: usr,
      ordersCount: userOrders.length,
      paidQRsCount,
      courtesyQRsCount,
      totalQRsCount: paidQRsCount + courtesyQRsCount,
      totalMoneyToRender,
    };
  });

  const handleExportRendicionCSV = () => {
    const headers = [
      "Fecha Aprobacion",
      "Usuario Operador",
      "Nombre Operador",
      "Codigo Orden",
      "Evento",
      "Cliente",
      "DNI Cliente",
      "Tipo Emision",
      "Cantidad QRs",
      "Monto a Rendir (ARS)",
      "Comprobante / Referencia",
    ];
    const rows = approvedOrdersForRendicion.map((o) => [
      o.approvedAt ? new Date(o.approvedAt).toLocaleString("es-AR") : "-",
      `@${o.approvedByUsername || "admin"}`,
      `"${o.approvedByName || "Administrador General MAS30"}"`,
      o.orderCode,
      `"${o.eventTitle}"`,
      `"${o.buyerName}"`,
      o.buyerDni,
      o.totalAmount === 0
        ? "CORTESIA ($0)"
        : o.issueType === "VENTA_MANUAL_ADMIN"
        ? "COBRO DIRECTO ADMIN"
        : "TRANSFERENCIA VERIFICADA",
      o.quantity,
      o.totalAmount,
      `"${o.transferReference} (${o.transferSender})"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rendicion-Caja-MAS30-${new Date().toISOString().slice(0, 10)}.csv`;
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
      o.transferReference.toLowerCase().includes(q) ||
      (o.approvedByName || "").toLowerCase().includes(q) ||
      (o.approvedByUsername || "").toLowerCase().includes(q);
    return matchStatus && matchText;
  });

  const selectedManualEvent =
    events.find((e) => e.id === manualEventId) || events[0];

  // PANTALLA DE LOGIN CON CONTRASEÑA PARA OPERADORES / ADMIN
  if (!currentUser) {
    return (
      <div className="bg-dark-background text-white min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-[#1c1c1c] border border-[#353535] p-8 space-y-6 shadow-2xl">
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-full bg-[#AF2C75]/30 border border-[#ffb5d7]/40 flex items-center justify-center mx-auto text-[#ffb5d7]">
              <Lock className="w-5 h-5" />
            </div>
            <p className="text-xs uppercase tracking-widest text-[#ffb5d7]">
              MAS30 Producciones · Acceso Restringido
            </p>
            <h1 className="text-2xl font-normal text-white">
              Ingreso de Operadores & Caja
            </h1>
            <p className="text-xs text-[#8a8a8a]">
              Cada código QR autorizado o emitido quedará registrado a nombre de
              tu usuario para la rendición de dinero.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded bg-red-950/80 border border-red-500/40 text-xs text-red-200 text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-[#8a8a8a] mb-1">
                Usuario Operador
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Ej: admin, caja1, rrpp1..."
                className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white outline-none focus:border-[#ffb5d7]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8a8a8a] mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white outline-none focus:border-[#ffb5d7]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-[3px] bg-soft-pink hover:brightness-95 text-[#1c1c1c] font-medium text-sm cursor-pointer transition-all"
            >
              Ingresar al Panel MAS30
            </button>
          </form>

          <div className="pt-4 border-t border-[#353535] space-y-2">
            <p className="text-[11px] text-[#8a8a8a]">
              Usuarios iniciales preconfigurados (podés crear nuevos o cambiar
              claves dentro del panel):
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setLoginUsername("admin");
                  setLoginPassword("mas30admin");
                }}
                className="p-2 rounded bg-[#121212] hover:bg-[#252525] text-left border border-[#353535] cursor-pointer"
              >
                <span className="text-[#ffb5d7] font-mono block">
                  admin / mas30admin
                </span>
                <span className="text-[#8a8a8a]">Admin General</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginUsername("caja1");
                  setLoginPassword("caja2026");
                }}
                className="p-2 rounded bg-[#121212] hover:bg-[#252525] text-left border border-[#353535] cursor-pointer"
              >
                <span className="text-[#ffb5d7] font-mono block">
                  caja1 / caja2026
                </span>
                <span className="text-[#8a8a8a]">Caja Transferencias</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-background text-white min-h-screen py-12">
      <div className="container space-y-10">
        {/* CABECERA ESTILO BRESH CON SESIÓN ACTIVA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#AF2C75] text-white text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Operador activo: {currentUser.fullName} (@{currentUser.username})
              </span>
              <button
                type="button"
                onClick={() => {
                  logoutAdminUser();
                  setCurrentUser(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-[#1c1c1c] hover:bg-[#353535] text-xs text-white/70 hover:text-white cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </button>
            </div>
            <h1 className="text-2xl md:text-5xl font-normal">Administración</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                const ok = await pushToCloudStore();
                if (ok) {
                  alert(
                    "¡Datos sincronizados con Supabase Cloud! Ya se ven los cambios en todos los celulares y dispositivos."
                  );
                }
              }}
              className="px-4 py-2.5 rounded-[3px] bg-[#1c1c1c] border border-[#ffb5d7]/40 text-[#ffb5d7] hover:bg-[#252525] font-medium text-xs flex items-center gap-2 cursor-pointer"
            >
              <Database className="w-4 h-4" />
              Sincronizar PC con Celulares
            </button>

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
              id: "rendicion",
              label: `Rendición Dinero & Usuarios (${adminUsers.length})`,
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
                            <>
                              <span className="px-2.5 py-1 rounded-sm bg-[#AF2C75] text-white text-xs font-medium">
                                ✓ Autorizada ({orderTickets.length} QRs emitidos)
                              </span>
                              <span className="px-2.5 py-1 rounded-sm bg-[#121212] border border-[#ffb5d7]/40 text-[#ffb5d7] text-xs font-medium">
                                QR emitido por:{" "}
                                {order.approvedByName ||
                                  "Administrador General MAS30"}{" "}
                                (@{order.approvedByUsername || "admin"})
                              </span>
                            </>
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

                            <a
                              href={`mailto:${order.buyerEmail}?subject=${encodeURIComponent(
                                `Tus Entradas QR para ${order.eventTitle} (${order.orderCode}) · MAS30`
                              )}&body=${encodeURIComponent(
                                `¡Hola ${order.buyerName}!\n\nTu pago para ${order.eventTitle} (${order.eventDateLabel}) fue autorizado por MAS30.\n\nPodés ver y descargar tus ${order.quantity} entradas con código QR individual en este link:\n${
                                  typeof window !== "undefined"
                                    ? window.location.origin
                                    : "https://mastreinta.vercel.app"
                                }/mi-entrada/${order.orderCode}\n\n¡Nos vemos en la pista!\nMAS30 Eventos`
                              )}`}
                              className="px-3.5 py-2 rounded-[3px] bg-[#2a2a2a] hover:bg-[#383838] text-white text-xs font-medium flex items-center gap-1.5"
                            >
                              Enviar por Email
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

                        <button
                          type="button"
                          onClick={async () => {
                            await deleteOrder(order.id);
                            syncAll();
                          }}
                          title="Eliminar orden y sus QRs"
                          className="p-2 rounded-[3px] bg-[#121212] text-white/40 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && orderTickets.length > 0 && (
                      <div className="pt-4 border-t border-white/10 space-y-3">
                        <p className="text-xs text-[#ffb5d7]">
                          Códigos QR individuales emitidos para {order.orderCode} por{" "}
                          <strong>
                            {order.approvedByName || "Administrador General MAS30"}{" "}
                            (@{order.approvedByUsername || "admin"})
                          </strong>
                          :
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

        {/* TAB RENDICIÓN DE DINERO POR USUARIO & GESTIÓN DE OPERADORES */}
        {activeTab === "rendicion" && (
          <div className="space-y-10">
            {/* CABECERA Y FILTRO DE RENDICIÓN */}
            <div className="rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#ffb5d7] text-xs uppercase">
                    <Wallet className="w-4 h-4" />
                    Control de Caja & Auditoría de QRs
                  </div>
                  <h2 className="text-2xl font-normal text-white">
                    Rendición de Dinero por Usuario Emisor de QR
                  </h2>
                  <p className="text-xs text-[#8a8a8a]">
                    Cada vez que un operador aprueba una transferencia o emite un
                    acceso manual, queda anotado su usuario y el monto exacto a
                    rendir.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={rendicionEventFilter}
                    onChange={(e) => setRendicionEventFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                  >
                    <option value="TODOS">Todos los Eventos (Global)</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.dateLabel})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleExportRendicionCSV}
                    className="px-4 py-2.5 rounded-[3px] bg-white text-black text-xs font-medium flex items-center gap-2 cursor-pointer hover:brightness-95"
                  >
                    <Download className="w-4 h-4" />
                    Exportar Rendición CSV (Excel)
                  </button>
                </div>
              </div>

              {/* TARJETAS DE RENDICIÓN POR CADA USUARIO / OPERADOR */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {operatorSummaries.map((item) => (
                  <div
                    key={item.user.id}
                    onClick={() =>
                      setRendicionUserFilter(
                        rendicionUserFilter === item.user.username
                          ? "TODOS"
                          : item.user.username
                      )
                    }
                    className={`rounded-lg p-5 border transition-all cursor-pointer space-y-3 ${
                      rendicionUserFilter === item.user.username
                        ? "bg-[#121212] border-[#ffb5d7]"
                        : "bg-[#121212]/70 border-[#353535] hover:border-white/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono text-[#ffb5d7] block">
                          @{item.user.username} · {item.user.role}
                        </span>
                        <h3 className="text-base font-medium text-white">
                          {item.user.fullName}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#353535] text-[10px] text-white/80">
                        {item.ordersCount} op.
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#353535]/80 flex items-baseline justify-between">
                      <span className="text-xs text-[#8a8a8a]">
                        Total a Rendir:
                      </span>
                      <span className="text-2xl font-medium text-[#ffb5d7]">
                        {formatARS(item.totalMoneyToRender)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2 rounded bg-[#1c1c1c]">
                        <span className="text-[#8a8a8a] block text-[10px]">
                          QRs Cobrados ($10.000)
                        </span>
                        <strong className="text-white text-sm">
                          {item.paidQRsCount} entradas
                        </strong>
                      </div>
                      <div className="p-2 rounded bg-[#1c1c1c]">
                        <span className="text-[#8a8a8a] block text-[10px]">
                          QRs Cortesía ($0)
                        </span>
                        <strong className="text-white/80 text-sm">
                          {item.courtesyQRsCount} free
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* TABLA DETALLADA DE AUDITORÍA DE CADA QR / ORDEN GENERADA */}
              <div className="space-y-3 pt-4 border-t border-[#353535]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-white">
                    Detalle de QRs y Cobros Anotados por Operador (
                    {approvedOrdersForRendicion.length} registros)
                  </h3>
                  {rendicionUserFilter !== "TODOS" && (
                    <button
                      type="button"
                      onClick={() => setRendicionUserFilter("TODOS")}
                      className="text-xs text-[#ffb5d7] underline cursor-pointer"
                    >
                      Ver todos los usuarios
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-lg border border-[#353535]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121212] text-[#8a8a8a] uppercase border-b border-[#353535]">
                      <tr>
                        <th className="py-3 px-4">Fecha / Hora</th>
                        <th className="py-3 px-4">Usuario que generó QR</th>
                        <th className="py-3 px-4">Orden</th>
                        <th className="py-3 px-4">Evento</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Tipo</th>
                        <th className="py-3 px-4 text-center">Cant. QRs</th>
                        <th className="py-3 px-4 text-right">Monto a Rendir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#353535] bg-[#121212]/40">
                      {approvedOrdersForRendicion.map((ord) => (
                        <tr key={ord.id} className="hover:bg-[#1c1c1c]">
                          <td className="py-3 px-4 text-[#8a8a8a] whitespace-nowrap">
                            {ord.approvedAt
                              ? new Date(ord.approvedAt).toLocaleString(
                                  "es-AR",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                              : "-"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-white block">
                              {ord.approvedByName ||
                                "Administrador General MAS30"}
                            </span>
                            <span className="font-mono text-[11px] text-[#ffb5d7]">
                              @{ord.approvedByUsername || "admin"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-white">
                            {ord.orderCode}
                          </td>
                          <td className="py-3 px-4 text-white/90">
                            {ord.eventTitle}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-white block">
                              {ord.buyerName}
                            </span>
                            <span className="text-[11px] text-[#8a8a8a]">
                              DNI {ord.buyerDni}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {ord.totalAmount === 0 ? (
                              <span className="px-2 py-0.5 rounded bg-[#353535] text-white/80 text-[11px]">
                                Cortesía ($0)
                              </span>
                            ) : ord.issueType === "VENTA_MANUAL_ADMIN" ? (
                              <span className="px-2 py-0.5 rounded bg-[#AF2C75]/40 text-[#ffb5d7] text-[11px]">
                                Venta Directa
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-[#AF2C75] text-white text-[11px]">
                                Transferencia
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-white">
                            {ord.quantity} QR(s)
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-[#ffb5d7] text-sm">
                            {formatARS(ord.totalAmount)}
                          </td>
                        </tr>
                      ))}
                      {approvedOrdersForRendicion.length === 0 && (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-8 text-center text-[#8a8a8a]"
                          >
                            No hay órdenes ni QRs emitidos para este filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* GESTIÓN DE USUARIOS Y CONTRASEÑAS DEL ADMIN */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-5">
                <div className="flex items-center gap-2 text-[#ffb5d7] text-xs uppercase">
                  <Users className="w-4 h-4" />
                  Accesos con Contraseña
                </div>
                <h3 className="text-xl font-normal text-white">
                  Crear / Actualizar Usuario Operador
                </h3>
                <p className="text-xs text-[#8a8a8a]">
                  Creá una cuenta individual con contraseña para cada socio,
                  cajero o RRPP. Todo QR que generen quedará anotado a su nombre.
                </p>

                {userSavedMsg && (
                  <div className="p-3 rounded bg-[#353535] text-xs text-[#ffb5d7]">
                    {userSavedMsg}
                  </div>
                )}

                <form onSubmit={handleCreateAdminUser} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Nombre y Apellido / Caja *
                    </label>
                    <input
                      type="text"
                      required
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      placeholder="Ej: Lucas Gómez (Caja 3)"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Usuario (Login) *
                      </label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Ej: lucas"
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Contraseña *
                      </label>
                      <input
                        type="text"
                        required
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Clave de acceso"
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Rol / Función
                    </label>
                    <select
                      value={newUserRole}
                      onChange={(e) =>
                        setNewUserRole(e.target.value as AdminUser["role"])
                      }
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    >
                      <option value="CAJA_VENTAS">
                        CAJA_VENTAS (Autoriza Transferencias y Cobra)
                      </option>
                      <option value="RRPP">
                        RRPP (Ventas y Cortesías QR)
                      </option>
                      <option value="ADMIN_GENERAL">
                        ADMIN_GENERAL (Control Total)
                      </option>
                      <option value="PUERTA">
                        PUERTA (Escaneo QR en Entrada)
                      </option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-xs cursor-pointer hover:brightness-95"
                  >
                    Guardar Usuario con Contraseña
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-4">
                <h3 className="text-xl font-normal text-white">
                  Usuarios Habilitados ({adminUsers.length})
                </h3>
                <div className="space-y-3">
                  {adminUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-4 rounded-lg bg-[#121212] border border-[#353535] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {u.fullName}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#353535] text-[10px] text-[#ffb5d7] font-mono">
                            {u.role}
                          </span>
                        </div>
                        <p className="text-xs text-[#8a8a8a] font-mono">
                          Usuario: <strong className="text-white">@{u.username}</strong>{" "}
                          · Contraseña:{" "}
                          <strong className="text-[#ffb5d7]">{u.password}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNewUserFullName(u.fullName);
                            setNewUsername(u.username);
                            setNewUserPassword(u.password);
                            setNewUserRole(u.role);
                          }}
                          className="px-3 py-1.5 rounded bg-[#353535] text-xs text-white hover:bg-[#454545] cursor-pointer"
                        >
                          Editar Clave
                        </button>
                        {u.username !== "admin" && (
                          <button
                            type="button"
                            onClick={() => {
                              deleteAdminUser(u.id);
                              syncAll();
                            }}
                            className="p-1.5 text-white/40 hover:text-red-400 cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                      setEvVenueName("");
                      setEvVenueAddress("");
                      setEvVenueCity("Buenos Aires");
                      setEvMapQuery("");
                      setEvDescription("");
                      setEvTexts({ ...EVENT_TEXT_DEFAULTS });
                      setEvHidden(false);
                      setEvPublishAt("");
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Encabezado Superior (Ej: MAS30)
                    </label>
                    <input
                      type="text"
                      value={evTexts.headerLabel}
                      onChange={(e) => setEvText("headerLabel", e.target.value)}
                      placeholder="MAS30 (dejá vacío para ocultar)"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Título del Evento (Ej: HALLOWEEN) *
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

                <div>
                  <label className="block text-xs text-[#8a8a8a] mb-1">
                    Subtítulo (se muestra en la página completa del evento, opcional)
                  </label>
                  <input
                    type="text"
                    value={evSubtitle}
                    onChange={(e) => setEvSubtitle(e.target.value)}
                    placeholder="Ej: Fiesta exclusiva +30 · Acceso con QR individual"
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                  />
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
                      Dirección / Texto de Ubicación *
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
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Ciudad / Zona
                    </label>
                    <input
                      type="text"
                      value={evVenueCity}
                      onChange={(e) => setEvVenueCity(e.target.value)}
                      placeholder="Buenos Aires"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#8a8a8a] mb-1">
                    Búsqueda para el Mapa de Google (Opcional)
                  </label>
                  <input
                    type="text"
                    value={evMapQuery}
                    onChange={(e) => setEvMapQuery(e.target.value)}
                    placeholder="Si lo dejás vacío usa Predio + Dirección + Ciudad (Ej: Palermo, Buenos Aires)"
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                  />
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

                {/* Textos de la Sección "Información" del Evento */}
                <div className="p-4 rounded-md bg-[#121212] border border-[#353535] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase text-[#ffb5d7] block">
                      Textos de &ldquo;Información&rdquo; del Evento
                    </span>
                    <span className="text-[10px] text-[#8a8a8a]">
                      Dejá vacío cualquier campo que quieras ocultar
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      1° Línea · Edad / Requisitos de ingreso (ícono ⓘ)
                    </label>
                    <input
                      type="text"
                      value={evTexts.ageRestriction}
                      onChange={(e) =>
                        setEvText("ageRestriction", e.target.value)
                      }
                      placeholder="Ej: Evento exclusivo para mayores de 30 años. Ingreso con DNI físico."
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      2° Línea · Descripción del Evento (ícono ⓘ)
                    </label>
                    <textarea
                      rows={3}
                      value={evDescription}
                      onChange={(e) => setEvDescription(e.target.value)}
                      placeholder="Ej: Disfraces, pizza free y mucho modo MASTREINTA..."
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      3° Línea · Texto de entradas y QR (ícono QR · usá{" "}
                      <code className="text-[#ffb5d7]">{"{precio}"}</code> para
                      mostrar el valor más bajo automáticamente)
                    </label>
                    <textarea
                      rows={2}
                      value={evTexts.ticketInfoText}
                      onChange={(e) =>
                        setEvText("ticketInfoText", e.target.value)
                      }
                      placeholder="Entradas desde {precio} por transferencia..."
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Subtítulo en el cuadro de compra (&ldquo;Reservar Entradas con QR&rdquo;)
                    </label>
                    <input
                      type="text"
                      value={evTexts.checkoutNote}
                      onChange={(e) =>
                        setEvText("checkoutNote", e.target.value)
                      }
                      placeholder="Pago por transferencia · El administrador autoriza y emite 1 QR por entrada"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                    />
                  </div>
                </div>

                {/* Visibilidad, Ocultar y Fecha de Lanzamiento Automático */}
                <div className="p-4 rounded-md bg-[#121212] border border-[#353535] space-y-3.5">
                  <span className="text-xs uppercase text-[#ffb5d7] block">
                    Visibilidad & Lanzamiento Automático
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Fecha y Hora de Lanzamiento (Opcional)
                      </label>
                      <input
                        type="datetime-local"
                        value={evPublishAt}
                        onChange={(e) => setEvPublishAt(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                      />
                      <span className="text-[10px] text-[#8a8a8a] block mt-1">
                        Si elegís una fecha futura, se publicará solo cuando
                        llegue ese día y hora.
                      </span>
                    </div>

                    <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer p-3 rounded bg-[#1c1c1c] border border-[#353535]">
                      <input
                        type="checkbox"
                        checked={evHidden}
                        onChange={(e) => setEvHidden(e.target.checked)}
                      />
                      <span>
                        Ocultar evento manualmente de la página pública
                      </span>
                    </label>
                  </div>
                </div>

                {/* WhatsApp del Organizador y Redes Sociales del Evento */}
                <div className="p-4 rounded-md bg-[#121212] border border-[#353535] space-y-3.5">
                  <span className="text-xs uppercase text-[#ffb5d7] block">
                    WhatsApp del Organizador & Redes Sociales del Evento
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        WhatsApp Organizador
                      </label>
                      <input
                        type="text"
                        value={evOrganizerWhatsapp}
                        onChange={(e) =>
                          setEvOrganizerWhatsapp(e.target.value)
                        }
                        placeholder="+5491155553030"
                        className="w-full px-3 py-2 rounded bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Link Instagram del Evento
                      </label>
                      <input
                        type="text"
                        value={evInstagramUrl}
                        onChange={(e) => setEvInstagramUrl(e.target.value)}
                        placeholder="https://instagram.com/mas30.eventos"
                        className="w-full px-3 py-2 rounded bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        TikTok / Otra Red (Opcional)
                      </label>
                      <input
                        type="text"
                        value={evTiktokUrl}
                        onChange={(e) => setEvTiktokUrl(e.target.value)}
                        placeholder="https://tiktok.com/@mas30"
                        className="w-full px-3 py-2 rounded bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Texto botón WhatsApp
                      </label>
                      <input
                        type="text"
                        value={evTexts.whatsappLabel}
                        onChange={(e) =>
                          setEvText("whatsappLabel", e.target.value)
                        }
                        placeholder="WhatsApp Organizador (Consultas & Tickets)"
                        className="w-full px-3 py-2 rounded bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Texto botón Instagram
                      </label>
                      <input
                        type="text"
                        value={evTexts.instagramLabel}
                        onChange={(e) =>
                          setEvText("instagramLabel", e.target.value)
                        }
                        placeholder="Instagram Oficial"
                        className="w-full px-3 py-2 rounded bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Texto botón Red Social extra
                      </label>
                      <input
                        type="text"
                        value={evTexts.tiktokLabel}
                        onChange={(e) =>
                          setEvText("tiktokLabel", e.target.value)
                        }
                        placeholder="Red Social / Video"
                        className="w-full px-3 py-2 rounded bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Mensaje automático de WhatsApp (podés usar{" "}
                      <code className="text-[#ffb5d7]">{"{evento}"}</code> y{" "}
                      <code className="text-[#ffb5d7]">{"{fecha}"}</code>)
                    </label>
                    <input
                      type="text"
                      value={evTexts.whatsappMessage}
                      onChange={(e) =>
                        setEvText("whatsappMessage", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                    />
                  </div>
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
                      className="p-3 rounded-md bg-[#121212] space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
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
                          placeholder="Nombre de la tanda"
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
                          placeholder="Precio ($)"
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
                          placeholder="Cupo"
                          className="sm:col-span-3 px-2.5 py-1.5 rounded bg-[#1c1c1c] text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEvTiers((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="sm:col-span-1 text-white/50 hover:text-white flex justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={tier.description || ""}
                        onChange={(e) =>
                          setEvTiers((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, description: e.target.value }
                                : item
                            )
                          )
                        }
                        placeholder="Descripción de la tanda (ej: Acceso general con 1 código QR individual)"
                        className="w-full px-2.5 py-1.5 rounded bg-[#1c1c1c] text-xs text-white/80"
                      />
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
                Eventos Cargados ({events.length})
              </h3>
              {events.map((ev) => {
                const isPublicNow = isEventVisiblePublicly(ev);
                const isScheduledFuture =
                  !ev.hidden &&
                  Boolean(
                    ev.publishAt &&
                      new Date(ev.publishAt).getTime() > Date.now()
                  );

                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-lg bg-[#1c1c1c] border flex items-center gap-4 ${
                      isPublicNow
                        ? "border-transparent"
                        : "border-[#ffb5d7]/30 opacity-80"
                    }`}
                  >
                    <div className="w-16 h-16 rounded overflow-hidden shrink-0">
                      <BreshPosterArt event={ev} variant="square" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="text-xs text-[#8a8a8a]">
                          {ev.dateLabel}
                        </span>
                        {ev.hidden ? (
                          <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 text-[10px] font-medium">
                            Oculto
                          </span>
                        ) : isScheduledFuture ? (
                          <span className="px-2 py-0.5 rounded bg-[#353535] text-[#ffb5d7] text-[10px] font-medium inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Sale:{" "}
                            {new Date(ev.publishAt!).toLocaleString("es-AR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-medium">
                            Publicado
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-medium text-white truncate">
                        {ev.title}
                      </h4>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoadEventToEdit(ev)}
                          className="px-2.5 py-1 rounded-sm bg-[#353535] hover:bg-[#444] text-xs text-white cursor-pointer"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            await toggleEventHidden(ev.id);
                            syncAll();
                          }}
                          className={`px-2.5 py-1 rounded-sm text-xs flex items-center gap-1 cursor-pointer ${
                            ev.hidden
                              ? "bg-soft-pink text-[#1c1c1c] font-medium"
                              : "bg-[#121212] text-white/80 hover:text-white"
                          }`}
                          title={
                            ev.hidden
                              ? "Publicar evento ahora"
                              : "Ocultar evento de la web pública"
                          }
                        >
                          {ev.hidden ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              Mostrar
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              Ocultar
                            </>
                          )}
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
                );
              })}
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

        {/* TAB 4: CREAR, EDITAR Y RESPONDER PREGUNTAS Y RESPUESTAS */}
        {activeTab === "consultas" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* FORMULARIO CREAR / EDITAR PREGUNTA Y RESPUESTA */}
            <div className="lg:col-span-5 rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase text-[#ffb5d7] block mb-1">
                    Preguntas Frecuentes (FAQ) & Consultas
                  </span>
                  <h2 className="text-2xl font-normal text-white">
                    {editingInquiryId
                      ? "Editar Pregunta y Respuesta"
                      : "Crear Pregunta y Respuesta"}
                  </h2>
                </div>
                {editingInquiryId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInquiryId(null);
                      setFaqEventId("ALL");
                      setFaqAuthorName("Preguntas Frecuentes MAS30");
                      setFaqQuestion("");
                      setFaqAnswer("");
                      setFaqIsPublic(true);
                    }}
                    className="text-xs text-[#ffb5d7] underline cursor-pointer"
                  >
                    Cancelar edición
                  </button>
                )}
              </div>

              {faqSavedMsg && (
                <div className="p-3 rounded bg-[#353535] text-xs text-[#ffb5d7]">
                  {faqSavedMsg}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!faqQuestion.trim()) return;
                  const selectedEv = events.find((ev) => ev.id === faqEventId);
                  const existing = inquiries.find(
                    (i) => i.id === editingInquiryId
                  );
                  const itemToSave: InquiryItem = {
                    id: editingInquiryId || `inq-${Date.now()}`,
                    type: "PREGUNTA_EVENTO",
                    eventId: faqEventId === "ALL" ? "ALL" : faqEventId,
                    eventTitle:
                      faqEventId === "ALL"
                        ? "Todos los Eventos (General)"
                        : selectedEv?.title || "Evento MAS30",
                    name:
                      faqAuthorName.trim() || "Preguntas Frecuentes MAS30",
                    email: existing?.email || "info@mas30.com",
                    phone: existing?.phone || "+5491155553030",
                    message: faqQuestion.trim(),
                    reply: faqAnswer.trim() || undefined,
                    isPublic: faqIsPublic,
                    status: faqAnswer.trim() ? "RESPONDIDA" : "PENDIENTE",
                    createdAt:
                      existing?.createdAt || new Date().toISOString(),
                  };

                  await upsertInquiry(itemToSave);
                  syncAll();
                  setEditingInquiryId(null);
                  setFaqQuestion("");
                  setFaqAnswer("");
                  setFaqAuthorName("Preguntas Frecuentes MAS30");
                  setFaqSavedMsg(
                    editingInquiryId
                      ? "✓ Pregunta y respuesta actualizada con éxito."
                      : "✓ Nueva pregunta y respuesta creada y publicada."
                  );
                  setTimeout(() => setFaqSavedMsg(""), 3500);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs text-[#8a8a8a] mb-1">
                    Asignar a Evento
                  </label>
                  <select
                    value={faqEventId}
                    onChange={(e) => setFaqEventId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                  >
                    <option value="ALL">
                      Todos los Eventos (Visible en toda la cartelera)
                    </option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.dateLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#8a8a8a] mb-1">
                    Autor / Etiqueta visible
                  </label>
                  <input
                    type="text"
                    value={faqAuthorName}
                    onChange={(e) => setFaqAuthorName(e.target.value)}
                    placeholder="Ej: Preguntas Frecuentes MAS30 o nombre del asistente"
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#8a8a8a] mb-1">
                    Pregunta *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={faqQuestion}
                    onChange={(e) => setFaqQuestion(e.target.value)}
                    placeholder="Ej: ¿A qué hora abren las puertas y hasta qué hora se puede ingresar?"
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#8a8a8a] mb-1">
                    Respuesta Oficial de MAS30
                  </label>
                  <textarea
                    rows={4}
                    value={faqAnswer}
                    onChange={(e) => setFaqAnswer(e.target.value)}
                    placeholder="Ej: Las puertas abren a las 23:30 hs. Con tu entrada QR podés ingresar toda la noche presentando DNI físico."
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={faqIsPublic}
                    onChange={(e) => setFaqIsPublic(e.target.checked)}
                  />
                  Publicar y mostrar esta pregunta y respuesta en la página del
                  evento
                </label>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-[3px] bg-soft-pink hover:brightness-95 text-[#1c1c1c] font-medium text-xs cursor-pointer transition-all"
                >
                  {editingInquiryId
                    ? "Guardar Cambios de Pregunta y Respuesta"
                    : "Crear y Publicar Pregunta y Respuesta"}
                </button>
              </form>
            </div>

            {/* LISTADO DE PREGUNTAS Y RESPUESTAS EXISTENTES */}
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-2xl font-normal text-white">
                Preguntas y Respuestas Cargadas ({inquiries.length})
              </h2>

              {inquiries.map((inq) => {
                const draft = replyDrafts[inq.id] ?? inq.reply ?? "";
                return (
                  <div
                    key={inq.id}
                    className="rounded-lg bg-[#1c1c1c] p-6 space-y-4 border border-transparent hover:border-[#353535] transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-sm bg-[#353535] text-xs text-[#ffb5d7]">
                          {inq.eventId === "ALL" || !inq.eventTitle
                            ? "Todos los Eventos"
                            : `Evento: ${inq.eventTitle}`}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[11px] ${
                            inq.isPublic && inq.reply
                              ? "bg-[#AF2C75] text-white"
                              : "bg-[#121212] text-[#8a8a8a]"
                          }`}
                        >
                          {inq.isPublic && inq.reply
                            ? "Publicada en Web"
                            : "Oculta / Sin publicar"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInquiryId(inq.id);
                            setFaqEventId(inq.eventId || "ALL");
                            setFaqAuthorName(inq.name);
                            setFaqQuestion(inq.message);
                            setFaqAnswer(inq.reply || "");
                            setFaqIsPublic(inq.isPublic);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="px-3 py-1 rounded-sm bg-[#353535] hover:bg-[#484848] text-xs text-white cursor-pointer"
                        >
                          Editar Pregunta / Respuesta
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteInquiry(inq.id);
                            syncAll();
                          }}
                          className="p-1.5 text-white/40 hover:text-red-400 cursor-pointer"
                          title="Eliminar pregunta y respuesta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-[#8a8a8a]">
                      Autor: <strong className="text-white">{inq.name}</strong>
                      {inq.email && inq.email !== "info@mas30.com"
                        ? ` · ${inq.email}`
                        : ""}
                    </div>

                    <div className="bg-[#121212] p-3.5 rounded-md space-y-2">
                      <p className="text-xs uppercase text-[#8a8a8a]">
                        Pregunta:
                      </p>
                      <p className="text-sm text-white">
                        &ldquo;{inq.message}&rdquo;
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs text-[#8a8a8a]">
                        Respuesta Oficial (podés editarla directamente acá):
                      </label>
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
                          placeholder="Escribir o editar respuesta oficial de MAS30..."
                          className="flex-1 px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!draft.trim()) return;
                            await replyInquiry(inq.id, draft, true);
                            syncAll();
                          }}
                          className="px-4 py-2.5 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-xs cursor-pointer shrink-0"
                        >
                          Guardar y Publicar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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

            {/* VISTA PREVIA AL COMPARTIR EL LINK (WhatsApp / redes) */}
            <div className="lg:col-span-12 rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-5">
              <h2 className="text-2xl font-normal text-white">
                Vista previa al compartir el link
              </h2>
              <p className="text-xs text-[#8a8a8a]">
                Es la tarjeta que aparece cuando compartís la página en
                WhatsApp, Instagram, Facebook, etc.
              </p>
              {shareSaved && (
                <div className="p-3 rounded bg-[#353535] text-xs text-[#ffb5d7]">
                  ✓ Vista previa actualizada. WhatsApp puede tardar en mostrar
                  el cambio en links ya compartidos.
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveBankSettings(bankSettings);
                    setShareSaved(true);
                    setTimeout(() => setShareSaved(false), 4000);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Título
                    </label>
                    <input
                      type="text"
                      value={bankSettings.shareTitle || ""}
                      onChange={(e) =>
                        setBankSettings({
                          ...bankSettings,
                          shareTitle: e.target.value,
                        })
                      }
                      maxLength={70}
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={bankSettings.shareDescription || ""}
                      onChange={(e) =>
                        setBankSettings({
                          ...bankSettings,
                          shareDescription: e.target.value,
                        })
                      }
                      rows={3}
                      maxLength={200}
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Imagen (recomendado 1200×630)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={bankSettings.shareImageUrl || ""}
                        onChange={(e) =>
                          setBankSettings({
                            ...bankSettings,
                            shareImageUrl: e.target.value,
                          })
                        }
                        placeholder="https://... o subí una imagen"
                        className="flex-1 min-w-0 px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs font-mono text-white"
                      />
                      <label className="px-4 py-2.5 rounded-[3px] bg-[#353535] text-white text-xs cursor-pointer">
                        {shareUploading ? "Subiendo..." : "Subir imagen"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleShareImageUpload}
                          disabled={shareUploading}
                        />
                      </label>
                      {bankSettings.shareImageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setBankSettings({
                              ...bankSettings,
                              shareImageUrl: "",
                            })
                          }
                          className="px-4 py-2.5 rounded-[3px] bg-[#353535] text-white text-xs cursor-pointer"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={shareUploading}
                    className="px-6 py-3 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-xs cursor-pointer disabled:opacity-50"
                  >
                    Guardar Vista Previa
                  </button>
                </form>

                {/* Simulación de la tarjeta de WhatsApp */}
                <div>
                  <span className="block text-xs text-[#8a8a8a] mb-2">
                    Así se verá en WhatsApp
                  </span>
                  <div className="max-w-sm rounded-lg bg-[#005c4b] p-1.5">
                    <div className="rounded-md bg-[#025144] overflow-hidden">
                      {bankSettings.shareImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={bankSettings.shareImageUrl}
                          alt="Vista previa"
                          className="w-full aspect-[1200/630] object-cover"
                        />
                      )}
                      <div className="p-2.5 space-y-1">
                        <p className="text-sm font-semibold text-white">
                          {bankSettings.shareTitle || "MAS30 | Eventos"}
                        </p>
                        <p className="text-xs text-white/70 line-clamp-2">
                          {bankSettings.shareDescription}
                        </p>
                        <p className="text-xs text-white/50">
                          mastreinta.vercel.app
                        </p>
                      </div>
                    </div>
                    <p className="px-1.5 py-1 text-xs text-[#53bdeb] underline">
                      https://mastreinta.vercel.app/
                    </p>
                  </div>
                </div>
              </div>
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
