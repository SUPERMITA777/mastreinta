export interface TicketTier {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  sold: number;
  qrCount?: number; // Cantidad de códigos QR / accesos que otorga 1 unidad de esta entrada (por defecto 1, ej: Mesa = 4)
  includes: string[];
}

export type VenueSpotType = "MESA" | "LIVING" | "SECTOR_VIP" | "BOX" | "BARRA";
export type VenueSpotStatus = "DISPONIBLE" | "RESERVADO" | "VENDIDO" | "BLOQUEADO";

export interface VenuePoint {
  x: number; // Posición % horizontal (0 a 100)
  y: number; // Posición % vertical (0 a 100)
}

export interface VenuePolygon {
  id: string;
  name: string; // Ej: "ESCENARIO PRINCIPAL", "PISTA DE BAILE", "CABINA DJ"
  type?: "ESCENARIO" | "PISTA" | "BARRA" | "SECTOR" | "CUSTOM";
  points: VenuePoint[]; // Vértices en % (0 a 100)
  color?: string; // Color de borde/acento
  fillColor?: string; // Color de relleno
  closed?: boolean; // Si está cerrado
}

export interface VenueSpot {
  id: string;
  name: string; // Ej: "Mesa 5", "Living VIP 1", "Sector VIP"
  sectorName?: string; // Ej: "Sector VIP", "Pista", "Terraza"
  type: VenueSpotType;
  capacity: number; // Cantidad de accesos que emite (ej: 8, 20)
  price: number; // Precio total en ARS (ej: 50000, 200000)
  perks?: string; // Beneficios adicionales (ej: "10 espumantes + atención personalizada")
  x: number; // Posición % horizontal (0 a 100)
  y: number; // Posición % vertical (0 a 100)
  width?: number; // Ancho personalizado en px
  height?: number; // Alto personalizado en px
  rotation?: number; // Rotación en grados (0 a 360)
  shape?: "circle" | "rect";
  status: VenueSpotStatus;
  reservedByOrderCode?: string;
  reservedByName?: string;
}

export interface VenueSectorLabel {
  id: string;
  name: string; // Ej: "ESCENARIO", "PISTA CENTRAL", "SECTOR VIP", "BARRA"
  x: number; // % (0 a 100)
  y: number; // % (0 a 100)
  width?: number; // Ancho opcional
  height?: number; // Alto opcional
  rotation?: number; // Rotación en grados (0 a 360)
  color?: string; // Color opcional (hex o nombre)
}

export interface VenueMapConfig {
  enabled: boolean;
  backgroundImageUrl?: string;
  sectors: VenueSectorLabel[];
  spots: VenueSpot[];
  polygons?: VenuePolygon[]; // Elementos construidos con puntos (escenarios, pistas, barras, etc.)
}

export interface EventItem {
  id: string;
  slug: string;
  title: string; // Ej: "BUENOS AIRES - CROBAR"
  subtitle: string;
  category: string;
  date: string; // YYYY-MM-DD
  dateLabel: string; // Ej: "sáb. 14 nov."
  shortDate: string; // Ej: "14.11"
  time: string; // Ej: "23:30 a 06:00 hs"
  doorsOpen: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  country: string;
  mapUrl: string;
  mapEmbedUrl?: string;
  flyerUrl: string;
  flyerGradient: string;
  badge: string;
  featured: boolean;
  ageRestriction: string;
  dressCode: string;
  description: string;
  highlights: string[];
  lineup: string[];
  ticketTiers: TicketTier[];
  status: "ACTIVO" | "ULTIMAS_ENTRADAS" | "AGOTADO" | "PROXIMAMENTE";
  hidden?: boolean;
  publishAt?: string; // Fecha y hora ISO para publicación automática (ej: "2026-10-25T20:00")
  organizerWhatsapp?: string; // WhatsApp directo del organizador para consultas y compra de entradas
  instagramUrl?: string; // Link a Instagram del evento / productora
  tiktokUrl?: string; // Link a TikTok / Red social adicional
  // Textos editables de la página / modal del evento (si están vacíos se usan los textos por defecto)
  headerLabel?: string; // Encabezado grande arriba del título (ej: "MAS30")
  ticketInfoText?: string; // Texto de precio. Admite {precio}
  checkoutNote?: string; // Texto bajo "Reservar Entradas con QR"
  whatsappMessage?: string; // Mensaje prearmado de WhatsApp. Admite {evento} y {fecha}
  whatsappLabel?: string; // Texto del botón de WhatsApp
  instagramLabel?: string; // Texto del botón de Instagram
  tiktokLabel?: string; // Texto del botón de TikTok / otra red
  mapQuery?: string; // Búsqueda personalizada para el mapa (si se deja vacío usa predio + dirección)
  createdByUsername?: string; // Usuario que creó el evento
  paymentAccountId?: string; // Cuenta de Mercado Pago que recibe el dinero de este evento
  platformFeePercent?: number; // Comisión de la plataforma en % (0 = sin comisión)
  venueMap?: VenueMapConfig; // Configuración del mapa del lugar, sectores y mesas reservables
  createdAt: string;
}

export interface OrderAttendeeInput {
  name: string;
  dni: string;
}

export interface RolePermissions {
  canViewOrders: boolean;
  canApproveOrders: boolean;
  canIssueManualQR: boolean;
  canManageEvents: boolean;
  canDeleteEvents: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canViewTickets: boolean;
  canViewRendicion: boolean;
  canManageInquiries: boolean;
  canManageSettings: boolean;
  canUseScanner: boolean;
  scannerOnly: boolean;
  canResetScannedQR: boolean;
}

export interface AdminRoleDefinition {
  id: string;
  name: string;
  label: string;
  description?: string;
  isSystem?: boolean;
  permissions: RolePermissions;
}

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  email?: string;
  fullName: string;
  role: string;
  assignedEventIds?: string[];
  customPermissions?: Partial<RolePermissions>;
  active: boolean;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderCode: string; // Ej: MAS30-8492
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventDateLabel: string;
  eventTime: string;
  eventVenue: string;
  buyerName: string;
  buyerDni: string;
  buyerEmail: string;
  buyerPhone: string;
  tierId: string;
  tierName: string;
  unitPrice: number;
  quantity: number;
  qrCountPerUnit?: number;
  totalQrCount?: number;
  totalAmount: number;
  transferSender: string;
  transferReference: string;
  notes?: string;
  spotId?: string; // ID de la mesa o sector reservado (si aplica)
  spotName?: string; // Ej: "Mesa 5", "Living VIP 1"
  spotPerks?: string; // Ej: "10 espumantes incluidos"
  sectorName?: string; // Ej: "Sector VIP"
  attendees: OrderAttendeeInput[];
  status: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  approvedAt?: string;
  approvedByUsername?: string;
  approvedByName?: string;
  issueType?: "TRANSFERENCIA_WEB" | "VENTA_MANUAL_ADMIN" | "CORTESIA_ADMIN" | "MERCADOPAGO_WEB";
  // Pago online (Mercado Pago)
  paymentAccountId?: string;
  paymentId?: string;
  paymentStatus?: string; // approved, pending, rejected, etc.
  paymentMethod?: string; // credit_card, debit_card, account_money, bank_transfer...
  platformFee?: number; // Comisión retenida por la plataforma (ARS)
  expiresAt?: string; // Vencimiento de la reserva si no se paga
  createdAt: string;
}

/** Cuenta de cobro (vista pública/segura: nunca incluye tokens). */
export interface PaymentAccountPublic {
  id: string;
  label: string;
  mpUserId: string;
  email?: string;
  connectedAt: string;
}

export interface TicketQR {
  id: string;
  qrCode: string;
  shortCode: string;
  orderId: string;
  orderCode: string;
  eventId: string;
  eventTitle: string;
  eventDateLabel: string;
  eventTime: string;
  eventVenue: string;
  tierName: string;
  spotId?: string;
  spotName?: string; // Ej: "Mesa 5"
  spotPerks?: string; // Ej: "10 espumantes incluidos"
  sectorName?: string; // Ej: "Sector VIP"
  holderName: string;
  holderDni: string;
  buyerPhone: string;
  buyerEmail?: string;
  ticketNumber: number;
  totalInOrder: number;
  unitPrice?: number;
  generatedByUsername?: string;
  generatedByName?: string;
  status: "VALIDO" | "USADO" | "ANULADO" | "BLOQUEADO";
  scannedAt?: string;
  scannedBy?: string;
  scannedByUsername?: string;
  scannedByName?: string;
  scannedDoor?: string;
  createdAt: string;
}

export interface InquiryItem {
  id: string;
  type: "PREGUNTA_EVENTO" | "CONTACTO_GENERAL";
  eventId?: string;
  eventTitle?: string;
  name: string;
  email: string;
  phone: string;
  subject?: string;
  message: string;
  reply?: string;
  isPublic: boolean;
  status: "PENDIENTE" | "RESPONDIDA";
  createdAt: string;
}

export interface BankSettings {
  bankName: string;
  accountHolder: string;
  cbu: string;
  alias: string;
  cuit: string;
  whatsappSupport: string;
  instagramHandle: string;
  adminPin: string;
  // Vista previa al compartir el link (WhatsApp, Instagram, Facebook, etc.)
  shareTitle?: string;
  shareDescription?: string;
  shareImageUrl?: string;
  // Configuración de envío de Emails (Gmail / SMTP o Resend)
  smtpUser?: string;
  smtpPass?: string;
  smtpHost?: string;
  smtpPort?: number;
  resendApiKey?: string;
  resendFromEmail?: string;
}

export interface EventAnalyticsItem {
  views: number;
  modalOpens: number;
  pageViews: number;
  whatsappClicks: number;
  lastVisitedAt?: string;
  dailyVisits?: Record<string, number>;
}

export interface SiteAnalytics {
  totalSiteVisits: number;
  uniqueVisitors: number;
  totalWhatsappClicks: number;
  dailyVisits: Record<string, number>;
  eventStats: Record<string, EventAnalyticsItem>;
  updatedAt?: string;
}

