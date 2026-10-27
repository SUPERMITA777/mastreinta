"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  LayoutGrid,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  approveOrderAndGenerateQRs,
  canUserAccessEvent,
  createDefaultVenueMap,
  createManualAdminAccess,
  deleteAdminRole,
  deleteAdminUser,
  deleteEvent,
  deleteInquiry,
  deleteOrder,
  deleteSingleTicket,
  ensureOrderTickets,
  formatARS,
  getAdminRoles,
  getAdminUsers,
  getAnalytics,
  getBankSettings,
  getCurrentAdminSession,
  getEvents,
  getInquiries,
  getOrders,
  getTickets,
  getUserPermissions,
  saveOrders,
  updateOrderCustomerData,
  INITIAL_ADMIN_ROLES,
  INITIAL_ADMIN_USERS,
  INITIAL_ANALYTICS,
  INITIAL_EVENTS,
  INITIAL_SETTINGS,
  isEventVisiblePublicly,
  isSuperAdminUser,
  loginAdminUser,
  logoutAdminUser,
  pushToCloudStore,
  rejectOrder,
  replyInquiry,
  resetAnalytics,
  saveAdminRoles,
  saveAdminUsers,
  saveBankSettings,
  toggleEventHidden,
  updateEventVenueMap,
  updateTicketStatus,
  upsertAdminRole,
  upsertAdminUser,
  upsertEvent,
  upsertInquiry,
} from "@/lib/store";
import {
  AdminRoleDefinition,
  AdminUser,
  BankSettings,
  EventItem,
  InquiryItem,
  OrderItem,
  RolePermissions,
  SiteAnalytics,
  TicketQR,
  TicketTier,
  VenueMapConfig,
} from "@/lib/types";
import { DEFAULT_SUPABASE_URL } from "@/lib/supabase";
import TicketQRCard from "@/components/TicketQRCard";
import BreshPosterArt from "@/components/BreshPosterArt";
import {
  EVENT_TEXT_DEFAULTS,
  EventTextKey,
  buildMapEmbedUrl,
  getEventText,
} from "@/lib/eventTexts";
import {
  getArgentinaDateKey,
  formatArgentinaDate,
  formatArgentinaDateTime,
  TIMEZONE_ARGENTINA,
} from "@/lib/dateUtils";
import VenueMapEditor from "@/components/VenueMapEditor";

/** Escapa texto que se interpola en HTML generado a mano (evita XSS almacenado). */
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type AdminTab =
  | "hub_eventos"
  | "reservas"
  | "rendicion"
  | "eventos"
  | "mapa"
  | "visitas"
  | "tickets"
  | "consultas"
  | "usuarios_roles"
  | "configuracion";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("reservas");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Autenticación y Usuarios Admin
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [adminUsers, setAdminUsers] =
    useState<AdminUser[]>(INITIAL_ADMIN_USERS);
  const [adminRoles, setAdminRoles] =
    useState<AdminRoleDefinition[]>(INITIAL_ADMIN_ROLES);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Gestión Superadmin de Roles y Permisos
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleFormName, setRoleFormName] = useState("");
  const [roleFormLabel, setRoleFormLabel] = useState("");
  const [roleFormDesc, setRoleFormDesc] = useState("");
  const [roleFormPermissions, setRoleFormPermissions] =
    useState<RolePermissions>({
      canViewOrders: true,
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
    });
  const [roleSavedMsg, setRoleSavedMsg] = useState("");
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Gestión de Usuarios y Asignación de Eventos por el Superadmin
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("ADMIN");
  const [userAssignedEventIds, setUserAssignedEventIds] = useState<string[]>([]);
  const [userSavedMsg, setUserSavedMsg] = useState("");
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Filtros de Rendición de Cuentas
  const [rendicionEventFilter, setRendicionEventFilter] =
    useState<string>("TODOS");
  const [rendicionUserFilter, setRendicionUserFilter] =
    useState<string>("TODOS");

  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [tickets, setTickets] = useState<TicketQR[]>([]);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [bankSettings, setBankSettings] =
    useState<BankSettings>(INITIAL_SETTINGS);
  const [analytics, setAnalytics] = useState<SiteAnalytics>(INITIAL_ANALYTICS);
  const [expandedEventDaily, setExpandedEventDaily] = useState<
    Record<string, boolean>
  >({});
  const [dailyVisitsEventFilter, setDailyVisitsEventFilter] =
    useState<string>("TODOS");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("TODOS");
  const [orderEventFilter, setOrderEventFilter] = useState<string>("TODOS");
  const [orderSearch, setOrderSearch] = useState("");
  const [expandedOrderCode, setExpandedOrderCode] = useState<string | null>(
    null
  );

  // Estados para filtro, búsqueda y vista de Padrón de Tickets QR
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketEventFilter, setTicketEventFilter] = useState("TODOS");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("TODOS");
  const [ticketViewMode, setTicketViewMode] = useState<"lista" | "tarjetas">("lista");

  // Modal Crear Accesos Manuales / Cortesías QR
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEventId, setManualEventId] = useState("");
  const [manualTierId, setManualTierId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualDni, setManualDni] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualSendEmail, setManualSendEmail] = useState(true);
  const [manualQty, setManualQty] = useState(2);
  const [manualIsCourtesy, setManualIsCourtesy] = useState(true);
  const [manualPrice, setManualPrice] = useState<number | "">("");

  // Modal Editar Datos de Comprador / Orden
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [editBuyerName, setEditBuyerName] = useState("");
  const [editBuyerPhone, setEditBuyerPhone] = useState("");
  const [editBuyerEmail, setEditBuyerEmail] = useState("");
  const [editBuyerDni, setEditBuyerDni] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState<number | "">("");
  const [editOrderSavedMsg, setEditOrderSavedMsg] = useState("");

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
  // Cobros online (Mercado Pago)
  const [evPaymentAccountId, setEvPaymentAccountId] = useState("");
  const [evFeePercent, setEvFeePercent] = useState("0");
  const [mpAccounts, setMpAccounts] = useState<
    { id: string; label: string; mpUserId: string; email?: string }[]
  >([]);
  const [mpConfigured, setMpConfigured] = useState(true);
  const [mpNewLabel, setMpNewLabel] = useState("");
  const [mpMsg, setMpMsg] = useState("");  // Textos editables de la página / modal del evento
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
  const [emailConfigSaved, setEmailConfigSaved] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [sendingEmailOrderCode, setSendingEmailOrderCode] = useState<
    string | null
  >(null);
  const [emailStatusByOrder, setEmailStatusByOrder] = useState<
    Record<string, { ok: boolean; msg: string; missingCredentials?: boolean }>
  >({});
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
  const syncAll = () => {
    const evs = getEvents();
    setEvents(evs);
    setOrders(getOrders());
    setTickets(getTickets());
    setInquiries(getInquiries());
    setBankSettings(getBankSettings());
    setAnalytics(getAnalytics());
    setAdminUsers(getAdminUsers());
    setAdminRoles(getAdminRoles());
    setCurrentUser(getCurrentAdminSession());
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

  // Cuentas de Mercado Pago conectadas (solo operadores)
  const loadMpAccounts = async () => {
    try {
      const r = await fetch("/api/mp/accounts", {
        cache: "no-store",
      });
      if (!r.ok) return;
      const d = await r.json();
      setMpAccounts(d.accounts || []);
      setMpConfigured(Boolean(d.configured));
    } catch {
      // sin conexión
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    loadMpAccounts();
    const q = new URLSearchParams(window.location.search).get("mp");
    if (q === "connected") setMpMsg("Cuenta de Mercado Pago conectada correctamente.");
    if (q === "error") setMpMsg("No se pudo conectar la cuenta de Mercado Pago.");
  }, [currentUser?.username]);

  const handleConnectMp = async () => {
    setMpMsg("");
    const r = await fetch("/api/mp/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ label: mpNewLabel }),
    });
    const d = await r.json();
    if (d.ok && d.url) window.location.href = d.url;
    else setMpMsg(d.error || "No se pudo iniciar la conexión.");
  };

  const handleDisconnectMp = async (id: string) => {
    if (!window.confirm("¿Desconectar esta cuenta? Los eventos que la usen dejarán de cobrar online.")) return;
    await fetch(`/api/mp/accounts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (evPaymentAccountId === id) setEvPaymentAccountId("");
    loadMpAccounts();
  };

  const isSuper = isSuperAdminUser(currentUser);
  const permissions = getUserPermissions(currentUser);

  // Filtrar eventos accesibles para el usuario conectado (Superadmin ve todos; los demás solo los asignados o creados)
  const visibleEvents = events.filter((ev) =>
    canUserAccessEvent(currentUser, ev)
  );
  const visibleEventIds = new Set(visibleEvents.map((e) => e.id));
  const selectedEvent = visibleEvents.find((e) => e.id === selectedEventId) || null;

  // Filtrar órdenes, tickets y consultas según los eventos accesibles
  const visibleOrders = orders.filter((o) => visibleEventIds.has(o.eventId));
  const visibleTickets = tickets.filter((t) => visibleEventIds.has(t.eventId));
  const visibleInquiries = inquiries.filter(
    (i) => !i.eventId || i.eventId === "ALL" || visibleEventIds.has(i.eventId)
  );

  const pendingOrdersCount = visibleOrders.filter(
    (o) => o.status === "PENDIENTE"
  ).length;
  const approvedRevenue = visibleOrders
    .filter((o) => o.status === "APROBADA")
    .reduce((acc, o) => acc + o.totalAmount, 0);
  const pendingRevenue = visibleOrders
    .filter((o) => o.status === "PENDIENTE")
    .reduce((acc, o) => acc + o.totalAmount, 0);
  const scannedTicketsCount = visibleTickets.filter(
    (t) => t.status === "USADO"
  ).length;
  const pendingInquiriesCount = visibleInquiries.filter(
    (i) => i.status === "PENDIENTE"
  ).length;

  // Ajuste automático de pestaña activa según permisos del rol conectado
  useEffect(() => {
    if (!currentUser) return;
    const allowedTabs: { id: AdminTab; allowed: boolean }[] = [
      { id: "hub_eventos", allowed: true },
      { id: "reservas", allowed: permissions.canViewOrders },
      { id: "rendicion", allowed: permissions.canViewRendicion },
      { id: "eventos", allowed: permissions.canManageEvents },
      { id: "mapa", allowed: permissions.canManageEvents },
      { id: "visitas", allowed: permissions.canViewAnalytics },
      { id: "tickets", allowed: permissions.canViewTickets },
      { id: "consultas", allowed: permissions.canManageInquiries },
      { id: "usuarios_roles", allowed: isSuper || permissions.canManageUsers },
      { id: "configuracion", allowed: permissions.canManageSettings },
    ];
    const currentIsAllowed = allowedTabs.find((t) => t.id === activeTab)?.allowed;
    if (!currentIsAllowed) {
      const firstAllowed = allowedTabs.find((t) => t.allowed);
      if (firstAllowed) {
        setActiveTab(firstAllowed.id);
      }
    }
  }, [currentUser, permissions, isSuper, activeTab]);

  const handleSendOrderEmail = async (
    order: OrderItem,
    orderTickets: TicketQR[],
    overrideEmail?: string
  ) => {
    let targetEmail = (overrideEmail || order.buyerEmail || "").trim();
    if (!targetEmail || targetEmail === "cortesia@mas30.com" || targetEmail === "manual@mas30.com") {
      const prompted =
        typeof window !== "undefined"
          ? window.prompt(
              `Ingresá el email para enviar los accesos de la orden ${order.orderCode}:`,
              order.buyerEmail && !order.buyerEmail.endsWith("@mas30.com") ? order.buyerEmail : ""
            )
          : null;
      if (!prompted || !prompted.trim()) {
        setEmailStatusByOrder((prev) => ({
          ...prev,
          [order.orderCode]: {
            ok: false,
            msg: "No se especificó un email válido para el envío.",
          },
        }));
        return;
      }
      targetEmail = prompted.trim();
      order.buyerEmail = targetEmail;
      const allOrders = getOrders().map((o) =>
        o.id === order.id ? { ...o, buyerEmail: targetEmail } : o
      );
      saveOrders(allOrders);
      syncAll();
    }

    const orderEvent = events.find((ev) => ev.id === order.eventId);
    setSendingEmailOrderCode(order.orderCode);
    setEmailStatusByOrder((prev) => ({
      ...prev,
      [order.orderCode]: {
        ok: true,
        msg: `Enviando email con Flyer + QRs a ${targetEmail}...`,
      },
    }));

    try {
      const res = await fetch("/api/send-tickets-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toEmail: targetEmail,
          buyerName: order.buyerName,
          orderCode: order.orderCode,
          eventId: order.eventId,
          eventTitle: order.eventTitle,
          eventDateLabel: order.eventDateLabel,
          eventTime: order.eventTime,
          eventVenue: order.eventVenue,
          flyerUrl: orderEvent?.flyerUrl || "",
          tickets: orderTickets,
          smtpUser: bankSettings.smtpUser,
          smtpPass: bankSettings.smtpPass,
          smtpHost: bankSettings.smtpHost,
          smtpPort: bankSettings.smtpPort,
          resendApiKey: bankSettings.resendApiKey,
          resendFromEmail: bankSettings.resendFromEmail,
          originUrl:
            typeof window !== "undefined"
              ? window.location.origin
              : "https://mastreinta.vercel.app",
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setEmailStatusByOrder((prev) => ({
          ...prev,
          [order.orderCode]: {
            ok: true,
            msg: `✓ Email enviado con el Flyer y ${orderTickets.length} QR(s) a ${order.buyerEmail}`,
          },
        }));
      } else {
        setEmailStatusByOrder((prev) => ({
          ...prev,
          [order.orderCode]: {
            ok: false,
            missingCredentials: data.mode === "missing_credentials",
            msg:
              data.error ||
              "No se pudo enviar el email. Verificá la configuración de correo.",
          },
        }));
      }
    } catch (err) {
      setEmailStatusByOrder((prev) => ({
        ...prev,
        [order.orderCode]: {
          ok: false,
          msg: `Error de red al enviar email: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
      }));
    } finally {
      setSendingEmailOrderCode(null);
    }
  };

  const handleApproveOrder = async (orderId: string, orderCode: string) => {
    const { order, generatedTickets } = await approveOrderAndGenerateQRs(
      orderId,
      currentUser
        ? { username: currentUser.username, fullName: currentUser.fullName }
        : undefined
    );
    syncAll();
    setExpandedOrderCode(orderCode);

    // Envía automáticamente el Flyer + QRs + Códigos de 4 dígitos por Email al comprador
    await handleSendOrderEmail(order, generatedTickets);
  };

  const handleCreateManualAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    const emailToSend = manualEmail.trim();
    const shouldSendEmail = manualSendEmail && !!emailToSend;
    const { order, tickets } = await createManualAdminAccess(
      {
        eventId: manualEventId,
        tierId: manualTierId,
        holderName: manualName,
        holderDni: manualDni,
        buyerPhone: manualPhone || "+5491100000000",
        buyerEmail: emailToSend || undefined,
        quantity: manualQty,
        isCourtesy: manualIsCourtesy,
        customTotalAmount: manualIsCourtesy
          ? 0
          : typeof manualPrice === "number" && manualPrice >= 0
            ? manualPrice
            : undefined,
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
    setManualEmail("");
    setManualPrice("");
    setExpandedOrderCode(order.orderCode);

    if (shouldSendEmail) {
      await handleSendOrderEmail(order, tickets, emailToSend);
    }
  };

  const handleOpenEditOrder = (order: OrderItem) => {
    setEditingOrder(order);
    setEditBuyerName(order.buyerName || "");
    setEditBuyerPhone(order.buyerPhone || "");
    setEditBuyerEmail(
      order.buyerEmail && !order.buyerEmail.endsWith("@mas30.com")
        ? order.buyerEmail
        : ""
    );
    setEditBuyerDni(order.buyerDni || "");
    setEditNotes(order.notes || "");
    setEditTotalAmount(order.totalAmount ?? 0);
    setEditOrderSavedMsg("");
  };

  const handleSaveOrderCustomerData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    try {
      await updateOrderCustomerData(editingOrder.id, {
        buyerName: editBuyerName,
        buyerPhone: editBuyerPhone,
        buyerEmail: editBuyerEmail.trim() || undefined,
        buyerDni: editBuyerDni,
        notes: editNotes,
        totalAmount: typeof editTotalAmount === "number" ? editTotalAmount : 0,
      });
      syncAll();
      setEditOrderSavedMsg("✓ Datos del comprador actualizados correctamente.");
      setTimeout(() => {
        setEditingOrder(null);
        setEditOrderSavedMsg("");
      }, 1200);
    } catch (err) {
      setEditOrderSavedMsg("Error al guardar los datos.");
    }
  };

  const handleGenerateMissingQRs = async (orderId: string) => {
    try {
      const generated = await ensureOrderTickets(orderId);
      syncAll();
      alert(`✓ Se generaron correctamente ${generated.length} código(s) QR para esta orden.`);
    } catch (err) {
      alert("Error al generar los códigos QR: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { user: logged, error } = await loginAdminUser(
      loginUsername,
      loginPassword
    );
    if (!logged) {
      setLoginError(error || "Usuario o contraseña incorrectos. Revisá las credenciales.");
      return;
    }
    setLoginError("");
    setLoginPassword("");
    setCurrentUser(logged);
    syncAll();
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName.trim() || !roleFormLabel.trim()) return;
    const cleanName = roleFormName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_");
    const roleDef: AdminRoleDefinition = {
      id: editingRoleId || `role-${Date.now()}`,
      name: cleanName,
      label: roleFormLabel.trim(),
      description: roleFormDesc.trim(),
      isSystem:
        cleanName === "SUPERADMIN" ||
        cleanName === "ADMIN" ||
        cleanName === "LECTOR_QR",
      permissions: roleFormPermissions,
    };
    setIsSavingRole(true);
    setRoleSavedMsg("Guardando rol...");
    const res = await upsertAdminRole(roleDef);
    setIsSavingRole(false);
    if (!res.ok) {
      setRoleSavedMsg(`⚠ Error al guardar el rol: ${res.error || "No se pudo sincronizar en el servidor."}`);
      setTimeout(() => setRoleSavedMsg(""), 6000);
      return;
    }
    syncAll();
    setEditingRoleId(null);
    setRoleFormName("");
    setRoleFormLabel("");
    setRoleFormDesc("");
    setRoleSavedMsg(`✓ Rol ${roleDef.label} guardado con éxito.`);
    setTimeout(() => setRoleSavedMsg(""), 3500);
  };

  const handleCreateAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserFullName.trim() || !newUsername.trim()) {
      setUserSavedMsg("⚠ Por favor completa nombre y usuario.");
      setTimeout(() => setUserSavedMsg(""), 4000);
      return;
    }
    const cleanUsername = newUsername
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "");

    if (!cleanUsername) {
      setUserSavedMsg("⚠ El nombre de usuario contiene caracteres no válidos.");
      setTimeout(() => setUserSavedMsg(""), 4000);
      return;
    }

    const passTrim = newUserPassword.trim();
    if (!editingUserId && passTrim.length < 8) {
      setUserSavedMsg("⚠ La contraseña debe tener al menos 8 caracteres.");
      setTimeout(() => setUserSavedMsg(""), 4000);
      return;
    }
    if (editingUserId && passTrim.length > 0 && passTrim.length < 8) {
      setUserSavedMsg("⚠ La nueva contraseña debe tener al menos 8 caracteres.");
      setTimeout(() => setUserSavedMsg(""), 4000);
      return;
    }

    const defaultPasswords = [
      "supermas30",
      "mas30admin",
      "lector2026",
      "caja2026",
      "rrpp2026",
      "puerta2026",
      "12345678",
    ];
    if (passTrim && defaultPasswords.includes(passTrim.toLowerCase())) {
      setUserSavedMsg("⚠ Por seguridad, no uses contraseñas conocidas o de fábrica (12345678, caja2026, etc.).");
      setTimeout(() => setUserSavedMsg(""), 5000);
      return;
    }

    const usernameConflict = adminUsers.some(
      (u) =>
        u.username.toLowerCase() === cleanUsername &&
        (!editingUserId || u.id !== editingUserId)
    );
    if (usernameConflict) {
      setUserSavedMsg(`⚠ Ya existe un usuario con el nombre @${cleanUsername}. Elegí otro usuario.`);
      setTimeout(() => setUserSavedMsg(""), 4000);
      return;
    }

    const existing = adminUsers.find(
      (u) =>
        u.id === editingUserId ||
        u.username.toLowerCase() === cleanUsername
    );

    const created: AdminUser = {
      id: editingUserId || (existing ? existing.id : `usr-${Date.now()}`),
      username: cleanUsername,
      password: passTrim || (existing ? existing.password : ""),
      fullName: newUserFullName.trim(),
      email: newUserEmail.trim() || undefined,
      role: newUserRole,
      assignedEventIds:
        newUserRole === "SUPERADMIN"
          ? []
          : userAssignedEventIds,
      active: true,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
    };

    setIsSavingUser(true);
    setUserSavedMsg("Guardando cambios en el servidor...");

    const res = await upsertAdminUser(created);
    setIsSavingUser(false);

    if (!res.ok) {
      setUserSavedMsg(`⚠ Error al guardar: ${res.error || "No se pudo sincronizar en el servidor."}`);
      setTimeout(() => setUserSavedMsg(""), 6000);
      return;
    }

    syncAll();
    setEditingUserId(null);
    setNewUserFullName("");
    setNewUsername("");
    setNewUserPassword("");
    setNewUserEmail("");
    setNewUserRole("ADMIN");
    setUserAssignedEventIds([]);
    setUserSavedMsg(
      `✓ Usuario @${cleanUsername} (${created.fullName}) guardado con éxito en la nube.`
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
      venueMap: editingEventId
        ? events.find((x) => x.id === editingEventId)?.venueMap || createDefaultVenueMap()
        : createDefaultVenueMap(),
      status: "ACTIVO",
      hidden: evHidden,
      publishAt: evPublishAt.trim() || undefined,
      organizerWhatsapp: evOrganizerWhatsapp.trim() || "+5491155553030",
      instagramUrl:
        evInstagramUrl.trim() || "https://instagram.com/mas30.eventos",
      tiktokUrl: evTiktokUrl.trim() || undefined,
      paymentAccountId: evPaymentAccountId || undefined,
      platformFeePercent: Math.min(
        50,
        Math.max(0, Number(evFeePercent.replace(",", ".")) || 0)
      ),
      createdByUsername: editingEventId
        ? events.find((x) => x.id === editingEventId)?.createdByUsername || currentUser?.username
        : currentUser?.username,
      createdAt: editingEventId
        ? events.find((x) => x.id === editingEventId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
    };

    await upsertEvent(newEvent, currentUser?.username);
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
    setEvPaymentAccountId("");
    setEvFeePercent("0");
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
    setEvPaymentAccountId(ev.paymentAccountId || "");
    setEvFeePercent(String(ev.platformFeePercent ?? 0));
    setEvLineupText(ev.lineup.join("\n"));
    setEvTiers(ev.ticketTiers);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRehabilitateTicket = async (t: TicketQR) => {
    if (
      confirm(
        `¿Rehabilitar la entrada #${t.ticketNumber} de "${t.holderName}" (${t.shortCode})?\n\nEl acceso volverá a figurar como VÁLIDO y podrá ser escaneado nuevamente en puerta.`
      )
    ) {
      await updateTicketStatus(t.id, "VALIDO");
      setTickets(getTickets());
    }
  };

  const handleBlockTicket = async (t: TicketQR) => {
    if (
      confirm(
        `¿BLOQUEAR la entrada #${t.ticketNumber} de "${t.holderName}" (${t.shortCode})?\n\nEl acceso será DENEGADO inmediatamente si intentan escanearlo en la puerta.`
      )
    ) {
      await updateTicketStatus(t.id, "BLOQUEADO");
      setTickets(getTickets());
    }
  };

  const handleDeleteTicket = async (t: TicketQR) => {
    if (
      confirm(
        `¿Eliminar definitivamente la entrada #${t.ticketNumber} de "${t.holderName}" (${t.shortCode}) del evento ${t.eventTitle}?\n\nEsta acción quitará el ticket del padrón.`
      )
    ) {
      await deleteSingleTicket(t.id);
      setTickets(getTickets());
    }
  };

  const handleExportTicketsCSV = () => {
    const headers = [
      "Codigo Puerta",
      "Orden",
      "Evento",
      "Sector",
      "Nombre Asistente",
      "DNI",
      "Email",
      "Telefono",
      "Precio Unitario",
      "Emitido Por Usuario",
      "Estado",
      "Hora Ingreso",
      "Puerta Acceso",
      "Validado Por",
    ];
    const rows = filteredTickets.map((t) => [
      t.shortCode,
      t.orderCode,
      `"${t.eventTitle}"`,
      `"${t.tierName}"`,
      `"${t.holderName}"`,
      t.holderDni,
      `"${t.buyerEmail || "-"}"`,
      `"${t.buyerPhone || "-"}"`,
      t.unitPrice ?? 10000,
      `"${t.generatedByName || "Admin"} (@${t.generatedByUsername || "admin"})"`,
      t.status,
      t.scannedAt ? new Date(t.scannedAt).toLocaleString("es-AR") : "-",
      `"${t.scannedDoor || (t.status === "USADO" ? "Puerta Principal" : "-")}"`,
      `"${(t.scannedByName || t.scannedBy || (t.status === "USADO" ? "Control Puerta" : "-"))}${t.scannedByUsername ? ` (@${t.scannedByUsername})` : ""}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Padron-Puerta-MAS30-${getArgentinaDateKey()}.csv`;
    a.click();
  };

  const handleExportTicketsPDF = () => {
    const eventObj =
      ticketEventFilter !== "TODOS"
        ? events.find((e) => e.id === ticketEventFilter)
        : null;

    const ticketsToPrint = filteredTickets;
    const totalCount = ticketsToPrint.length;
    const validCount = ticketsToPrint.filter((t) => t.status === "VALIDO").length;
    const usedCount = ticketsToPrint.filter((t) => t.status === "USADO").length;
    const blockedCount = ticketsToPrint.filter(
      (t) => t.status === "BLOQUEADO" || t.status === "ANULADO"
    ).length;

    const eventTitleHeader = escapeHtml(
      eventObj
        ? `${eventObj.title} · ${eventObj.dateLabel} · ${eventObj.venueName}`
        : "PADRÓN CONSOLIDADO DE ACCESOS (TODOS LOS EVENTOS)"
    );

    const generatedDateTime = formatArgentinaDateTime(new Date());

    const tableRows = ticketsToPrint
      .map((t, idx) => {
        const statusBadge =
          t.status === "VALIDO"
            ? '<span style="color:#059669;font-weight:bold;">VÁLIDO</span>'
            : t.status === "USADO"
            ? '<span style="color:#db2777;font-weight:bold;">INGRESADO</span>'
            : '<span style="color:#dc2626;font-weight:bold;">BLOQUEADO</span>';

        const scanTime = t.scannedAt ? formatArgentinaDateTime(t.scannedAt) : "-";

        return `
          <tr>
            <td style="text-align:center;color:#666;">${idx + 1}</td>
            <td style="font-family:monospace;font-weight:bold;text-align:center;">${escapeHtml(t.shortCode)}</td>
            <td><strong>${escapeHtml(t.holderName)}</strong></td>
            <td style="font-family:monospace;">${escapeHtml(t.holderDni || "-")}</td>
            <td>${escapeHtml(t.tierName)}</td>
            <td style="color:#555;">${escapeHtml(t.eventTitle)}</td>
            <td style="font-family:monospace;font-size:10px;color:#777;">${escapeHtml(t.orderCode)}</td>
            <td style="text-align:center;">${statusBadge}</td>
            <td style="font-size:10px;text-align:center;color:#555;">${escapeHtml(scanTime)}</td>
            <td style="width:70px;border-bottom:1px solid #ccc;"></td>
          </tr>
        `;
      })
      .join("");

    const printHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Padron-Accesos-MAS30-${getArgentinaDateKey()}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #111;
            margin: 0;
            padding: 10px;
            font-size: 11px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #111;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .title {
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin: 0 0 4px 0;
            text-transform: uppercase;
          }
          .subtitle {
            font-size: 13px;
            color: #444;
            font-weight: 600;
            margin: 0;
          }
          .meta {
            text-align: right;
            font-size: 10px;
            color: #555;
          }
          .stats {
            display: flex;
            gap: 12px;
            margin-bottom: 12px;
          }
          .stat-box {
            padding: 6px 12px;
            background: #f4f4f5;
            border: 1px solid #e4e4e7;
            border-radius: 4px;
            font-size: 11px;
          }
          .stat-box strong {
            font-size: 13px;
            color: #111;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
          }
          th {
            background-color: #18181b;
            color: #fff;
            padding: 6px 8px;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            padding: 5.5px 8px;
            border-bottom: 1px solid #e4e4e7;
            vertical-align: middle;
          }
          tr:nth-child(even) td {
            background-color: #fafafa;
          }
          .footer {
            margin-top: 14px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #71717a;
            border-top: 1px solid #e4e4e7;
            padding-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">MASTREINTA · Padrón Oficial de Control de Accesos</h1>
            <p class="subtitle">${eventTitleHeader}</p>
          </div>
          <div class="meta">
            <div>Fecha de Emisión: <strong>${generatedDateTime}</strong></div>
            <div>Zona horaria: Buenos Aires (GMT-3)</div>
            <div>Operador: ${escapeHtml(currentUser?.fullName || "Admin")} (@${escapeHtml(currentUser?.username || "admin")})</div>
          </div>
        </div>

        <div class="stats">
          <div class="stat-box">Total en Padrón: <strong>${totalCount}</strong></div>
          <div class="stat-box">Válidos (Por ingresar): <strong style="color:#059669;">${validCount}</strong></div>
          <div class="stat-box">Ingresados en Puerta: <strong style="color:#db2777;">${usedCount}</strong></div>
          <div class="stat-box">Bloqueados: <strong style="color:#dc2626;">${blockedCount}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:30px;text-align:center;">#</th>
              <th style="width:75px;text-align:center;">Código</th>
              <th>Nombre del Asistente</th>
              <th style="width:85px;">DNI</th>
              <th>Sector / Entrada</th>
              <th>Evento</th>
              <th style="width:85px;">Orden</th>
              <th style="width:80px;text-align:center;">Estado</th>
              <th style="width:95px;text-align:center;">Hora Ingreso</th>
              <th style="width:70px;text-align:center;">Firma / Check</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          <span>Sistema de Validación de Tickets MASTREINTA · Documento oficial para personal de puerta y seguridad</span>
          <span>Página 1</span>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    }
  };

  // Resumen de Rendición agrupado por cada Usuario / Operador
  const usersForRendicion = isSuper
    ? adminUsers
    : adminUsers.filter((u) => u.username === currentUser?.username);

  const operatorSummaries = usersForRendicion.map((usr) => {
    const userOrders = visibleOrders.filter(
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

  const approvedOrdersForRendicion = visibleOrders.filter((o) => {
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
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rendicion-Caja-MAS30-${getArgentinaDateKey()}.csv`;
    a.click();
  };

  const handleExportDailyVisitsCSV = () => {
    const allDatesSet = new Set<string>();
    Object.keys(analytics.dailyVisits || {}).forEach((d) => allDatesSet.add(d));
    Object.values(analytics.eventStats || {}).forEach((st) => {
      Object.keys(st.dailyVisits || {}).forEach((d) => allDatesSet.add(d));
    });

    const sortedDates = Array.from(allDatesSet).sort((a, b) =>
      b.localeCompare(a)
    );
    const eventsList = visibleEvents;

    const headers = [
      "Fecha (Buenos Aires)",
      "Dia",
      "Visitas Totales Web",
      ...eventsList.map((e) => `"${e.title.replace(/"/g, '""')}"`),
    ];

    const rows = sortedDates.map((dateKey) => {
      const dayFormatted = formatArgentinaDate(dateKey, {
        includeWeekday: true,
      });
      const dayName = dayFormatted.split(",")[0] || "";
      const siteVisits = analytics.dailyVisits[dateKey] || 0;
      const eventCols = eventsList.map((e) => {
        const evDaily = analytics.eventStats[e.id]?.dailyVisits || {};
        return evDaily[dateKey] || 0;
      });
      return [
        dateKey,
        `"${dayName}"`,
        siteVisits,
        ...eventCols,
      ];
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Visitas-Diarias-Eventos-MAS30-${getArgentinaDateKey()}.csv`;
    a.click();
  };

  const filteredOrders = visibleOrders.filter((o) => {
    const matchStatus =
      orderStatusFilter === "TODOS" || o.status === orderStatusFilter;
    const matchEvent =
      orderEventFilter === "TODOS" || o.eventId === orderEventFilter;
    const q = orderSearch.trim().toLowerCase();
    const matchText =
      !q ||
      o.orderCode.toLowerCase().includes(q) ||
      o.buyerName.toLowerCase().includes(q) ||
      o.buyerDni.toLowerCase().includes(q) ||
      o.transferReference.toLowerCase().includes(q) ||
      (o.approvedByName || "").toLowerCase().includes(q) ||
      (o.approvedByUsername || "").toLowerCase().includes(q);
    return matchStatus && matchEvent && matchText;
  });

  const filteredTickets = visibleTickets.filter((t) => {
    const matchEvent =
      ticketEventFilter === "TODOS" || t.eventId === ticketEventFilter;
    const matchStatus =
      ticketStatusFilter === "TODOS" ||
      (ticketStatusFilter === "VALIDO" && t.status === "VALIDO") ||
      (ticketStatusFilter === "USADO" && t.status === "USADO") ||
      (ticketStatusFilter === "BLOQUEADO" &&
        (t.status === "BLOQUEADO" || t.status === "ANULADO"));
    const q = ticketSearch.trim().toLowerCase();
    const matchText =
      !q ||
      (t.holderName || "").toLowerCase().includes(q) ||
      (t.holderDni || "").toLowerCase().includes(q) ||
      (t.shortCode || "").toLowerCase().includes(q) ||
      (t.orderCode || "").toLowerCase().includes(q) ||
      (t.tierName || "").toLowerCase().includes(q) ||
      (t.eventTitle || "").toLowerCase().includes(q);
    return matchEvent && matchStatus && matchText;
  });

  const selectedManualEvent =
    visibleEvents.find((e) => e.id === manualEventId) || visibleEvents[0];

  // PANTALLA DE LOGIN CON CONTRASEÑA PARA OPERADORES / ADMIN
  if (!currentUser) {
    return (
      <div className="bg-dark-background text-white min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-[#1c1c1c] border border-[#353535] p-8 space-y-6 shadow-2xl">
          <div className="space-y-2 text-center">
            <div className="h-10 px-3 rounded bg-[#f5f4f0] inline-flex items-center justify-center mx-auto mb-1 overflow-hidden">
              <img
                src="/logo-mas30.png"
                alt="MASTREINTA"
                className="h-full w-auto object-contain"
              />
            </div>
            <p className="text-xs uppercase tracking-widest text-[#ffb5d7]">
              Panel de Control · Acceso Restringido
            </p>
            <h1 className="text-2xl font-normal text-white">
              Ingreso al Sistema
            </h1>
            <p className="text-xs text-[#8a8a8a]">
              Ingresá con tu usuario y contraseña asignada por el Superadmin.
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
                Usuario
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Ingresá tu usuario"
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
              Ingresar al Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ACCESO EXCLUSIVO LECTOR QR (para usuarios con rol LECTOR_QR o scannerOnly)
  if (currentUser && permissions.scannerOnly) {
    return (
      <div className="bg-dark-background text-white min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl bg-[#1c1c1c] border border-[#353535] p-8 text-center space-y-6 shadow-2xl">
          <div className="h-10 px-3 rounded bg-[#f5f4f0] inline-flex items-center justify-center mx-auto overflow-hidden">
            <img
              src="/logo-mas30.png"
              alt="MASTREINTA"
              className="h-full w-auto object-contain"
            />
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#AF2C75] text-white text-xs font-medium">
              <ShieldCheck className="w-4 h-4" />
              Rol: {currentUser.role} · Solo Validación de Ingresos
            </span>
            <h1 className="text-2xl font-normal text-white">
              Lector QR de Puerta
            </h1>
            <p className="text-xs text-[#8a8a8a] max-w-md mx-auto">
              Hola <strong>{currentUser.fullName}</strong> (@{currentUser.username}).
              Tu usuario tiene asignado exclusivamente el{" "}
              <strong>Lector QR de Puerta</strong> para validar ingresos. No
              tenés acceso a modificar eventos, órdenes ni configuración.
            </p>
          </div>

          <div className="p-4 rounded-md bg-[#121212] border border-[#353535] text-xs text-left space-y-2">
            <span className="text-[#8a8a8a] block uppercase text-[11px]">
              Eventos asignados para validar ({visibleEvents.length}):
            </span>
            <div className="space-y-1">
              {visibleEvents.map((ev) => (
                <div key={ev.id} className="text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ffb5d7]" />
                  <span>
                    {ev.title} ({ev.dateLabel})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/admin/scanner"
              className="w-full sm:w-auto px-6 py-3 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm flex items-center justify-center gap-2 cursor-pointer hover:brightness-95"
            >
              <QrCode className="w-4 h-4" />
              Abrir Lector QR de Puerta
            </Link>
            <button
              type="button"
              onClick={() => {
                logoutAdminUser();
                setCurrentUser(null);
              }}
              className="w-full sm:w-auto px-4 py-3 rounded-[3px] bg-[#353535] text-white text-xs cursor-pointer hover:bg-[#454545]"
            >
              Cerrar sesión
            </button>
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
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="px-3.5 py-2.5 rounded-[3px] bg-[#1c1c1c] border border-[#353535] hover:border-[#ffb5d7]/50 text-white font-medium text-xs flex items-center gap-2 cursor-pointer transition-all"
              title={sidebarOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
            >
              {sidebarOpen ? (
                <>
                  <PanelLeftClose className="w-4 h-4 text-[#ffb5d7]" />
                  <span>Ocultar Menú</span>
                </>
              ) : (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-[#ffb5d7]" />
                  <span>Mostrar Menú</span>
                </>
              )}
            </button>

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
              onClick={() => {
                if (visibleEvents.length > 0) {
                  const ev = visibleEvents[0];
                  setManualEventId(ev.id);
                  if (ev.ticketTiers.length > 0) {
                    setManualTierId(ev.ticketTiers[0].id);
                    setManualPrice(ev.ticketTiers[0].price * (manualQty || 1));
                  }
                }
                setShowManualModal(true);
              }}
              className="px-4 py-2.5 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm flex items-center gap-2 cursor-pointer hover:brightness-90"
            >
              <UserPlus className="w-4 h-4" />
              Emitir Accesos / QR Manual
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
              {visibleOrders.filter((o) => o.status === "APROBADA").length} órdenes aprobadas
            </p>
          </div>

          <div className="p-6 rounded-lg bg-[#1c1c1c] space-y-1">
            <span className="text-xs text-[#8a8a8a] block">
              Tickets Vendidos / Disponibles
            </span>
            <p className="text-3xl font-normal text-white">
              {visibleEvents.reduce(
                (acc, ev) =>
                  acc +
                  ev.ticketTiers.reduce(
                    (s, t) => s + (Number(t.sold) || 0),
                    0
                  ),
                0
              )}{" "}
              <span className="text-sm text-[#ffb5d7]">
                ({visibleTickets.length} QRs · {scannedTicketsCount} en puerta)
              </span>
            </p>
            <p className="text-xs text-emerald-400">
              Disponibles:{" "}
              {visibleEvents.reduce(
                (acc, ev) =>
                  acc +
                  ev.ticketTiers.reduce(
                    (s, t) =>
                      s +
                      Math.max(
                        0,
                        (Number(t.stock) || 0) - (Number(t.sold) || 0)
                      ),
                    0
                  ),
                0
              )}{" "}
              entradas en stock
            </p>
          </div>

          <div className="p-6 rounded-lg bg-[#1c1c1c] space-y-1">
            <span className="text-xs text-[#8a8a8a] block">
              Preguntas & Contactos
            </span>
            <p className="text-3xl font-normal text-white">
              {visibleInquiries.length}
            </p>
            <p className="text-xs text-[#ffb5d7]">
              {pendingInquiriesCount} sin responder
            </p>
          </div>
        </div>

        {/* DISPOSICIÓN PRINCIPAL: MENÚ LATERAL Y CONTENIDO */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* MENÚ LATERAL (SIDEBAR) */}
          {sidebarOpen && (
            <aside className="w-full lg:w-72 shrink-0 rounded-xl bg-[#181818] border border-[#2e2e2e] p-3 space-y-2 lg:sticky lg:top-6 shadow-2xl z-20">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#2e2e2e] mb-1">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#8a8a8a] flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#ffb5d7]" />
                  Menú de Pestañas
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="text-[#8a8a8a] hover:text-white p-1 rounded hover:bg-[#252525] transition-colors cursor-pointer"
                  title="Ocultar menú lateral"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {(selectedEvent
                  ? [
                      {
                        id: "hub_eventos" as AdminTab,
                        label: "← Mis Eventos",
                        icon: ArrowLeft,
                        visible: true,
                        onClick: () => {
                          setSelectedEventId(null);
                          setActiveTab("hub_eventos");
                        },
                      },
                      {
                        id: "reservas" as AdminTab,
                        label: "Reservas & Ventas",
                        count: visibleOrders.filter((o) => o.eventId === selectedEvent.id).length,
                        icon: Wallet,
                        visible: permissions.canViewOrders,
                      },
                      {
                        id: "tickets" as AdminTab,
                        label: "Accesos QR",
                        count: visibleTickets.filter((t) => t.eventId === selectedEvent.id).length,
                        icon: QrCode,
                        visible: permissions.canViewTickets,
                      },
                      {
                        id: "mapa" as AdminTab,
                        label: "Plano & Mesas",
                        count: selectedEvent.venueMap?.spots?.length || 0,
                        icon: MapPin,
                        visible: permissions.canManageEvents,
                      },
                      {
                        id: "rendicion" as AdminTab,
                        label: "Rendición Dinero",
                        count: operatorSummaries.length,
                        icon: Users,
                        visible: permissions.canViewRendicion,
                      },
                      {
                        id: "visitas" as AdminTab,
                        label: "Visitas & Métricas",
                        count: analytics.eventStats[selectedEvent.id]?.views || 0,
                        icon: BarChart3,
                        visible: permissions.canViewAnalytics,
                      },
                      {
                        id: "eventos" as AdminTab,
                        label: "Configuración Evento",
                        icon: Calendar,
                        visible: permissions.canManageEvents,
                        onClick: () => {
                          handleLoadEventToEdit(selectedEvent);
                          setActiveTab("eventos");
                        },
                      },
                      {
                        id: "consultas" as AdminTab,
                        label: "Preguntas & Contactos",
                        count: visibleInquiries.length,
                        icon: MessageCircle,
                        visible: permissions.canManageInquiries,
                      },
                      {
                        id: "usuarios_roles" as AdminTab,
                        label: "Usuarios & Roles",
                        count: adminUsers.length,
                        icon: Users,
                        visible: isSuper || permissions.canManageUsers,
                      },
                      {
                        id: "configuracion" as AdminTab,
                        label: "Configuración CBU / DB",
                        icon: Settings,
                        visible: permissions.canManageSettings,
                      },
                    ]
                  : [
                      {
                        id: "hub_eventos" as AdminTab,
                        label: "Mis Eventos Habilitados",
                        count: visibleEvents.length,
                        icon: Calendar,
                        visible: true,
                        onClick: () => setActiveTab("hub_eventos"),
                      },
                      {
                        id: "consultas" as AdminTab,
                        label: "Preguntas & Contactos",
                        count: visibleInquiries.length,
                        icon: MessageCircle,
                        visible: permissions.canManageInquiries,
                      },
                      {
                        id: "usuarios_roles" as AdminTab,
                        label: "Usuarios & Roles",
                        count: adminUsers.length,
                        icon: Users,
                        visible: isSuper || permissions.canManageUsers,
                      },
                      {
                        id: "configuracion" as AdminTab,
                        label: "Configuración CBU / DB",
                        icon: Settings,
                        visible: permissions.canManageSettings,
                      },
                    ]
                )
                  .filter((tab) => tab.visible)
                  .map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          if (tab.onClick) {
                            tab.onClick();
                          } else {
                            setActiveTab(tab.id);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? "bg-soft-pink text-[#1c1c1c] shadow-md font-semibold"
                            : "text-white/70 hover:text-white hover:bg-[#222222]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? "text-[#1c1c1c]" : "text-[#ffb5d7]"
                            }`}
                          />
                          <span className="truncate">{tab.label}</span>
                        </div>
                        {tab.count !== undefined && (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                              isActive
                                ? "bg-black/20 text-[#1c1c1c]"
                                : "bg-[#252525] text-[#ffb5d7]"
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </nav>
            </aside>
          )}

          {/* CONTENIDO PRINCIPAL */}
          <main className="flex-1 min-w-0 w-full space-y-6">
            {!sidebarOpen && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#181818] border border-[#2e2e2e]">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex items-center gap-2 text-xs font-medium text-white hover:text-[#ffb5d7] cursor-pointer"
                >
                  <PanelLeftOpen className="w-4 h-4 text-[#ffb5d7]" />
                  <span>Mostrar menú lateral de pestañas</span>
                </button>
                <span className="text-xs text-[#8a8a8a]">
                  Pestaña activa:{" "}
                  <strong className="text-white">
                    {activeTab === "hub_eventos"
                      ? "Mis Eventos Habilitados"
                      : activeTab === "reservas"
                      ? "Reservas & Ventas"
                      : activeTab === "rendicion"
                      ? "Rendición Dinero"
                      : activeTab === "eventos"
                      ? "Configuración del Evento"
                      : activeTab === "mapa"
                      ? "Plano & Mesas"
                      : activeTab === "visitas"
                      ? "Visitas & Estadísticas"
                      : activeTab === "tickets"
                      ? "Accesos QR"
                      : activeTab === "consultas"
                      ? "Preguntas & Contactos"
                      : activeTab === "usuarios_roles"
                      ? "Roles & Usuarios"
                      : "Configuración CBU / DB"}
                  </strong>
                </span>
              </div>
            )}

            {/* BANNER DE CONTEXTO DE EVENTO SELECCIONADO */}
            {selectedEvent && (
              <div className="rounded-xl bg-[#181818] border border-[#2e2e2e] p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEventId(null);
                      setActiveTab("hub_eventos");
                    }}
                    className="p-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-white border border-[#353535] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                    title="Volver al Hub de Eventos"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#ffb5d7]" />
                    <span>Volver a Mis Eventos</span>
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-extrabold text-white">
                        {selectedEvent.title}
                      </h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#AF2C75]/20 text-[#ffb5d7] border border-[#AF2C75]/40 font-mono">
                        {selectedEvent.badge || selectedEvent.dateLabel}
                      </span>
                    </div>
                    <p className="text-xs text-[#8a8a8a] flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#ffb5d7]" />
                      <span>{selectedEvent.venueName} · {selectedEvent.time}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center gap-2 text-xs text-[#8a8a8a]">
                    <span className="hidden sm:inline">Cambiar evento:</span>
                    <select
                      value={selectedEvent.id}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__ALL__") {
                          setSelectedEventId(null);
                          setActiveTab("hub_eventos");
                        } else {
                          setSelectedEventId(val);
                          setOrderEventFilter(val);
                          setTicketEventFilter(val);
                          setRendicionEventFilter(val);
                          setDailyVisitsEventFilter(val);
                        }
                      }}
                      className="bg-[#121212] border border-[#353535] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ffb5d7]"
                    >
                      <option value="__ALL__">← Volver al Hub</option>
                      {visibleEvents.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title} ({ev.dateLabel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Link
                    href={`/eventos/${selectedEvent.slug}`}
                    target="_blank"
                    className="p-2 rounded-lg bg-[#222] hover:bg-[#2c2c2c] border border-[#353535] text-white text-xs flex items-center gap-1.5 transition-colors"
                    title="Ver página pública del evento"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#ffb5d7]" />
                    <span className="hidden sm:inline">Ver en Web</span>
                  </Link>
                </div>
              </div>
            )}

            {/* TAB HUB: MIS EVENTOS HABILITADOS */}
            {(!selectedEvent || activeTab === "hub_eventos") && (
              <div className="space-y-6">
                <div className="rounded-xl bg-[#181818] border border-[#2e2e2e] p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                      <Calendar className="w-6 h-6 text-[#ffb5d7]" />
                      Mis Eventos Habilitados
                    </h2>
                    <p className="text-xs text-[#8a8a8a]">
                      Selecciona un evento para ingresar a su panel de gestión (reservas, accesos QR, plano de mesas, rendición y métricas) sin necesidad de aplicar filtros.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {permissions.canManageEvents && (
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
                          setSelectedEventId("__NEW__");
                          setActiveTab("eventos");
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-soft-pink text-[#1c1c1c] hover:bg-white transition-all shadow-lg cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Crear Nuevo Evento</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* GRID DE EVENTOS HABILITADOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {visibleEvents.map((ev) => {
                    const evOrders = orders.filter((o) => o.eventId === ev.id);
                    const evApprovedRevenue = evOrders
                      .filter((o) => o.status === "APROBADA")
                      .reduce((acc, o) => acc + o.totalAmount, 0);
                    const evTickets = tickets.filter(
                      (t) => t.eventId === ev.id && t.status !== "ANULADO"
                    );
                    const evUsedTickets = evTickets.filter(
                      (t) => t.status === "USADO"
                    ).length;
                    const totalSpots = ev.venueMap?.spots?.length || 0;
                    const availableSpots = (ev.venueMap?.spots || []).filter(
                      (s) => s.status === "DISPONIBLE"
                    ).length;

                    return (
                      <div
                        key={ev.id}
                        className="rounded-2xl bg-[#181818] border border-[#2e2e2e] hover:border-[#ffb5d7]/50 transition-all overflow-hidden shadow-2xl flex flex-col justify-between group"
                      >
                        <div>
                          {/* Flyer / Portada */}
                          <div className="relative h-44 bg-[#121212] overflow-hidden">
                            {ev.flyerUrl ? (
                              <img
                                src={ev.flyerUrl}
                                alt={ev.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full p-4 flex items-center justify-center">
                                <BreshPosterArt event={ev} />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-black/40 to-transparent" />
                            <div className="absolute top-3 left-3 flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/70 backdrop-blur text-[#ffb5d7] border border-[#ffb5d7]/40 shadow-lg font-mono">
                                {ev.badge || ev.dateLabel}
                              </span>
                              {ev.hidden && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950/90 text-rose-300 border border-rose-800">
                                  Oculto
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Info del Evento */}
                          <div className="p-5 space-y-4">
                            <div>
                              <h3 className="text-lg font-bold text-white group-hover:text-[#ffb5d7] transition-colors truncate">
                                {ev.title}
                              </h3>
                              <p className="text-xs text-[#8a8a8a] flex items-center gap-1.5 mt-1">
                                <MapPin className="w-3.5 h-3.5 text-[#ffb5d7]" />
                                <span className="truncate">
                                  {ev.venueName} · {ev.dateLabel}
                                </span>
                              </p>
                            </div>

                            {/* Chips de Métricas del Evento */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-[#121212] p-2.5 rounded-lg border border-[#262626]">
                                <span className="text-[10px] uppercase text-[#8a8a8a] block">
                                  Recaudación
                                </span>
                                <strong className="text-sm font-mono text-white">
                                  {formatARS(evApprovedRevenue)}
                                </strong>
                              </div>

                              <div className="bg-[#121212] p-2.5 rounded-lg border border-[#262626]">
                                <span className="text-[10px] uppercase text-[#8a8a8a] block">
                                  Accesos / QRs
                                </span>
                                <strong className="text-sm font-mono text-[#ffb5d7]">
                                  {evTickets.length} emitidos ({evUsedTickets} en puerta)
                                </strong>
                              </div>

                              {totalSpots > 0 && (
                                <div className="col-span-2 bg-[#121212] p-2.5 rounded-lg border border-[#262626] flex items-center justify-between">
                                  <span className="text-[10px] uppercase text-[#8a8a8a] flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-amber-400" />
                                    <span>Plano & Mesas</span>
                                  </span>
                                  <span className="font-mono text-xs text-white">
                                    <strong className="text-emerald-400">
                                      {availableSpots}
                                    </strong>{" "}
                                    disp. / {totalSpots} total
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botón Ingresar */}
                        <div className="p-5 pt-0 space-y-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEventId(ev.id);
                              setOrderEventFilter(ev.id);
                              setTicketEventFilter(ev.id);
                              setRendicionEventFilter(ev.id);
                              setDailyVisitsEventFilter(ev.id);
                              setActiveTab("reservas");
                            }}
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-soft-pink text-[#1c1c1c] hover:bg-white shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <span>Ingresar y Gestionar Evento</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>

                          <div className="flex items-center justify-between text-[11px] text-[#8a8a8a] px-1 pt-1 border-t border-[#252525]">
                            <Link
                              href={`/eventos/${ev.slug}`}
                              target="_blank"
                              className="hover:text-white flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Ver web</span>
                            </Link>

                            <div className="flex items-center gap-3">
                              {permissions.canManageEvents && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleLoadEventToEdit(ev);
                                    setSelectedEventId(ev.id);
                                    setActiveTab("eventos");
                                  }}
                                  className="hover:text-white underline cursor-pointer"
                                >
                                  Editar
                                </button>
                              )}

                              {(permissions.canDeleteEvents || isSuper) && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (
                                      confirm(
                                        `¿Estás seguro de que deseas eliminar permanentemente el evento "${ev.title}"? Esta acción borrará el evento, sus tickets y configuraciones.`
                                      )
                                    ) {
                                      await deleteEvent(ev.id);
                                      syncAll();
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Eliminar evento definitivamente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Eliminar</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: PLANO & MESAS DEL EVENTO */}
            {activeTab === "mapa" && selectedEvent && (
              <VenueMapEditor
                event={selectedEvent}
                onSaveMap={async (newMap) => {
                  await updateEventVenueMap(selectedEvent.id, newMap);
                  syncAll();
                }}
              />
            )}

            {/* TAB 1: RESERVAS Y VENTAS */}
            {activeTab === "reservas" && (
              <div className="space-y-6">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#181818] p-3.5 rounded-lg border border-[#2e2e2e]">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Filtro por Estado */}
                    <div className="flex flex-wrap gap-1.5">
                      {["TODOS", "PENDIENTE", "APROBADA", "RECHAZADA"].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setOrderStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-sm text-xs cursor-pointer transition-all ${
                            orderStatusFilter === st
                              ? "bg-soft-pink text-[#1c1c1c] font-semibold"
                              : "bg-[#121212] border border-[#353535] text-[#8a8a8a] hover:text-white"
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

                    {/* Filtro por Evento */}
                    <div className="flex items-center gap-1.5 pl-3 border-l border-[#353535]">
                      <span className="text-xs text-[#8a8a8a] whitespace-nowrap">Evento:</span>
                      <select
                        value={orderEventFilter}
                        onChange={(e) => setOrderEventFilter(e.target.value)}
                        className="bg-[#121212] border border-[#353535] text-white text-xs rounded px-3 py-1.5 focus:border-[#ffb5d7] focus:outline-none cursor-pointer max-w-[220px] truncate"
                      >
                        <option value="TODOS">Todos los eventos ({visibleOrders.length})</option>
                        {visibleEvents.map((ev) => {
                          const evOrdersCount = visibleOrders.filter((o) => o.eventId === ev.id).length;
                          return (
                            <option key={ev.id} value={ev.id}>
                              {ev.title} ({evOrdersCount})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Buscador */}
                  <div className="relative p-1.5 bg-[#121212] border border-[#353535] text-white rounded-md w-full xl:w-80">
                    <Search className="w-4 h-4 text-[#8a8a8a] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Buscar orden, nombre, DNI o comprobante..."
                      className="w-full pl-8 pr-3 py-1 bg-transparent text-xs text-white outline-none placeholder:text-[#8a8a8a]"
                    />
                  </div>
                </div>

            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const orderTickets = tickets.filter(
                  (t) =>
                    (t.orderCode &&
                      t.orderCode.trim().toUpperCase() ===
                        order.orderCode.trim().toUpperCase()) ||
                    (t.orderId && t.orderId === order.id)
                );
                const orderEvent = events.find((e) => e.id === order.eventId);
                const orderTier = orderEvent?.ticketTiers.find(
                  (t) => t.id === order.tierId
                );
                const orderTotalQRs = Math.max(
                  1,
                  Number(order.totalQrCount) ||
                    order.quantity *
                      Math.max(
                        1,
                        Number(order.qrCountPerUnit ?? orderTier?.qrCount) || 1
                      )
                );
                const isExpanded = expandedOrderCode === order.orderCode;
                const codesListText =
                  orderTickets.length > 0
                    ? orderTickets
                        .map(
                          (t, idx) =>
                            `• Entrada #${idx + 1} (${t.holderName}): *${t.shortCode}*`
                        )
                        .join("\n")
                    : `• Código de orden / ingreso: *${order.orderCode}*`;
                const waUrl = `https://wa.me/${order.buyerPhone.replace(
                  /[^0-9]/g,
                  ""
                )}?text=${encodeURIComponent(
                  `¡Hola ${order.buyerName}! Tu entrada para *${
                    order.eventTitle
                  }* (${
                    order.eventDateLabel
                  }) fue autorizada.\n\n🔑 *Código(s) de ingreso en puerta (4 dígitos):*\n${codesListText}\n\n📲 También podés ver y descargar tu código QR en:\n${
                    typeof window !== "undefined"
                      ? window.location.origin
                      : "https://mastreinta.vercel.app"
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

                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-medium text-white">
                            {order.buyerName}
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleOpenEditOrder(order)}
                            className="p-1 rounded bg-[#252525] hover:bg-[#353535] text-[#ffb5d7] cursor-pointer"
                            title="Editar datos del cliente (nombre, teléfono, email, DNI, monto)"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-xs font-normal text-[#8a8a8a] block">
                          ({order.buyerDni ? `DNI ${order.buyerDni} · ` : ""}
                          {order.buyerPhone} ·{" "}
                          {order.buyerEmail &&
                          !order.buyerEmail.endsWith("@mas30.com") ? (
                            <strong className="text-white">
                              {order.buyerEmail}
                            </strong>
                          ) : (
                            <span className="text-amber-400 font-medium">
                              Sin email (clic en Editar para cargarlo)
                            </span>
                          )}
                          )
                        </span>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8a8a8a]">
                          <span>
                            Tickets:{" "}
                            <strong className="text-white">
                              {order.quantity}x {order.tierName} (
                              {orderTotalQRs} QR{orderTotalQRs > 1 ? "s" : ""})
                            </strong>
                          </span>
                          <span>
                            Total:{" "}
                            <strong className="text-[#ffb5d7] text-sm">
                              {formatARS(order.totalAmount)}
                            </strong>
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
                              Autorizar Pago y Crear {orderTotalQRs} QR
                              {orderTotalQRs > 1 ? "s" : ""}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditOrder(order)}
                              className="px-3 py-2.5 rounded-[3px] bg-[#2a2a2a] hover:bg-[#383838] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                              title="Editar datos del cliente"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#ffb5d7]" />
                              Editar
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
                            {orderTickets.length === 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleGenerateMissingQRs(order.id)
                                }
                                className="px-3 py-2 rounded-[3px] bg-amber-950 border border-amber-600/60 text-amber-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer hover:bg-amber-900"
                                title="Esta orden está autorizada pero no tiene QRs vinculados. Clic para generarlos ahora."
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                                Generar QRs Faltantes
                              </button>
                            )}

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

                            <button
                              type="button"
                              onClick={() => handleOpenEditOrder(order)}
                              className="px-3 py-2 rounded-[3px] bg-[#2a2a2a] hover:bg-[#383838] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                              title="Editar datos del comprador, email o monto"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#ffb5d7]" />
                              Editar Datos
                            </button>

                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-2 rounded-[3px] bg-soft-pink text-[#1c1c1c] text-xs font-medium flex items-center gap-1.5"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Enviar Código 4 Dígitos por WhatsApp
                            </a>

                            <button
                              type="button"
                              disabled={
                                sendingEmailOrderCode === order.orderCode
                              }
                              onClick={() =>
                                handleSendOrderEmail(order, orderTickets)
                              }
                              className="px-3.5 py-2 rounded-[3px] bg-[#2a2a2a] hover:bg-[#383838] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Mail className="w-4 h-4 text-[#ffb5d7]" />
                              {sendingEmailOrderCode === order.orderCode
                                ? "Enviando Email..."
                                : "Enviar QR + Flyer por Email"}
                            </button>

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

                    {emailStatusByOrder[order.orderCode] && (
                      <div
                        className={`p-3 rounded-md text-xs flex flex-wrap items-center justify-between gap-2 ${
                          emailStatusByOrder[order.orderCode].ok
                            ? "bg-[#121212] border border-[#ffb5d7]/40 text-[#ffb5d7]"
                            : "bg-red-950/50 border border-red-500/40 text-red-200"
                        }`}
                      >
                        <span>{emailStatusByOrder[order.orderCode].msg}</span>
                        {emailStatusByOrder[order.orderCode]
                          .missingCredentials && (
                          <button
                            type="button"
                            onClick={() => setActiveTab("configuracion")}
                            className="px-3 py-1 rounded bg-soft-pink text-[#1c1c1c] font-medium text-xs cursor-pointer"
                          >
                            Ir a Configurar Correo
                          </button>
                        )}
                      </div>
                    )}

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
                    <option value="TODOS">Todos los Eventos Asignados</option>
                    {visibleEvents.map((ev) => (
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
                  <div className="flex flex-col justify-end">
                    <label className="text-xs text-[#8a8a8a] mb-1.5 h-5 flex items-center truncate">
                      Encabezado (Ej: MAS30)
                    </label>
                    <input
                      type="text"
                      value={evTexts.headerLabel}
                      onChange={(e) => setEvText("headerLabel", e.target.value)}
                      placeholder="MAS30 (dejá vacío para ocultar)"
                      className="w-full h-10 px-3.5 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white outline-none focus:border-[#ffb5d7]"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="text-xs text-[#8a8a8a] mb-1.5 h-5 flex items-center truncate">
                      Nombre del Evento (Ej: HALLOWEEN) *
                    </label>
                    <input
                      type="text"
                      required
                      value={evTitle}
                      onChange={(e) => setEvTitle(e.target.value)}
                      placeholder="Ej: HALLOWEEN"
                      className="w-full h-10 px-3.5 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white outline-none focus:border-[#ffb5d7]"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="text-xs text-[#8a8a8a] mb-1.5 h-5 flex items-center truncate">
                      Categoría
                    </label>
                    <select
                      value={evCategory}
                      onChange={(e) => setEvCategory(e.target.value)}
                      className="w-full h-10 px-3.5 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white outline-none focus:border-[#ffb5d7]"
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
                  <div className="flex flex-col justify-end">
                    <label className="text-xs text-[#8a8a8a] mb-1.5 h-5 flex items-center truncate">
                      Fecha texto (Ej: sáb. 21 nov.) *
                    </label>
                    <input
                      type="text"
                      required
                      value={evDateLabel}
                      onChange={(e) => setEvDateLabel(e.target.value)}
                      className="w-full h-10 px-3.5 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white outline-none focus:border-[#ffb5d7]"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="text-xs text-[#8a8a8a] mb-1.5 h-5 flex items-center truncate">
                      Fecha corta (Ej: 21.11) *
                    </label>
                    <input
                      type="text"
                      required
                      value={evShortDate}
                      onChange={(e) => setEvShortDate(e.target.value)}
                      className="w-full h-10 px-3.5 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white outline-none focus:border-[#ffb5d7]"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="text-xs text-[#8a8a8a] mb-1.5 h-5 flex items-center truncate">
                      Horario *
                    </label>
                    <input
                      type="text"
                      required
                      value={evTime}
                      onChange={(e) => setEvTime(e.target.value)}
                      className="w-full h-10 px-3.5 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white outline-none focus:border-[#ffb5d7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
                  <div className="flex flex-col justify-end">
                    <label className="text-xs text-[#8a8a8a] mb-1.5 h-5 flex items-center truncate">
                      Nombre del Predio / Club *
                    </label>
                    <input
                      type="text"
                      required
                      value={evVenueName}
                      onChange={(e) => setEvVenueName(e.target.value)}
                      placeholder="CROBAR PALERMO"
                      className="w-full h-10 px-3.5 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white outline-none focus:border-[#ffb5d7]"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="text-xs text-[#8a8a8a] mb-1.5 h-5 flex items-center truncate">
                      Dirección / Texto de Ubicación *
                    </label>
                    <input
                      type="text"
                      required
                      value={evVenueAddress}
                      onChange={(e) => setEvVenueAddress(e.target.value)}
                      placeholder="Av. Marcelino Freyre s/n, Palermo"
                      className="w-full h-10 px-3.5 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white outline-none focus:border-[#ffb5d7]"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="text-xs text-[#8a8a8a] mb-1.5 h-5 flex items-center truncate">
                      Ciudad / Zona
                    </label>
                    <input
                      type="text"
                      value={evVenueCity}
                      onChange={(e) => setEvVenueCity(e.target.value)}
                      placeholder="Buenos Aires"
                      className="w-full h-10 px-3.5 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white outline-none focus:border-[#ffb5d7]"
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

                {/* Cobro online: cuenta destino y comisión */}
                <div className="p-4 rounded-md bg-[#121212] border border-[#353535] space-y-3.5">
                  <span className="text-xs uppercase text-[#ffb5d7] block">
                    Cobro online (Mercado Pago)
                  </span>
                  {!mpConfigured && (
                    <p className="text-xs text-amber-300">
                      Falta configurar MP_CLIENT_ID y MP_CLIENT_SECRET en el servidor.
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Cuenta que recibe el dinero de este evento
                      </label>
                      <select
                        value={evPaymentAccountId}
                        onChange={(e) => setEvPaymentAccountId(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                      >
                        <option value="">Sin pago online (solo transferencia / WhatsApp)</option>
                        {mpAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label}
                            {a.email ? ` · ${a.email}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Comisión de la plataforma (%)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={evFeePercent}
                        onChange={(e) => setEvFeePercent(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Conectar una cuenta nueva (nombre para identificarla)
                      </label>
                      <input
                        type="text"
                        value={mpNewLabel}
                        onChange={(e) => setMpNewLabel(e.target.value)}
                        placeholder="Ej: Productora Juan"
                        className="w-full px-3 py-2 rounded bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleConnectMp}
                      className="px-3 py-2 rounded bg-[#009ee3] text-white text-xs cursor-pointer"
                    >
                      Conectar Mercado Pago
                    </button>
                  </div>
                  {mpMsg && <p className="text-xs text-white/70">{mpMsg}</p>}
                  {mpAccounts.length > 0 && (
                    <ul className="text-xs text-white/60 space-y-1">
                      {mpAccounts.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2">
                          <span>
                            {a.label} · ID MP {a.mpUserId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDisconnectMp(a.id)}
                            className="text-red-300 hover:underline cursor-pointer"
                          >
                            Desconectar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
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
                            qrCount: 1,
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
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                        <div className="sm:col-span-5">
                          <span className="block text-[10px] text-[#8a8a8a] mb-0.5">
                            Nombre de la Entrada / Tanda
                          </span>
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
                            placeholder="Ej: MESA (4 INGRESOS)"
                            className="w-full px-2.5 py-1.5 rounded bg-[#1c1c1c] text-xs text-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <span className="block text-[10px] text-[#8a8a8a] mb-0.5">
                            Valor ($)
                          </span>
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
                            className="w-full px-2.5 py-1.5 rounded bg-[#1c1c1c] text-xs text-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <span className="block text-[10px] text-[#8a8a8a] mb-0.5">
                            Cupo / Stock
                          </span>
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
                            className="w-full px-2.5 py-1.5 rounded bg-[#1c1c1c] text-xs text-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <span className="block text-[10px] text-[#ffb5d7] mb-0.5">
                            Cant. QR / Accesos
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={tier.qrCount ?? 1}
                            onChange={(e) =>
                              setEvTiers((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? {
                                        ...item,
                                        qrCount: Math.max(
                                          1,
                                          Number(e.target.value) || 1
                                        ),
                                      }
                                    : item
                                )
                              )
                            }
                            placeholder="QRs (ej: 4)"
                            className="w-full px-2.5 py-1.5 rounded bg-[#1c1c1c] border border-[#ffb5d7]/40 text-xs font-medium text-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setEvTiers((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="sm:col-span-1 py-1.5 text-white/50 hover:text-white flex justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
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
                          className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded bg-[#1c1c1c] text-xs text-white/80"
                        />
                        <div className="flex items-center gap-2 text-[11px] px-2.5 py-1 rounded bg-[#1c1c1c] border border-[#353535]">
                          <span className="text-[#ffb5d7] font-medium">
                            Vendidos: {tier.sold || 0}
                          </span>
                          <span className="text-white/30">|</span>
                          <span className="text-emerald-400 font-medium">
                            Disponibles: {Math.max(0, (tier.stock || 0) - (tier.sold || 0))}
                          </span>
                          <span className="text-[#8a8a8a]">
                            (Cupo: {tier.stock || 0})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="submit"
                    className="w-full sm:flex-1 py-3.5 rounded-[3px] bg-soft-pink hover:brightness-90 text-[#1c1c1c] font-medium text-sm cursor-pointer"
                  >
                    {editingEventId ? "Guardar Cambios" : "Publicar Evento"}
                  </button>

                  {editingEventId && (permissions.canDeleteEvents || isSuper) && (
                    <button
                      type="button"
                      onClick={async () => {
                        const evToDelete = events.find((e) => e.id === editingEventId);
                        if (
                          confirm(
                            `¿Estás seguro de que deseas eliminar permanentemente el evento "${evToDelete?.title || ""}"? Esta acción borrará el evento y sus configuraciones.`
                          )
                        ) {
                          await deleteEvent(editingEventId);
                          setEditingEventId(null);
                          syncAll();
                        }
                      }}
                      className="w-full sm:w-auto px-5 py-3.5 rounded-[3px] bg-red-950/80 hover:bg-red-900 border border-red-600/40 text-red-200 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      title="Eliminar este evento"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Eliminar Evento</span>
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-lg font-normal text-white">
                Eventos Disponibles ({visibleEvents.length})
              </h3>
              {visibleEvents.map((ev) => {
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
                        {ev.createdByUsername && (
                          <span className="px-1.5 py-0.5 rounded bg-[#353535] text-[10px] text-[#ffb5d7] font-mono">
                            @{ev.createdByUsername}
                          </span>
                        )}
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

                      {/* Resumen de Tickets Vendidos y Disponibles por Evento y por Tanda */}
                      <div className="mt-2 p-2.5 rounded bg-[#121212] border border-[#353535] space-y-1.5 text-xs">
                        {(() => {
                          const totalStock = ev.ticketTiers.reduce(
                            (acc, t) => acc + (Number(t.stock) || 0),
                            0
                          );
                          const totalSold = ev.ticketTiers.reduce(
                            (acc, t) => acc + (Number(t.sold) || 0),
                            0
                          );
                          const totalAvailable = Math.max(
                            0,
                            totalStock - totalSold
                          );
                          const eventQRsIssued = tickets.filter(
                            (tk) => tk.eventId === ev.id && tk.status !== "ANULADO"
                          ).length;
                          return (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-white/10">
                                <span className="text-[#ffb5d7] font-medium">
                                  Vendidos: {totalSold} ({eventQRsIssued} QRs)
                                </span>
                                <span className="text-emerald-400 font-medium">
                                  Disponibles: {totalAvailable} / {totalStock}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-white/10 text-[11px] text-white/80">
                                <span>
                                  👁 Visitas al evento:{" "}
                                  <strong className="text-white">
                                    {analytics.eventStats[ev.id]?.views || 0}
                                  </strong>
                                  {analytics.eventStats[ev.id]?.dailyVisits?.[getArgentinaDateKey()] ? (
                                    <span className="text-[10px] text-[#ffb5d7] ml-1 font-mono">
                                      (Hoy: {analytics.eventStats[ev.id]?.dailyVisits?.[getArgentinaDateKey()]})
                                    </span>
                                  ) : null}
                                </span>
                                <span>
                                  💬 Clics WhatsApp:{" "}
                                  <strong className="text-[#ffb5d7]">
                                    {analytics.eventStats[ev.id]?.whatsappClicks || 0}
                                  </strong>
                                </span>
                              </div>
                              <div className="space-y-1">
                                {ev.ticketTiers.map((t) => {
                                  const avail = Math.max(
                                    0,
                                    (Number(t.stock) || 0) - (Number(t.sold) || 0)
                                  );
                                  return (
                                    <div
                                      key={t.id}
                                      className="flex items-center justify-between text-[11px] text-[#8a8a8a]"
                                    >
                                      <span className="truncate pr-2 text-white/85">
                                        {t.name}
                                      </span>
                                      <span className="shrink-0">
                                        <strong className="text-[#ffb5d7]">
                                          {t.sold || 0} vend.
                                        </strong>{" "}
                                        ·{" "}
                                        <strong className="text-emerald-400">
                                          {avail} disp.
                                        </strong>{" "}
                                        ({t.stock})
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                      </div>

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

                        {(permissions.canDeleteEvents || isSuper) && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                confirm(
                                  `¿Estás seguro de que deseas eliminar permanentemente el evento "${ev.title}"? Esta acción borrará el evento y sus configuraciones.`
                                )
                              ) {
                                await deleteEvent(ev.id);
                                syncAll();
                              }
                            }}
                            className="px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-700/50 text-red-300 text-xs font-medium flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
                            title="Eliminar evento permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB VISITAS & ESTADÍSTICAS */}
        {activeTab === "visitas" && (
          <div className="space-y-8">
            <div className="rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#ffb5d7] text-xs uppercase font-medium">
                    <BarChart3 className="w-4 h-4" />
                    Tráfico en Tiempo Real & Visibilidad
                  </div>
                  <h2 className="text-2xl font-normal text-white">
                    Visitas a la Página y Rendimiento por Evento
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#8a8a8a]">
                    <span>
                      Mide el ingreso de personas a la web y las visitas a cada evento día por día.
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#252525] text-[#ffb5d7] text-[11px] font-mono">
                      Zona horaria: Buenos Aires (GMT-3)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleExportDailyVisitsCSV}
                    className="px-3.5 py-2 rounded-[3px] bg-white text-black hover:bg-white/90 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar Visitas Día a Día (.csv)
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        confirm(
                          "¿Querés reiniciar todos los contadores de visitas a cero?"
                        )
                      ) {
                        await resetAnalytics();
                        syncAll();
                      }
                    }}
                    className="px-3.5 py-2 rounded-[3px] bg-[#353535] hover:bg-[#454545] text-white/80 hover:text-white text-xs cursor-pointer"
                  >
                    Reiniciar Contadores
                  </button>
                </div>
              </div>

              {/* 4 TARJETAS DE TRÁFICO GENERAL */}
              {(() => {
                const todayKey = getArgentinaDateKey();
                const todayVisits = analytics.dailyVisits[todayKey] || 0;
                const totalEventViews = Object.values(
                  analytics.eventStats || {}
                ).reduce((acc, s) => acc + (Number(s?.views) || 0), 0);
                const todayEventViews = Object.values(
                  analytics.eventStats || {}
                ).reduce(
                  (acc, s) => acc + (Number(s?.dailyVisits?.[todayKey]) || 0),
                  0
                );

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-lg bg-[#121212] border border-[#353535] space-y-1">
                      <span className="text-xs text-[#8a8a8a] block">
                        Visitas Totales a la Página
                      </span>
                      <p className="text-3xl font-medium text-white">
                        {analytics.totalSiteVisits}
                      </p>
                      <p className="text-xs text-[#ffb5d7]">
                        Hoy ({formatArgentinaDate(todayKey, { includeWeekday: true })}): {todayVisits} visitas
                      </p>
                    </div>

                    <div className="p-5 rounded-lg bg-[#121212] border border-[#353535] space-y-1">
                      <span className="text-xs text-[#8a8a8a] block">
                        Visitantes Únicos (Dispositivos)
                      </span>
                      <p className="text-3xl font-medium text-white">
                        {analytics.uniqueVisitors}
                      </p>
                      <p className="text-xs text-[#8a8a8a]">
                        Personas distintas que ingresaron
                      </p>
                    </div>

                    <div className="p-5 rounded-lg bg-[#121212] border border-[#353535] space-y-1">
                      <span className="text-xs text-[#8a8a8a] block">
                        Vistas de Eventos (Flyers Abiertos)
                      </span>
                      <p className="text-3xl font-medium text-[#ffb5d7]">
                        {totalEventViews}
                      </p>
                      <p className="text-xs text-[#8a8a8a]">
                        Hoy: {todayEventViews} aperturas
                      </p>
                    </div>

                    <div className="p-5 rounded-lg bg-[#121212] border border-[#353535] space-y-1">
                      <span className="text-xs text-[#8a8a8a] block">
                        Clics al WhatsApp de Compra
                      </span>
                      <p className="text-3xl font-medium text-emerald-400">
                        {analytics.totalWhatsappClicks}
                      </p>
                      <p className="text-xs text-[#8a8a8a]">
                        Intenciones de compra / consulta
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* VISIBILIDAD DETALLADA POR CADA EVENTO */}
              <div className="space-y-4 pt-4 border-t border-[#353535]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-base font-medium text-white">
                    Visibilidad, Tráfico y Disponibilidad por Evento
                  </h3>
                  <span className="text-xs text-[#8a8a8a]">
                    Hacé clic en &quot;Ver días&quot; en cualquier evento para ver su desglose individual.
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-[#353535]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121212] text-[#8a8a8a] uppercase border-b border-[#353535]">
                      <tr>
                        <th className="py-3.5 px-4">Evento</th>
                        <th className="py-3.5 px-4">Estado Visibilidad</th>
                        <th className="py-3.5 px-4 text-center">
                          Visitas al Evento
                        </th>
                        <th className="py-3.5 px-4 text-center">
                          Detalle (Portada / Link)
                        </th>
                        <th className="py-3.5 px-4 text-center">
                          Clics WhatsApp
                        </th>
                        <th className="py-3.5 px-4 text-center">
                          Tickets Vendidos
                        </th>
                        <th className="py-3.5 px-4 text-center">
                          Tickets Disponibles
                        </th>
                        <th className="py-3.5 px-4 text-right">
                          Última Visita
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#353535] bg-[#121212]/40">
                      {(() => {
                        const todayKey = getArgentinaDateKey();
                        const maxViews = Math.max(
                          1,
                          ...visibleEvents.map(
                            (e) => analytics.eventStats[e.id]?.views || 0
                          )
                        );
                        return visibleEvents.map((ev) => {
                          const st = analytics.eventStats[ev.id] || {
                            views: 0,
                            modalOpens: 0,
                            pageViews: 0,
                            whatsappClicks: 0,
                            dailyVisits: {},
                          };
                          const totalStock = ev.ticketTiers.reduce(
                            (acc, t) => acc + (Number(t.stock) || 0),
                            0
                          );
                          const totalSold = ev.ticketTiers.reduce(
                            (acc, t) => acc + (Number(t.sold) || 0),
                            0
                          );
                          const totalAvailable = Math.max(
                            0,
                            totalStock - totalSold
                          );
                          const isPublicNow = isEventVisiblePublicly(ev);
                          const pct = Math.round((st.views / maxViews) * 100);
                          const isExpanded = !!expandedEventDaily[ev.id];
                          const daysCount = Object.keys(st.dailyVisits || {}).length;
                          const todayCount = st.dailyVisits?.[todayKey] || 0;

                          return (
                            <React.Fragment key={ev.id}>
                              <tr className="hover:bg-[#1c1c1c]">
                                <td className="py-3.5 px-4">
                                  <span className="font-medium text-white block text-sm">
                                    {ev.title}
                                  </span>
                                  <span className="text-[#8a8a8a] text-[11px]">
                                    {ev.dateLabel} · {ev.venueName}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  {ev.hidden ? (
                                    <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 text-[11px]">
                                      Oculto
                                    </span>
                                  ) : isPublicNow ? (
                                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[11px]">
                                      Visible en Web
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-[#353535] text-[#ffb5d7] text-[11px]">
                                      Programado
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="text-base font-semibold text-white block">
                                    {st.views}
                                  </span>
                                  <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[#ffb5d7]/10 text-[#ffb5d7] font-medium font-mono">
                                    Hoy: {todayCount}
                                  </span>
                                  <div className="w-24 mx-auto h-1.5 rounded-full bg-[#2a2a2a] overflow-hidden mt-1">
                                    <div
                                      className="h-full bg-[#ffb5d7]"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedEventDaily((prev) => ({
                                        ...prev,
                                        [ev.id]: !prev[ev.id],
                                      }))
                                    }
                                    className="mt-1 text-[11px] text-[#ffb5d7] hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                                  >
                                    {isExpanded
                                      ? "Ocultar días ▲"
                                      : `Ver días (${daysCount}) ▾`}
                                  </button>
                                </td>
                                <td className="py-3.5 px-4 text-center text-[#8a8a8a]">
                                  {st.modalOpens || 0} modal · {st.pageViews || 0}{" "}
                                  pág.
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="px-2.5 py-1 rounded bg-[#252525] text-[#ffb5d7] font-medium">
                                    {st.whatsappClicks || 0}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center font-medium text-white">
                                  {totalSold}
                                </td>
                                <td className="py-3.5 px-4 text-center font-medium text-emerald-400">
                                  {totalAvailable}{" "}
                                  <span className="text-[#8a8a8a] font-normal">
                                    / {totalStock}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right text-[#8a8a8a] whitespace-nowrap">
                                  {st.lastVisitedAt
                                    ? formatArgentinaDateTime(st.lastVisitedAt)
                                    : "Sin visitas aún"}
                                </td>
                              </tr>

                              {/* SUB-FILA EXPANDIBLE CON EL DESGLOSE DÍA POR DÍA DE ESTE EVENTO */}
                              {isExpanded && (
                                <tr className="bg-[#181818] border-b border-[#353535]">
                                  <td colSpan={8} className="p-4">
                                    <div className="rounded-lg bg-[#121212] border border-[#353535] p-4 space-y-3">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2a2a2a] pb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold text-white">
                                            Historial Día por Día: {ev.title}
                                          </span>
                                          <span className="text-[11px] px-2 py-0.5 rounded bg-[#252525] text-[#8a8a8a]">
                                            Hora oficial: Buenos Aires (GMT-3)
                                          </span>
                                        </div>
                                        <span className="text-xs text-[#8a8a8a]">
                                          Total acumulado:{" "}
                                          <strong className="text-[#ffb5d7]">
                                            {st.views}
                                          </strong>{" "}
                                          visitas | Hoy:{" "}
                                          <strong className="text-white">
                                            {todayCount}
                                          </strong>
                                        </span>
                                      </div>

                                      {daysCount === 0 ? (
                                        <p className="text-xs text-[#8a8a8a] py-2 italic">
                                          Aún no se han registrado visitas por día para este evento.
                                        </p>
                                      ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
                                          {Object.entries(st.dailyVisits || {})
                                            .sort(([a], [b]) => b.localeCompare(a))
                                            .map(([dKey, count]) => {
                                              const isDayToday = dKey === todayKey;
                                              const dayPct =
                                                st.views > 0
                                                  ? Math.round(
                                                      (count / st.views) * 100
                                                    )
                                                  : 0;
                                              return (
                                                <div
                                                  key={dKey}
                                                  className={`p-2.5 rounded border text-center transition-all ${
                                                    isDayToday
                                                      ? "bg-[#ffb5d7]/10 border-[#ffb5d7]/50 ring-1 ring-[#ffb5d7]/30"
                                                      : "bg-[#161616] border-[#303030]"
                                                  }`}
                                                >
                                                  <div className="flex items-center justify-between text-[10px] text-[#8a8a8a] mb-1 font-mono">
                                                    <span>
                                                      {
                                                        formatArgentinaDate(dKey, {
                                                          includeWeekday: true,
                                                        }).split(",")[0]
                                                      }
                                                    </span>
                                                    {isDayToday && (
                                                      <span className="px-1 py-0.2 rounded bg-[#ffb5d7] text-black font-semibold text-[9px]">
                                                        HOY
                                                      </span>
                                                    )}
                                                  </div>
                                                  <span className="text-xs text-white block font-mono font-medium">
                                                    {formatArgentinaDate(dKey)}
                                                  </span>
                                                  <strong className="text-lg text-[#ffb5d7] block mt-0.5">
                                                    {count}
                                                  </strong>
                                                  <span className="text-[10px] text-[#8a8a8a] block">
                                                    visitas ({dayPct}%)
                                                  </span>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECCIÓN INTERACTIVA: DESGLOSE DE VISITAS DÍA POR DÍA POR EVENTO */}
              <div className="space-y-4 pt-4 border-t border-[#353535]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-medium text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#ffb5d7]" />
                      Detalle Día por Día de Visitas por Evento
                    </h3>
                    <p className="text-xs text-[#8a8a8a]">
                      Evolución diaria de visitas para cada evento en hora oficial argentina (UTC-3).
                    </p>
                  </div>

                  {/* Selector de Evento */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8a8a8a]">Filtrar evento:</span>
                    <select
                      value={dailyVisitsEventFilter}
                      onChange={(e) => setDailyVisitsEventFilter(e.target.value)}
                      className="bg-[#121212] border border-[#353535] text-white text-xs rounded px-3 py-1.5 focus:border-[#ffb5d7] focus:outline-none"
                    >
                      <option value="TODOS">Todos los eventos (Comparativa)</option>
                      {visibleEvents.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title} ({analytics.eventStats[ev.id]?.views || 0} visitas)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* VISTA SEGÚN FILTRO: COMPARATIVA O ESPECÍFICA */}
                {(() => {
                  const todayKey = getArgentinaDateKey();
                  const allDatesSet = new Set<string>();
                  Object.keys(analytics.dailyVisits || {}).forEach((d) =>
                    allDatesSet.add(d)
                  );
                  Object.values(analytics.eventStats || {}).forEach((st) => {
                    Object.keys(st.dailyVisits || {}).forEach((d) =>
                      allDatesSet.add(d)
                    );
                  });
                  const sortedDates = Array.from(allDatesSet).sort((a, b) =>
                    b.localeCompare(a)
                  );

                  if (sortedDates.length === 0) {
                    return (
                      <div className="p-6 rounded-lg bg-[#121212] border border-[#353535] text-center text-[#8a8a8a] text-xs">
                        Aún no hay visitas diarias registradas.
                      </div>
                    );
                  }

                  if (dailyVisitsEventFilter === "TODOS") {
                    return (
                      <div className="overflow-x-auto rounded-lg border border-[#353535]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#121212] text-[#8a8a8a] uppercase border-b border-[#353535]">
                            <tr>
                              <th className="py-3 px-4">Fecha (Bs. As.)</th>
                              <th className="py-3 px-4 text-center">
                                Visitas Web Totales
                              </th>
                              {visibleEvents.map((ev) => (
                                <th
                                  key={ev.id}
                                  className="py-3 px-4 text-center"
                                >
                                  {ev.title}
                                </th>
                              ))}
                              <th className="py-3 px-4 text-center text-[#ffb5d7]">
                                Total Vistas Eventos
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#353535] bg-[#121212]/40 font-mono">
                            {sortedDates.map((dKey) => {
                              const isToday = dKey === todayKey;
                              const siteCount =
                                analytics.dailyVisits[dKey] || 0;
                              let dayEventsTotal = 0;

                              return (
                                <tr
                                  key={dKey}
                                  className={`hover:bg-[#1c1c1c] ${
                                    isToday ? "bg-[#ffb5d7]/5 font-semibold" : ""
                                  }`}
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <span className="text-white font-medium">
                                        {formatArgentinaDate(dKey, {
                                          includeWeekday: true,
                                        })}
                                      </span>
                                      {isToday && (
                                        <span className="px-1.5 py-0.5 rounded bg-[#ffb5d7] text-black text-[9px] font-bold uppercase">
                                          Hoy
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-[#8a8a8a] block">
                                      {dKey}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center text-white font-medium">
                                    {siteCount > 0 ? (
                                      <span className="px-2 py-0.5 rounded bg-[#252525]">
                                        {siteCount}
                                      </span>
                                    ) : (
                                      <span className="text-[#555]">-</span>
                                    )}
                                  </td>
                                  {visibleEvents.map((ev) => {
                                    const evDaily =
                                      analytics.eventStats[ev.id]?.dailyVisits ||
                                      {};
                                    const c = evDaily[dKey] || 0;
                                    dayEventsTotal += c;
                                    return (
                                      <td
                                        key={ev.id}
                                        className="py-3 px-4 text-center"
                                      >
                                        {c > 0 ? (
                                          <span className="px-2 py-0.5 rounded bg-[#ffb5d7]/15 text-[#ffb5d7] font-semibold">
                                            {c}
                                          </span>
                                        ) : (
                                          <span className="text-[#454545]">
                                            -
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="py-3 px-4 text-center text-[#ffb5d7] font-semibold">
                                    {dayEventsTotal > 0 ? (
                                      dayEventsTotal
                                    ) : (
                                      <span className="text-[#555]">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  // Evento específico seleccionado
                  const targetEvent = visibleEvents.find(
                    (e) => e.id === dailyVisitsEventFilter
                  );
                  const st = targetEvent
                    ? analytics.eventStats[targetEvent.id]
                    : undefined;
                  const evDaily = st?.dailyVisits || {};
                  const eventTotal = st?.views || 0;
                  const activeDaysCount = Object.keys(evDaily).length;
                  const avgPerDay =
                    activeDaysCount > 0
                      ? Math.round(eventTotal / activeDaysCount)
                      : 0;

                  return (
                    <div className="space-y-4">
                      {/* Resumen del evento seleccionado */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded bg-[#121212] border border-[#353535]">
                          <span className="text-[11px] text-[#8a8a8a] block">
                            Evento
                          </span>
                          <span className="text-sm font-semibold text-white truncate block">
                            {targetEvent?.title || "Evento"}
                          </span>
                        </div>
                        <div className="p-3.5 rounded bg-[#121212] border border-[#353535]">
                          <span className="text-[11px] text-[#8a8a8a] block">
                            Visitas Totales
                          </span>
                          <span className="text-xl font-bold text-[#ffb5d7]">
                            {eventTotal}
                          </span>
                        </div>
                        <div className="p-3.5 rounded bg-[#121212] border border-[#353535]">
                          <span className="text-[11px] text-[#8a8a8a] block">
                            Visitas Hoy
                          </span>
                          <span className="text-xl font-bold text-white">
                            {evDaily[todayKey] || 0}
                          </span>
                        </div>
                        <div className="p-3.5 rounded bg-[#121212] border border-[#353535]">
                          <span className="text-[11px] text-[#8a8a8a] block">
                            Promedio por Día Activo
                          </span>
                          <span className="text-xl font-bold text-emerald-400">
                            {avgPerDay}
                          </span>
                        </div>
                      </div>

                      {/* Lista / Grid de días del evento */}
                      {activeDaysCount === 0 ? (
                        <div className="p-6 rounded bg-[#121212] border border-[#353535] text-center text-xs text-[#8a8a8a]">
                          Este evento no tiene visitas diarias registradas todavía.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-[#353535]">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#121212] text-[#8a8a8a] uppercase border-b border-[#353535]">
                              <tr>
                                <th className="py-3 px-4">Fecha</th>
                                <th className="py-3 px-4 text-center">
                                  Visitas del Día
                                </th>
                                <th className="py-3 px-4 text-center">
                                  % del Total del Evento
                                </th>
                                <th className="py-3 px-4">
                                  Proporción Visual
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#353535] bg-[#121212]/40">
                              {Object.entries(evDaily)
                                .sort(([a], [b]) => b.localeCompare(a))
                                .map(([dKey, count]) => {
                                  const isToday = dKey === todayKey;
                                  const pct =
                                    eventTotal > 0
                                      ? Math.round((count / eventTotal) * 100)
                                      : 0;
                                  return (
                                    <tr
                                      key={dKey}
                                      className={`hover:bg-[#1c1c1c] ${
                                        isToday
                                          ? "bg-[#ffb5d7]/5 font-semibold"
                                          : ""
                                      }`}
                                    >
                                      <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                          <span className="text-white font-medium">
                                            {formatArgentinaDate(dKey, {
                                              includeWeekday: true,
                                            })}
                                          </span>
                                          {isToday && (
                                            <span className="px-1.5 py-0.5 rounded bg-[#ffb5d7] text-black text-[9px] font-bold">
                                              HOY
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-[#8a8a8a] font-mono">
                                          {dKey}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        <span className="text-base font-bold text-[#ffb5d7]">
                                          {count}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-center text-[#8a8a8a] font-mono">
                                        {pct}%
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="w-full max-w-xs h-2 rounded-full bg-[#2a2a2a] overflow-hidden">
                                          <div
                                            className="h-full bg-[#ffb5d7]"
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* HISTORIAL GENERAL DE VISITAS A LA WEB POR DÍA */}
              {Object.keys(analytics.dailyVisits || {}).length > 0 && (
                <div className="space-y-3 pt-4 border-t border-[#353535]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">
                      Visitas Globales a la Web por Día (Últimos 14 días)
                    </h3>
                    <span className="text-[11px] text-[#8a8a8a]">
                      Horario local de Buenos Aires (UTC-3)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                    {Object.entries(analytics.dailyVisits)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .slice(0, 14)
                      .map(([dateStr, count]) => {
                        const isToday = dateStr === getArgentinaDateKey();
                        return (
                          <div
                            key={dateStr}
                            className={`p-3 rounded-md border text-center transition-all ${
                              isToday
                                ? "bg-[#ffb5d7]/10 border-[#ffb5d7]/50 ring-1 ring-[#ffb5d7]/30"
                                : "bg-[#121212] border-[#353535]"
                            }`}
                          >
                            <span className="text-[11px] text-[#8a8a8a] block font-mono">
                              {
                                formatArgentinaDate(dateStr, {
                                  includeWeekday: true,
                                }).split(",")[0]
                              }
                            </span>
                            <span className="text-xs text-white block font-mono font-medium">
                              {formatArgentinaDate(dateStr)}
                            </span>
                            <strong className="text-lg text-[#ffb5d7] block mt-1">
                              {count}
                            </strong>
                            <span className="text-[10px] text-[#8a8a8a] block">
                              {isToday ? "visitas hoy" : "visitas"}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ACCESOS QR */}
        {activeTab === "tickets" && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-normal text-white flex items-center gap-2">
                  <QrCode className="w-6 h-6 text-[#ffb5d7]" />
                  Padrón de Tickets QR Individuales
                  <span className="text-sm font-mono text-[#8a8a8a]">
                    ({filteredTickets.length} de {visibleTickets.length})
                  </span>
                </h2>
                <p className="text-xs text-[#8a8a8a]">
                  Control y verificación de accesos en puerta. Podés buscar asistentes, habilitar, bloquear o eliminar accesos y exportar el padrón oficial.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Selector de Modo de Vista */}
                <div className="flex rounded-md border border-[#353535] bg-[#121212] p-0.5">
                  <button
                    type="button"
                    onClick={() => setTicketViewMode("lista")}
                    className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                      ticketViewMode === "lista"
                        ? "bg-white text-black font-semibold shadow-sm"
                        : "text-[#8a8a8a] hover:text-white"
                    }`}
                  >
                    <Menu className="w-3.5 h-3.5" />
                    Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketViewMode("tarjetas")}
                    className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                      ticketViewMode === "tarjetas"
                        ? "bg-white text-black font-semibold shadow-sm"
                        : "text-[#8a8a8a] hover:text-white"
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Tarjetas QR
                  </button>
                </div>

                {/* Botón Exportar PDF */}
                <button
                  type="button"
                  onClick={handleExportTicketsPDF}
                  className="px-3.5 py-2 rounded-[3px] bg-[#ffb5d7] hover:bg-[#ffb5d7]/90 text-black text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  title="Exportar padrón filtrado para imprimir o guardar como PDF"
                >
                  <Printer className="w-4 h-4" />
                  Exportar Padrón PDF
                </button>

                {/* Botón Exportar CSV */}
                <button
                  type="button"
                  onClick={handleExportTicketsCSV}
                  className="px-3.5 py-2 rounded-[3px] bg-[#252525] hover:bg-[#353535] border border-[#404040] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              </div>
            </div>

            {/* BARRA DE FILTROS Y BÚSQUEDA */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#181818] p-3.5 rounded-lg border border-[#2e2e2e]">
              <div className="flex flex-wrap items-center gap-3">
                {/* Filtro por Evento */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#8a8a8a] whitespace-nowrap">Evento:</span>
                  <select
                    value={ticketEventFilter}
                    onChange={(e) => setTicketEventFilter(e.target.value)}
                    className="bg-[#121212] border border-[#353535] text-white text-xs rounded px-3 py-1.5 focus:border-[#ffb5d7] focus:outline-none cursor-pointer max-w-[240px] truncate"
                  >
                    <option value="TODOS">Todos los Eventos ({visibleTickets.length})</option>
                    {visibleEvents.map((ev) => {
                      const count = visibleTickets.filter((t) => t.eventId === ev.id).length;
                      return (
                        <option key={ev.id} value={ev.id}>
                          {ev.title} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Filtro por Estado */}
                <div className="flex flex-wrap gap-1 pl-2 border-l border-[#353535]">
                  {[
                    { id: "TODOS", label: "Todos", count: visibleTickets.length },
                    {
                      id: "VALIDO",
                      label: "Válidos",
                      count: visibleTickets.filter((t) => t.status === "VALIDO").length,
                    },
                    {
                      id: "USADO",
                      label: "Ingresados",
                      count: visibleTickets.filter((t) => t.status === "USADO").length,
                    },
                    {
                      id: "BLOQUEADO",
                      label: "Bloqueados",
                      count: visibleTickets.filter(
                        (t) => t.status === "BLOQUEADO" || t.status === "ANULADO"
                      ).length,
                    },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setTicketStatusFilter(st.id)}
                      className={`px-2.5 py-1 rounded text-xs cursor-pointer transition-all ${
                        ticketStatusFilter === st.id
                          ? "bg-soft-pink text-black font-semibold"
                          : "bg-[#121212] border border-[#353535] text-[#8a8a8a] hover:text-white"
                      }`}
                    >
                      {st.label} ({st.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Buscador de Asistente */}
              <div className="relative p-1.5 bg-[#121212] border border-[#353535] text-white rounded-md w-full xl:w-96">
                <Search className="w-4 h-4 text-[#8a8a8a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  placeholder="Buscar por nombre, DNI, código QR o N° orden..."
                  className="w-full pl-8 pr-3 py-1 bg-transparent text-xs text-white outline-none placeholder:text-[#8a8a8a]"
                />
              </div>
            </div>

            {/* VISTA 1: TABLA / LISTA DE ACCESOS */}
            {ticketViewMode === "lista" && (
              <div className="overflow-x-auto rounded-lg border border-[#353535]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121212] text-[#8a8a8a] uppercase border-b border-[#353535]">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Nombre Asistente</th>
                      <th className="py-3 px-4">DNI</th>
                      <th className="py-3 px-4">Evento</th>
                      <th className="py-3 px-4">Sector / Entrada</th>
                      <th className="py-3 px-4">Orden</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-center">Ingreso & Puerta / Operador</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#353535] bg-[#121212]/40">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-[#8a8a8a] italic">
                          No se encontraron accesos con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((t, idx) => {
                        const isUsed = t.status === "USADO";
                        const isBlocked =
                          t.status === "BLOQUEADO" || t.status === "ANULADO";
                        const isValid = t.status === "VALIDO";

                        return (
                          <tr
                            key={t.id}
                            className={`hover:bg-[#1c1c1c] transition-colors ${
                              isBlocked ? "bg-red-950/10" : isUsed ? "bg-[#181818]" : ""
                            }`}
                          >
                            <td className="py-3 px-4 text-center text-[#666] font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-[#252525] border border-[#404040]">
                                {t.shortCode}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-white block text-sm">
                                {t.holderName}
                              </span>
                              <div className="flex flex-col text-[11px] text-[#8a8a8a]">
                                {t.buyerPhone && (
                                  <span>Tel: {t.buyerPhone}</span>
                                )}
                                {t.buyerEmail && !t.buyerEmail.endsWith("@mas30.com") && (
                                  <span>Email: {t.buyerEmail}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-white/90">
                              {t.holderDni || "-"}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-white block truncate max-w-[180px]">
                                {t.eventTitle}
                              </span>
                              <span className="text-[10px] text-[#8a8a8a] block">
                                {t.eventDateLabel}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[#ffb5d7]">
                              {t.tierName}
                            </td>
                            <td className="py-3 px-4 font-mono text-[#8a8a8a] text-[11px]">
                              {t.orderCode}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40 text-[11px] font-semibold">
                                  <Check className="w-3 h-3" /> Válido
                                </span>
                              ) : isUsed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-pink-950 text-pink-300 border border-pink-800/40 text-[11px] font-semibold">
                                  ✓ Ingresado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/40 text-[11px] font-semibold">
                                  ✕ Bloqueado
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-xs whitespace-nowrap">
                              {t.scannedAt ? (
                                <div className="space-y-0.5 inline-block text-left">
                                  <span className="text-[#ffb5d7] font-medium block">
                                    {formatArgentinaDateTime(t.scannedAt)}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[10px]">
                                    <span className="px-1.5 py-0.2 rounded bg-white/10 text-white font-mono">
                                      {t.scannedDoor || "Puerta Principal"}
                                    </span>
                                    {(t.scannedByName || t.scannedBy) && (
                                      <span className="text-[#8a8a8a]">
                                        por {t.scannedByName || t.scannedBy}
                                        {t.scannedByUsername ? ` (@${t.scannedByUsername})` : ""}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[#555] text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Botón Habilitar (si está usado o bloqueado) */}
                                {(isUsed || isBlocked) && (
                                  <button
                                    type="button"
                                    onClick={() => handleRehabilitateTicket(t)}
                                    className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 flex items-center gap-1 text-[11px] font-medium cursor-pointer transition-colors"
                                    title="Volver a habilitar para que pueda ingresar"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    Habilitar
                                  </button>
                                )}

                                {/* Botón Bloquear (si está válido) */}
                                {isValid && (
                                  <button
                                    type="button"
                                    onClick={() => handleBlockTicket(t)}
                                    className="px-2.5 py-1 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/50 flex items-center gap-1 text-[11px] font-medium cursor-pointer transition-colors"
                                    title="Bloquear acceso para que el lector QR lo rechace"
                                  >
                                    <Ban className="w-3 h-3" />
                                    Bloquear
                                  </button>
                                )}

                                {/* Botón Eliminar */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTicket(t)}
                                  className="p-1 rounded bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/40 cursor-pointer transition-colors"
                                  title="Eliminar este ticket del padrón"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* VISTA 2: TARJETAS QR CON BOTONES DE ACCIÓN */}
            {ticketViewMode === "tarjetas" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTickets.map((t) => {
                  const isUsed = t.status === "USADO";
                  const isBlocked =
                    t.status === "BLOQUEADO" || t.status === "ANULADO";
                  const isValid = t.status === "VALIDO";

                  return (
                    <div
                      key={t.id}
                      className="rounded-xl overflow-hidden border border-[#353535] bg-[#161616] flex flex-col"
                    >
                      <TicketQRCard ticket={t} compact />
                      
                      {/* BARRA DE CONTROL DE ACCESO INFERIOR */}
                      {isUsed && t.scannedAt && (
                        <div className="px-3 py-1.5 bg-[#0e0e0e] border-t border-[#222] text-[10px] text-[#ffb5d7] flex flex-wrap items-center justify-between gap-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatArgentinaDateTime(t.scannedAt)}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-white/10 text-white font-mono">
                            {t.scannedDoor || "Puerta Principal"}
                          </span>
                          {(t.scannedByName || t.scannedBy) && (
                            <span className="text-[#8a8a8a]">
                              por {t.scannedByName || t.scannedBy}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="p-3 bg-[#111] border-t border-[#2a2a2a] flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-[#8a8a8a]">Estado:</span>
                          {isValid ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                              VÁLIDO
                            </span>
                          ) : isUsed ? (
                            <span className="px-2 py-0.5 rounded bg-pink-950 text-pink-300 text-[10px] font-bold">
                              INGRESADO
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 text-[10px] font-bold">
                              BLOQUEADO
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {(isUsed || isBlocked) && (
                            <button
                              type="button"
                              onClick={() => handleRehabilitateTicket(t)}
                              className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 text-[11px] flex items-center gap-1 cursor-pointer"
                              title="Habilitar ticket"
                            >
                              <RefreshCw className="w-3 h-3" /> Habilitar
                            </button>
                          )}
                          {isValid && (
                            <button
                              type="button"
                              onClick={() => handleBlockTicket(t)}
                              className="px-2 py-1 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700/50 text-[11px] flex items-center gap-1 cursor-pointer"
                              title="Bloquear ticket"
                            >
                              <Ban className="w-3 h-3" /> Bloquear
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(t)}
                            className="p-1 rounded bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/40 cursor-pointer"
                            title="Eliminar ticket"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                      Todos los Eventos Asignados
                    </option>
                    {visibleEvents.map((ev) => (
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

        {/* TAB ROLES, PERMISOS Y GESTIÓN DE USUARIOS */}
        {activeTab === "usuarios_roles" && (isSuper || permissions.canManageUsers) && (
          <div className="space-y-10">
            {/* BANNER INFORMATIVO */}
            <div className="rounded-lg bg-gradient-to-r from-[#2a1322] via-[#1c1c1c] to-[#1c1c1c] p-6 sm:p-8 border border-[#ffb5d7]/30 space-y-3">
              <div className="flex items-center gap-2 text-[#ffb5d7] text-xs uppercase tracking-wider">
                <Users className="w-4 h-4" />
                Panel de Usuarios & Control de Accesos
              </div>
              <h2 className="text-2xl sm:text-3xl font-normal text-white">
                Gestión de Usuarios del Sistema y Asignación de Eventos
              </h2>
              <p className="text-xs text-white/70 max-w-3xl leading-relaxed">
                Creá usuarios para tu equipo (administradores, cajeros de barra, personal de puerta o de consulta), asignales contraseñas y elegí <strong>únicamente los eventos que cada uno podrá gestionar</strong>. También podés editar datos, resetear contraseñas o eliminar usuarios cuando ya no formen parte del equipo.
              </p>
            </div>

            {/* SECCIÓN 1 (PRINCIPAL): GESTIÓN DE USUARIOS & ASIGNACIÓN DE EVENTOS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Formulario Usuario */}
              <div className="lg:col-span-5 rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#ffb5d7] text-xs uppercase">
                    <UserCheck className="w-4 h-4" />
                    {editingUserId ? "Editar Usuario & Asignación" : "Nuevo Usuario"}
                  </div>
                  {editingUserId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUserId(null);
                        setNewUserFullName("");
                        setNewUsername("");
                        setNewUserPassword("");
                        setNewUserEmail("");
                        setNewUserRole("ADMIN");
                        setUserAssignedEventIds([]);
                      }}
                      className="text-xs text-[#8a8a8a] hover:text-white"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <h3 className="text-xl font-normal text-white">
                  {editingUserId ? "Modificar Usuario" : "Crear Usuario con Eventos"}
                </h3>
                <p className="text-xs text-[#8a8a8a]">
                  Asigná qué rol tendrá y qué eventos podrá ver. Si no le asignás un evento, ese usuario no podrá verlo ni operar en él.
                </p>

                {userSavedMsg && (
                  <div className="p-3 rounded bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200">
                    {userSavedMsg}
                  </div>
                )}

                <form onSubmit={handleCreateAdminUser} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Nombre y Apellido / Identificador *
                    </label>
                    <input
                      type="text"
                      required
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      placeholder="Ej: Laura Martínez (Caja 1)"
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
                        placeholder="Ej: laura"
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        {editingUserId ? "Nueva Clave (opcional)" : "Contraseña *"}
                      </label>
                      <input
                        type="text"
                        required={!editingUserId}
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder={editingUserId ? "Dejar vacío para conservar la actual" : "Mínimo 8 caracteres"}
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs font-mono text-white"
                      />
                      <span className="text-[10px] text-[#8a8a8a] mt-1 block">
                        {editingUserId
                          ? "Dejá este campo vacío si no querés cambiarle la clave."
                          : "Mínimo 8 caracteres. No usar claves conocidas (12345678, caja2026, etc.)."}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Rol del Usuario *
                      </label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                      >
                        {adminRoles.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.label} ({r.name})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Email del Operador (opcional)
                      </label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="Ej: operador@mastreinta.com"
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* ASIGNACIÓN DE EVENTOS */}
                  <div className="pt-2 border-t border-[#353535] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-white/90">
                        Eventos Asignados a este Usuario:
                      </label>
                      {newUserRole !== "SUPERADMIN" && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setUserAssignedEventIds(events.map((e) => e.id))}
                            className="text-[11px] text-[#ffb5d7] hover:underline"
                          >
                            Todos
                          </button>
                          <span className="text-[#8a8a8a] text-[11px]">·</span>
                          <button
                            type="button"
                            onClick={() => setUserAssignedEventIds([])}
                            className="text-[11px] text-[#8a8a8a] hover:underline"
                          >
                            Ninguno
                          </button>
                        </div>
                      )}
                    </div>

                    {newUserRole === "SUPERADMIN" ? (
                      <div className="p-3 rounded bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200">
                        ⭐ El <strong>Superadmin</strong> tiene acceso automático a todos los eventos presentes y futuros sin restricción.
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded bg-[#121212] border border-[#353535]">
                        {events.map((ev) => {
                          const isChecked = userAssignedEventIds.includes(ev.id);
                          return (
                            <label
                              key={ev.id}
                              className="flex items-start gap-2.5 text-xs text-white/90 cursor-pointer hover:bg-white/5 p-1 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setUserAssignedEventIds((prev) => [...prev, ev.id]);
                                  } else {
                                    setUserAssignedEventIds((prev) =>
                                      prev.filter((id) => id !== ev.id)
                                    );
                                  }
                                }}
                                className="mt-0.5 rounded border-[#353535]"
                              />
                              <div className="min-w-0">
                                <span className="font-medium text-white block truncate">
                                  {ev.title}
                                </span>
                                <span className="text-[11px] text-[#8a8a8a]">
                                  {ev.dateLabel} · {ev.venueCity}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingUser}
                    className="w-full py-3 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-xs cursor-pointer hover:brightness-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    {isSavingUser
                      ? "Guardando..."
                      : editingUserId
                      ? "Actualizar Usuario"
                      : "Guardar Usuario con Permisos"}
                  </button>
                </form>
              </div>

              {/* Listado de Usuarios */}
              <div className="lg:col-span-7 rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-4">
                <h3 className="text-xl font-normal text-white">
                  Usuarios Registrados ({adminUsers.length})
                </h3>
                <p className="text-xs text-[#8a8a8a]">
                  Cada usuario inicia sesión con sus credenciales y sólo accede a los eventos que le asignaste.
                </p>

                <div className="space-y-3">
                  {adminUsers.map((u) => {
                    const isUserSuper = u.role === "SUPERADMIN" || u.username === "superadmin";
                    const roleDef = adminRoles.find((r) => r.name === u.role);
                    const userEvents = events.filter((e) =>
                      (u.assignedEventIds || []).includes(e.id)
                    );

                    return (
                      <div
                        key={u.id}
                        className="p-4 rounded-lg bg-[#121212] border border-[#353535] space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {u.fullName}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-[#353535] text-[10px] text-[#ffb5d7] font-mono">
                                {roleDef?.label || u.role}
                              </span>
                              {isUserSuper && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-medium">
                                  SUPERADMIN
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#8a8a8a] font-mono">
                              Usuario: <strong className="text-white">@{u.username}</strong>
                              {u.email && (
                                <> · Email: <strong className="text-white">{u.email}</strong></>
                              )}
                              {" "}· Clave: <strong className="text-[#ffb5d7]">••••••••</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {u.email && (
                              <a
                                href={`mailto:${u.email}?subject=${encodeURIComponent("Accesos al Panel MAS30")}&body=${encodeURIComponent(`¡Hola ${u.fullName}!\n\nTe compartimos los datos de acceso al panel de control de MASTREINTA:\n\n• Panel: ${typeof window !== "undefined" ? window.location.origin : "https://mastreinta.vercel.app"}/admin\n• Usuario: ${u.username}\n• Rol: ${roleDef?.label || u.role}\n\nIngresá con tu usuario y contraseña designada.`)}`}
                                className="p-1.5 rounded bg-[#252525] hover:bg-[#353535] text-[#ffb5d7] cursor-pointer"
                                title="Enviar credenciales de acceso por email"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId(u.id);
                                setNewUserFullName(u.fullName);
                                setNewUsername(u.username);
                                setNewUserPassword("");
                                setNewUserEmail(u.email || "");
                                setNewUserRole(u.role);
                                setUserAssignedEventIds(u.assignedEventIds || []);
                                window.scrollTo({ top: 400, behavior: "smooth" });
                              }}
                              className="px-3 py-1.5 rounded bg-[#353535] text-xs text-white hover:bg-[#454545] cursor-pointer"
                            >
                              Editar & Eventos
                            </button>
                            {!isUserSuper && u.username !== currentUser?.username && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario @${u.username} (${u.fullName})? Ya no podrá ingresar al sistema.`)) {
                                    const delRes = await deleteAdminUser(u.id);
                                    if (!delRes.ok) {
                                      alert(`No se pudo eliminar el usuario: ${delRes.error || "Error del servidor"}`);
                                    }
                                    syncAll();
                                  }
                                }}
                                className="p-1.5 rounded bg-red-950/40 hover:bg-red-900 border border-red-700/40 text-red-300 hover:text-white cursor-pointer transition-colors"
                                title="Eliminar usuario definitivamente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Eventos asignados */}
                        <div className="pt-2 border-t border-[#353535]/60 text-xs">
                          <span className="text-[#8a8a8a] text-[11px] block mb-1">
                            Eventos con permiso de visualización:
                          </span>
                          {isUserSuper ? (
                            <span className="text-purple-300 text-xs">
                              ✓ Todos los eventos de la plataforma (Superadmin)
                            </span>
                          ) : userEvents.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {userEvents.map((ev) => (
                                <span
                                  key={ev.id}
                                  className="px-2 py-0.5 rounded bg-[#1c1c1c] border border-[#353535] text-[11px] text-white/90"
                                >
                                  {ev.title}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-amber-400/90 text-xs italic">
                              ⚠ Sin eventos asignados (no verá ningún evento en su panel)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECCIÓN 2 (SECUNDARIA): DEFINICIÓN DE ROLES & PLANTILLAS DE PERMISOS */}
            <div className="pt-8 border-t border-[#353535]/80 space-y-4">
              <div className="space-y-1">
                <h3 className="text-xl font-normal text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#ffb5d7]" />
                  Definición de Roles & Plantillas de Permisos
                </h3>
                <p className="text-xs text-[#8a8a8a]">
                  Configurá qué botones, módulos y funciones puede realizar cada rol de usuario dentro del sistema.
                </p>
              </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Formulario Rol */}
              <div className="lg:col-span-5 rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#ffb5d7] text-xs uppercase">
                    <SlidersHorizontal className="w-4 h-4" />
                    {editingRoleId ? "Modificar Rol" : "Nuevo Rol Personalizado"}
                  </div>
                  {editingRoleId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoleId(null);
                        setRoleFormName("");
                        setRoleFormLabel("");
                        setRoleFormDesc("");
                        setRoleFormPermissions({
                          canViewOrders: true,
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
                        });
                      }}
                      className="text-xs text-[#8a8a8a] hover:text-white"
                    >
                      Cancelar Edición
                    </button>
                  )}
                </div>

                <h3 className="text-xl font-normal text-white">
                  {editingRoleId ? "Editar Definición de Rol" : "Definir Rol & Capacidades"}
                </h3>

                {roleSavedMsg && (
                  <div className="p-3 rounded bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200">
                    {roleSavedMsg}
                  </div>
                )}

                <form onSubmit={handleSaveRole} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Código Clave del Rol (Mayúsculas sin espacios) *
                    </label>
                    <input
                      type="text"
                      required
                      value={roleFormName}
                      onChange={(e) => setRoleFormName(e.target.value.toUpperCase())}
                      placeholder="Ej: CAJERO_BAR, SEGURIDAD_VIP"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Nombre Visible / Etiqueta del Rol *
                    </label>
                    <input
                      type="text"
                      required
                      value={roleFormLabel}
                      onChange={(e) => setRoleFormLabel(e.target.value)}
                      placeholder="Ej: Cajero Bar & Entradas VIP"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Descripción de Funciones
                    </label>
                    <input
                      type="text"
                      value={roleFormDesc}
                      onChange={(e) => setRoleFormDesc(e.target.value)}
                      placeholder="Ej: Solo cobra en barra y aprueba transferencias"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>

                  {/* CHECKBOXES DE PERMISOS */}
                  <div className="space-y-3 pt-2 border-t border-[#353535]">
                    <span className="block text-xs font-medium text-white/90">
                      Permisos asignados a este Rol:
                    </span>

                    {/* Bloque: Reservas y Ventas */}
                    <div className="p-3 rounded bg-[#121212] border border-[#353535] space-y-2">
                      <span className="text-[11px] text-[#ffb5d7] font-medium block">
                        Órdenes & Ventas
                      </span>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.canViewOrders}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              canViewOrders: e.target.checked,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span>Ver listado de órdenes y clientes</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.canApproveOrders}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              canApproveOrders: e.target.checked,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span>Aprobar o rechazar pagos por transferencia</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.canIssueManualQR}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              canIssueManualQR: e.target.checked,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span>Emitir cortesías o ventas directas manuales</span>
                      </label>
                    </div>

                    {/* Bloque: Eventos */}
                    <div className="p-3 rounded bg-[#121212] border border-[#353535] space-y-2">
                      <span className="text-[11px] text-[#ffb5d7] font-medium block">
                        Eventos
                      </span>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.canManageEvents}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              canManageEvents: e.target.checked,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span>Crear y editar eventos</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.canDeleteEvents}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              canDeleteEvents: e.target.checked,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span>Eliminar eventos definitivamente</span>
                      </label>
                    </div>

                    {/* Bloque: Usuarios & Seguridad */}
                    <div className="p-3 rounded bg-[#121212] border border-[#353535] space-y-2">
                      <span className="text-[11px] text-[#ffb5d7] font-medium block">
                        Usuarios & Seguridad
                      </span>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.canManageUsers}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              canManageUsers: e.target.checked,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span>Ver, crear, editar y eliminar usuarios del sistema</span>
                      </label>
                    </div>

                    {/* Bloque: Auditoría, Analíticas & QRs */}
                    <div className="p-3 rounded bg-[#121212] border border-[#353535] space-y-2">
                      <span className="text-[11px] text-[#ffb5d7] font-medium block">
                        Auditoría, Visitas & QRs
                      </span>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.canViewAnalytics}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              canViewAnalytics: e.target.checked,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span>Ver estadísticas y visitas de la web</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.canViewTickets}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              canViewTickets: e.target.checked,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span>Ver padrón de entradas y códigos QR</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.canViewRendicion}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              canViewRendicion: e.target.checked,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span>Ver rendición de dinero por operador</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.canManageInquiries}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              canManageInquiries: e.target.checked,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span>Gestionar preguntas y contactos</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.canManageSettings}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              canManageSettings: e.target.checked,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span>Modificar CBU / Alias y configuración</span>
                      </label>
                    </div>

                    {/* Bloque: Lector QR de Puerta */}
                    <div className="p-3 rounded bg-[#121212] border border-[#353535] space-y-2">
                      <span className="text-[11px] text-[#ffb5d7] font-medium block">
                        Lector QR de Entrada (Puerta)
                      </span>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.canUseScanner}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              canUseScanner: e.target.checked,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span>Habilitado para usar el Lector QR</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.scannerOnly}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              scannerOnly: e.target.checked,
                              canUseScanner: e.target.checked ? true : p.canUseScanner,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span className="text-amber-300 font-medium">
                          Modo Estricto: Solo Lector QR (Bloquea todo el panel admin)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormPermissions.canResetScannedQR}
                          onChange={(e) =>
                            setRoleFormPermissions((p) => ({
                              ...p,
                              canResetScannedQR: e.target.checked,
                            }))
                          }
                          className="rounded border-[#353535]"
                        />
                        <span>Puede restablecer entradas ya canjeadas</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-xs cursor-pointer hover:brightness-95 flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {editingRoleId ? "Guardar Cambios de Rol" : "Crear Nuevo Rol"}
                  </button>
                </form>
              </div>

              {/* Lista de Roles */}
              <div className="lg:col-span-7 rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-4">
                <h3 className="text-xl font-normal text-white">
                  Roles Disponibles ({adminRoles.length})
                </h3>
                <p className="text-xs text-[#8a8a8a]">
                  Los roles definen qué partes del sistema puede ver y accionar un usuario.
                </p>
                <div className="space-y-3">
                  {adminRoles.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-lg bg-[#121212] border border-[#353535] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">
                              {r.label}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#353535] text-[10px] text-[#ffb5d7] font-mono">
                              {r.name}
                            </span>
                            {r.isSystem && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/60">
                                Sistema
                              </span>
                            )}
                          </div>
                          {r.description && (
                            <p className="text-xs text-[#8a8a8a] mt-1">{r.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRoleId(r.id);
                              setRoleFormName(r.name);
                              setRoleFormLabel(r.label);
                              setRoleFormDesc(r.description || "");
                              setRoleFormPermissions(r.permissions);
                            }}
                            className="px-3 py-1.5 rounded bg-[#353535] text-xs text-white hover:bg-[#454545] cursor-pointer"
                          >
                            Editar
                          </button>
                          {!r.isSystem && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`¿Eliminar rol ${r.label}?`)) {
                                  const delRes = await deleteAdminRole(r.id);
                                  if (!delRes.ok) {
                                    alert(`No se pudo eliminar el rol: ${delRes.error || "Error del servidor"}`);
                                  }
                                  syncAll();
                                }
                              }}
                              className="p-1.5 text-white/40 hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Badges de permisos */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {r.permissions.canViewOrders && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1c1c1c] text-white/80 border border-[#353535]">
                            Ver Órdenes
                          </span>
                        )}
                        {r.permissions.canApproveOrders && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                            Aprobar Pagos
                          </span>
                        )}
                        {r.permissions.canIssueManualQR && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                            Cortesías QR
                          </span>
                        )}
                        {r.permissions.canManageEvents && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                            Gestionar Eventos
                          </span>
                        )}
                        {r.permissions.canDeleteEvents && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/40">
                            Eliminar Eventos
                          </span>
                        )}
                        {r.permissions.canManageUsers && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                            Gestión Usuarios
                          </span>
                        )}
                        {r.permissions.canViewAnalytics && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1c1c1c] text-white/80 border border-[#353535]">
                            Visitas Web
                          </span>
                        )}
                        {r.permissions.canViewRendicion && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1c1c1c] text-white/80 border border-[#353535]">
                            Rendición Caja
                          </span>
                        )}
                        {r.permissions.canUseScanner && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                            Lector QR
                          </span>
                        )}
                        {r.permissions.scannerOnly && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/40 font-medium">
                            Solo Lector
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                Proyecto Detectado: hpbwcewuekxfqlofwpzu
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
                <p className="text-xs text-[#ffb5d7] leading-relaxed">
                  Por seguridad, el navegador ya no se conecta directamente a la
                  base de datos con la clave pública. Toda lectura y escritura
                  pasa por el servidor con una sesión de operador autenticada.
                </p>
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

            {/* CONFIGURACIÓN DE ENVÍO AUTOMÁTICO DE EMAILS (FLYER + QR) */}
            <div className="lg:col-span-12 rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-5 border border-[#ffb5d7]/30">
              <div className="flex items-center gap-2 text-[#ffb5d7] text-xs uppercase">
                <Mail className="w-4 h-4" />
                Envío Automático de Entradas por Email (Flyer + QRs + Código 4 Dígitos)
              </div>
              <h2 className="text-2xl font-normal text-white">
                Correo Remitente para Enviar los QRs y el Flyer
              </h2>
              <p className="text-xs text-[#8a8a8a] leading-relaxed">
                Para que el sistema envíe automáticamente por correo el{" "}
                <strong className="text-white">Flyer del evento</strong>, las{" "}
                <strong className="text-white">imágenes de los códigos QR</strong> y el{" "}
                <strong className="text-white">código de 4 dígitos</strong> a cualquier comprador,
                completá tu cuenta de{" "}
                <strong className="text-[#ffb5d7]">Gmail con Contraseña de Aplicación</strong>{" "}
                (recomendado, gratis y sin límites de dominio) o una clave de{" "}
                <strong className="text-white">Resend API</strong>.
              </p>

              {emailConfigSaved && (
                <div className="p-3 rounded bg-[#353535] text-xs text-[#ffb5d7]">
                  ✓ Configuración de correo guardada en la nube.
                </div>
              )}

              {testEmailStatus && (
                <div
                  className={`p-3 rounded text-xs ${
                    testEmailStatus.ok
                      ? "bg-[#121212] border border-[#ffb5d7]/50 text-[#ffb5d7]"
                      : "bg-red-950/60 border border-red-500/40 text-red-200"
                  }`}
                >
                  {testEmailStatus.msg}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveBankSettings(bankSettings);
                  setEmailConfigSaved(true);
                  setTimeout(() => setEmailConfigSaved(false), 4000);
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* OPCIÓN 1: GMAIL / SMTP */}
                  <div className="p-5 rounded-lg bg-[#121212] border border-[#353535] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-[#ffb5d7]">
                        Opción 1 (Recomendada) · Gmail / SMTP
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#353535] text-white/80">
                        Envía a cualquier email
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Correo Gmail Remitente (ej: mas30eventos@gmail.com)
                      </label>
                      <input
                        type="email"
                        value={bankSettings.smtpUser || ""}
                        onChange={(e) =>
                          setBankSettings({
                            ...bankSettings,
                            smtpUser: e.target.value,
                          })
                        }
                        placeholder="tucorreo@gmail.com"
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Contraseña de Aplicación de Google (16 letras)
                      </label>
                      <input
                        type="password"
                        value={bankSettings.smtpPass || ""}
                        onChange={(e) =>
                          setBankSettings({
                            ...bankSettings,
                            smtpPass: e.target.value,
                          })
                        }
                        placeholder="xxxx xxxx xxxx xxxx"
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#1c1c1c] border border-[#353535] text-xs font-mono text-white"
                      />
                      <p className="text-[11px] text-[#8a8a8a] mt-1.5 leading-relaxed">
                        ¿Cómo obtenerla en 30 segundos? Entrá a{" "}
                        <a
                          href="https://myaccount.google.com/apppasswords"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#ffb5d7] underline"
                        >
                          myaccount.google.com/apppasswords
                        </a>
                        , creá una clave llamada <strong>MAS30</strong> y pegá las 16 letras acá.
                      </p>
                    </div>
                  </div>

                  {/* OPCIÓN 2: RESEND API */}
                  <div className="p-5 rounded-lg bg-[#121212] border border-[#353535] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-white/80">
                        Opción 2 (Alternativa) · Resend API
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#353535] text-white/60">
                        Opcional
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Resend API Key (re_...)
                      </label>
                      <input
                        type="password"
                        value={bankSettings.resendApiKey || ""}
                        onChange={(e) =>
                          setBankSettings({
                            ...bankSettings,
                            resendApiKey: e.target.value,
                          })
                        }
                        placeholder="re_123456789..."
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#1c1c1c] border border-[#353535] text-xs font-mono text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#8a8a8a] mb-1">
                        Remitente Resend (From Email)
                      </label>
                      <input
                        type="text"
                        value={bankSettings.resendFromEmail || ""}
                        onChange={(e) =>
                          setBankSettings({
                            ...bankSettings,
                            resendFromEmail: e.target.value,
                          })
                        }
                        placeholder="MAS30 Eventos <entradas@tudominio.com>"
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#1c1c1c] border border-[#353535] text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-xs cursor-pointer"
                  >
                    Guardar Configuración de Correo
                  </button>

                  <button
                    type="button"
                    disabled={testingEmail}
                    onClick={async () => {
                      saveBankSettings(bankSettings);
                      const testRecipient =
                        bankSettings.smtpUser?.trim() ||
                        prompt(
                          "Ingresá el email donde querés recibir el correo de prueba con Flyer + QR:"
                        ) ||
                        "";
                      if (!testRecipient) return;
                      setTestingEmail(true);
                      setTestEmailStatus(null);
                      const sampleEvent = events[0] || INITIAL_EVENTS[0];
                      try {
                        const res = await fetch("/api/send-tickets-email", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            toEmail: testRecipient,
                            buyerName: "Prueba Admin MAS30",
                            orderCode: "MAS30-TEST",
                            eventId: sampleEvent.id,
                            eventTitle: sampleEvent.title,
                            eventDateLabel: sampleEvent.dateLabel,
                            eventTime: sampleEvent.time,
                            eventVenue: sampleEvent.venueName,
                            flyerUrl: sampleEvent.flyerUrl,
                            tickets: [
                              {
                                ticketNumber: 1,
                                totalInOrder: 1,
                                holderName: "Invitado Prueba MAS30",
                                holderDni: "",
                                shortCode: "M30X",
                                qrCode: "MAS30-TICKET|MAS30-TEST|1|M30X",
                                tierName:
                                  sampleEvent.ticketTiers[0]?.name ||
                                  "Entrada General",
                              },
                            ],
                            smtpUser: bankSettings.smtpUser,
                            smtpPass: bankSettings.smtpPass,
                            smtpHost: bankSettings.smtpHost,
                            smtpPort: bankSettings.smtpPort,
                            resendApiKey: bankSettings.resendApiKey,
                            resendFromEmail: bankSettings.resendFromEmail,
                            originUrl:
                              typeof window !== "undefined"
                                ? window.location.origin
                                : "https://mastreinta.vercel.app",
                          }),
                        });
                        const data = await res.json();
                        if (res.ok && data.ok) {
                          setTestEmailStatus({
                            ok: true,
                            msg: `✓ ¡Correo de prueba con Flyer + QR enviado con éxito a ${testRecipient}! Revisá tu bandeja de entrada.`,
                          });
                        } else {
                          setTestEmailStatus({
                            ok: false,
                            msg:
                              data.error ||
                              "No se pudo enviar el correo de prueba.",
                          });
                        }
                      } catch (err) {
                        setTestEmailStatus({
                          ok: false,
                          msg: `Error al probar envío: ${
                            err instanceof Error ? err.message : String(err)
                          }`,
                        });
                      } finally {
                        setTestingEmail(false);
                      }
                    }}
                    className="px-5 py-3 rounded-[3px] bg-[#353535] hover:bg-[#454545] text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                  >
                    {testingEmail
                      ? "Enviando prueba..."
                      : "Enviar Email de Prueba (con Flyer y QR)"}
                  </button>
                </div>
              </form>
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
          </main>
        </div>
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
                  const ev = visibleEvents.find((x) => x.id === evId);
                  if (ev && ev.ticketTiers.length > 0) {
                    setManualTierId(ev.ticketTiers[0].id);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
              >
                {visibleEvents.map((ev) => (
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

              <input
                type="text"
                required
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Nombre del Invitado *"
                className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <input
                  type="text"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="WhatsApp del Invitado"
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                />

                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="Email del Invitado (para enviar accesos)"
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                />
              </div>

              <input
                type="text"
                value={manualDni}
                onChange={(e) => setManualDni(e.target.value)}
                placeholder="DNI del Invitado (opcional)"
                className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
              />

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualIsCourtesy}
                    onChange={(e) => {
                      const isFree = e.target.checked;
                      setManualIsCourtesy(isFree);
                      if (isFree) {
                        setManualPrice(0);
                      } else {
                        const tierPrice =
                          selectedManualEvent?.ticketTiers.find(
                            (t) => t.id === manualTierId
                          )?.price || 10000;
                        setManualPrice(tierPrice * manualQty);
                      }
                    }}
                  />
                  Cortesía sin cargo ($0)
                </label>

                {!manualIsCourtesy && (
                  <div className="pt-2">
                    <label className="block text-xs text-[#8a8a8a] mb-1">
                      Monto Cobrado / Valor de los Accesos ($ ARS) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-white/50 font-mono">
                        $
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={manualPrice}
                        onChange={(e) =>
                          setManualPrice(
                            e.target.value === ""
                              ? ""
                              : Number(e.target.value)
                          )
                        }
                        placeholder={
                          selectedManualEvent && manualTierId
                            ? `Sugerido: $${
                                (selectedManualEvent.ticketTiers.find(
                                  (t) => t.id === manualTierId
                                )?.price || 10000) * manualQty
                              }`
                            : "Monto total en ARS"
                        }
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs font-mono text-white"
                      />
                    </div>
                    <p className="text-[10px] text-[#8a8a8a] mt-1">
                      Podés colocar el monto exacto acordado (ej: 25000). Quedará registrado en la orden y en rendición.
                    </p>
                  </div>
                )}

                {manualEmail.trim() && (
                  <label className="flex items-center gap-2 text-xs text-[#ffb5d7] cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={manualSendEmail}
                      onChange={(e) => setManualSendEmail(e.target.checked)}
                    />
                    <Mail className="w-3.5 h-3.5" />
                    Enviar Flyer + Códigos QR automáticamente por Email a {manualEmail.trim()}
                  </label>
                )}
              </div>

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

      {/* MODAL PARA EDITAR DATOS DEL COMPRADOR / ORDEN */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg bg-[#1c1c1c] border border-[#353535] p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-normal text-white">
                  Editar Datos de la Orden
                </h3>
                <span className="font-mono text-xs text-[#ffb5d7]">
                  {editingOrder.orderCode} · {editingOrder.eventTitle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-2 text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editOrderSavedMsg && (
              <div className="p-3 rounded bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200">
                {editOrderSavedMsg}
              </div>
            )}

            <form onSubmit={handleSaveOrderCustomerData} className="space-y-4">
              <div>
                <label className="block text-xs text-[#8a8a8a] mb-1">
                  Nombre del Comprador / Titular *
                </label>
                <input
                  type="text"
                  required
                  value={editBuyerName}
                  onChange={(e) => setEditBuyerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs text-[#8a8a8a] mb-1">
                    WhatsApp / Teléfono *
                  </label>
                  <input
                    type="text"
                    required
                    value={editBuyerPhone}
                    onChange={(e) => setEditBuyerPhone(e.target.value)}
                    placeholder="Ej: +54 9 11 1234-5678"
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8a8a8a] mb-1">
                    DNI / Documento
                  </label>
                  <input
                    type="text"
                    value={editBuyerDni}
                    onChange={(e) => setEditBuyerDni(e.target.value)}
                    placeholder="DNI del titular"
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#8a8a8a] mb-1">
                  Correo Electrónico (Email para envío de entradas) *
                </label>
                <input
                  type="email"
                  value={editBuyerEmail}
                  onChange={(e) => setEditBuyerEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8a8a8a] mb-1">
                  Monto Total ($ ARS)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editTotalAmount}
                  onChange={(e) =>
                    setEditTotalAmount(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8a8a8a] mb-1">
                  Notas / Referencia Interna
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Anotaciones de la venta..."
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2.5 rounded bg-[#252525] text-xs text-white hover:bg-[#353535] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded bg-soft-pink text-[#1c1c1c] font-medium text-xs cursor-pointer hover:brightness-95"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



