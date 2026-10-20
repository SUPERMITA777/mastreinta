export interface TicketTier {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  sold: number;
  includes: string[];
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
  createdAt: string;
}

export interface OrderAttendeeInput {
  name: string;
  dni: string;
}

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: "ADMIN_GENERAL" | "CAJA_VENTAS" | "RRPP" | "PUERTA";
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
  totalAmount: number;
  transferSender: string;
  transferReference: string;
  notes?: string;
  attendees: OrderAttendeeInput[];
  status: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  approvedAt?: string;
  approvedByUsername?: string;
  approvedByName?: string;
  issueType?: "TRANSFERENCIA_WEB" | "VENTA_MANUAL_ADMIN" | "CORTESIA_ADMIN";
  createdAt: string;
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
  holderName: string;
  holderDni: string;
  buyerPhone: string;
  ticketNumber: number;
  totalInOrder: number;
  unitPrice?: number;
  generatedByUsername?: string;
  generatedByName?: string;
  status: "VALIDO" | "USADO" | "ANULADO";
  scannedAt?: string;
  scannedBy?: string;
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
}
