"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Info,
  Instagram,
  MapPin,
  MessageCircle,
  MessageSquare,
  QrCode,
  Send,
  Share2,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  createInquiry,
  createTransferOrder,
  formatARS,
  getBankSettings,
  getEventBySlug,
  getInquiries,
  INITIAL_SETTINGS,
  trackVisit,
} from "@/lib/store";
import {
  BankSettings,
  EventItem,
  InquiryItem,
  OrderAttendeeInput,
  VenueSpot,
} from "@/lib/types";
import BreshPosterArt from "@/components/BreshPosterArt";
import EventPriceText from "@/components/EventPriceText";
import VenueMapViewer from "@/components/VenueMapViewer";
import { fillEventTemplate, getEventText } from "@/lib/eventTexts";

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug || "";

  const [event, setEvent] = useState<EventItem | undefined>(undefined);
  const [bank, setBank] = useState<BankSettings>(INITIAL_SETTINGS);
  const [questions, setQuestions] = useState<InquiryItem[]>([]);

  // Estado Reserva / Compra por Transferencia
  const [selectedSpot, setSelectedSpot] = useState<VenueSpot | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(2);
  const [buyerName, setBuyerName] = useState("");
  const [buyerDni, setBuyerDni] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [transferSender, setTransferSender] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState<OrderAttendeeInput[]>([
    { name: "", dni: "" },
    { name: "", dni: "" },
  ]);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCbu, setCopiedCbu] = useState(false);
  const [sharedCopied, setSharedCopied] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"mercadopago" | "transfer">("mercadopago");
  const [payingMp, setPayingMp] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);

  // Preguntas sobre el Evento
  const [qName, setQName] = useState("");
  const [qEmail, setQEmail] = useState("");
  const [qPhone, setQPhone] = useState("");
  const [qMessage, setQMessage] = useState("");
  const [qSent, setQSent] = useState(false);

  useEffect(() => {
    const load = () => {
      const found = getEventBySlug(slug);
      setEvent(found);
      if (found && !selectedTierId && found.ticketTiers.length > 0) {
        setSelectedTierId(found.ticketTiers[0].id);
      }
      setBank(getBankSettings());
      if (found) {
        if (found.paymentAccountId) {
          setPaymentMethod("mercadopago");
        } else {
          setPaymentMethod("transfer");
        }
        const allInq = getInquiries();
        setQuestions(
          allInq.filter(
            (i) =>
              (i.eventId === found.id || i.eventId === "ALL" || !i.eventId) &&
              i.isPublic &&
              Boolean(i.reply)
          )
        );
      }
    };
    load();
    const initialFound = getEventBySlug(slug);
    if (initialFound) {
      trackVisit("event_page", initialFound.id);
    }
    window.addEventListener("mas30-store-updated", load);
    return () => window.removeEventListener("mas30-store-updated", load);
  }, [slug, selectedTierId]);

  useEffect(() => {
    if (selectedSpot) {
      const total = selectedSpot.capacity;
      setAttendees((prev) =>
        Array.from({ length: total }, (_, idx) => {
          if (idx === 0) {
            return {
              name: prev[0]?.name || buyerName,
              dni: prev[0]?.dni || buyerDni,
            };
          }
          return prev[idx] || { name: "", dni: "" };
        })
      );
      return;
    }

    const tier =
      event?.ticketTiers.find((t) => t.id === selectedTierId) ||
      event?.ticketTiers[0];
    const perUnit = Math.max(1, Number(tier?.qrCount) || 1);
    const total = quantity * perUnit;
    setAttendees((prev) =>
      Array.from({ length: total }, (_, idx) => {
        if (idx === 0) {
          return {
            name: prev[0]?.name || buyerName,
            dni: prev[0]?.dni || buyerDni,
          };
        }
        return prev[idx] || { name: "", dni: "" };
      })
    );
  }, [quantity, selectedTierId, selectedSpot, event, buyerName, buyerDni]);

  if (!event) {
    return (
      <div className="container py-24 text-center space-y-4">
        <h1 className="text-3xl font-medium text-white">Evento no encontrado</h1>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm"
        >
          Volver a Eventos
        </Link>
      </div>
    );
  }

  const selectedTier =
    event.ticketTiers.find((t) => t.id === selectedTierId) ||
    event.ticketTiers[0];
  const qrCountPerUnit = selectedSpot
    ? selectedSpot.capacity
    : Math.max(1, Number(selectedTier?.qrCount) || 1);
  const totalQRs = selectedSpot ? selectedSpot.capacity : quantity * qrCountPerUnit;
  const totalAmount = selectedSpot
    ? selectedSpot.price
    : (selectedTier?.price || 0) * quantity;

  const handleAttendeeChange = (
    idx: number,
    field: "name" | "dni",
    val: string
  ) => {
    setAttendees((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const whatsappOrderText = [
    `¡Hola! Quiero comprar / enviar el comprobante de mis entradas para *${event.title}* (${event.dateLabel}).`,
    ``,
    `🎟 *Detalle de la compra:*`,
    selectedSpot
      ? `• Reserva de Mesa / Sector: *${selectedSpot.name}* (${selectedSpot.sectorName || "Pista"})\n• Accesos Incluidos: *${selectedSpot.capacity} QRs individuales*\n${selectedSpot.perks ? `• Beneficios: ${selectedSpot.perks}\n` : ""}• Total: *${formatARS(selectedSpot.price)}*`
      : `• Entrada: ${quantity}x ${selectedTier?.name || "Entrada General"}\n• Cantidad de Tickets / QRs: *${totalQRs} QR${totalQRs > 1 ? "s" : ""}*\n• Total: *${formatARS(totalAmount)}*`,
    ``,
    `👤 *Datos del cliente:*`,
    `• Nombre: ${buyerName.trim() || "-"}`,
    `• WhatsApp: ${buyerPhone.trim() || "-"}`,
    `• Email: ${buyerEmail.trim() || "-"}`,
    ...(attendees.some((a) => a.name.trim())
      ? [
          `• Invitados: ${attendees
            .map((a, i) =>
              a.name.trim() ? `QR #${i + 1}: ${a.name.trim()}` : null
            )
            .filter(Boolean)
            .join(" | ")}`,
        ]
      : []),
    ...(notes.trim() ? [`• Nota: ${notes.trim()}`] : []),
  ].join("\n");

  const organizerWhatsappHref = `https://wa.me/${(
    event.organizerWhatsapp || bank.whatsappSupport
  ).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappOrderText)}`;

  const handleMercadoPagoCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMpError(null);
    if (!buyerName.trim()) {
      setMpError("Por favor completá tu Nombre y Apellido.");
      return;
    }
    if (!buyerPhone.trim()) {
      setMpError("Por favor completá tu número de WhatsApp.");
      return;
    }
    if (!buyerEmail.trim() || !/^\S+@\S+\.\S+$/.test(buyerEmail.trim())) {
      setMpError("Por favor ingresá un Email válido para enviarte las entradas y el código QR.");
      return;
    }

    setPayingMp(true);
    try {
      const res = await fetch("/api/mp/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          tierId: selectedSpot ? undefined : (selectedTier?.id || event.ticketTiers[0]?.id),
          spotId: selectedSpot ? selectedSpot.id : undefined,
          quantity: selectedSpot ? 1 : quantity,
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim().toLowerCase(),
          buyerPhone: buyerPhone.trim(),
          attendees,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok || !data.initPoint) {
        throw new Error(data.error || "No se pudo iniciar el pago con Mercado Pago.");
      }

      // Redirigir al Checkout de Mercado Pago
      window.location.href = data.initPoint;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error iniciando el pago";
      setMpError(msg);
      setPayingMp(false);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (buyerName.trim()) {
      createTransferOrder({
        event,
        tierId: selectedSpot ? selectedSpot.id : selectedTier.id,
        quantity: selectedSpot ? 1 : quantity,
        buyerName,
        buyerDni: "",
        buyerEmail,
        buyerPhone,
        transferSender: buyerName,
        transferReference: "Transferencia / Web",
        notes,
        attendees,
        spotId: selectedSpot?.id,
        spotName: selectedSpot?.name,
        spotPerks: selectedSpot?.perks,
        sectorName: selectedSpot?.sectorName,
      }).catch(() => {});
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qName.trim() || !qMessage.trim()) return;
    await createInquiry({
      type: "PREGUNTA_EVENTO",
      eventId: event.id,
      eventTitle: event.title,
      name: qName,
      email: qEmail,
      phone: qPhone,
      message: qMessage,
    });
    setQSent(true);
    setQName("");
    setQEmail("");
    setQPhone("");
    setQMessage("");
  };

  return (
    <div className="bg-dark-background text-white min-h-screen pb-16">
      {/* LAYOUT SPLIT IDÉNTICO AL DETALLE DE EVENTO DE BRESH.COM */}
      <div className="relative overflow-hidden">
        <div className="bg-[#AF2C75] absolute w-1/2 h-full hidden lg:block" />

        <div className="container grid lg:grid-cols-2 overflow-hidden relative z-10">
          {/* COLUMNA IZQUIERDA (#AF2C75) */}
          <div className="py-8 md:py-12 lg:pr-12 flex flex-col min-w-0 relative">
            <div className="bg-[#AF2C75] absolute top-0 -left-8 -right-8 h-full lg:hidden -z-10" />

            <div className="flex justify-end mb-6 lg:hidden">
              <Link href="/" className="flex items-center gap-1 text-sm">
                Volver <X className="w-6 h-6" />
              </Link>
            </div>

            <div className="mb-8">
              {getEventText(event, "headerLabel") && (
                <h1 className="text-5xl font-medium mt-4 mb-2">
                  {getEventText(event, "headerLabel")}
                </h1>
              )}
              <h2 className="text-4xl md:text-5xl font-medium mb-2">
                {event.title}
              </h2>
              {event.subtitle?.trim() && (
                <p className="text-white/80 text-sm mt-2">{event.subtitle}</p>
              )}
            </div>

            <div className="w-full">
              <div className="mb-6 aspect-video max-w-md mx-auto lg:mx-0 rounded-md w-full overflow-hidden shadow-xl">
                <BreshPosterArt event={event} variant="wide" />
              </div>

              <div className="mb-6">
                <div className="text-sm text-white/60 mb-1">Fecha</div>
                <div className="text-[40px] font-medium leading-none">
                  {event.shortDate}
                </div>
                <div className="text-sm text-white/85 mt-1">
                  {event.dateLabel} · {event.time}
                </div>
              </div>

              {/* Botones: WhatsApp del Organizador + Compartir Evento + Redes Sociales */}
              <div className="mb-8 space-y-2.5 max-w-md">
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://wa.me/${(
                      event.organizerWhatsapp || bank.whatsappSupport
                    ).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      fillEventTemplate(
                        getEventText(event, "whatsappMessage"),
                        event
                      )
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackVisit("whatsapp_click", event.id)}
                    className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#121212] hover:bg-[#1e1e1e] text-white text-xs font-medium border border-white/15 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-[#ffb5d7]" />
                    {getEventText(event, "whatsappLabel")}
                  </a>

                  <button
                    type="button"
                    onClick={async () => {
                      const shareUrl = window.location.href;
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: `MAS30 · ${event.title}`,
                            text: `${event.title} (${event.dateLabel}) en MAS30`,
                            url: shareUrl,
                          });
                          return;
                        } catch {
                          // fallback copy
                        }
                      }
                      navigator.clipboard.writeText(shareUrl);
                      setSharedCopied(true);
                      setTimeout(() => setSharedCopied(false), 2500);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-white/15 hover:bg-white/25 text-white text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    {sharedCopied ? "¡Link copiado!" : "Compartir Evento"}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={
                      event.instagramUrl ||
                      "https://instagram.com/mas30.eventos"
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-black/30 hover:bg-black/45 text-white text-xs transition-colors"
                  >
                    <Instagram className="w-3.5 h-3.5 text-[#ffb5d7]" />
                    {getEventText(event, "instagramLabel")}
                  </a>
                  {event.tiktokUrl && (
                    <a
                      href={event.tiktokUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-black/30 hover:bg-black/45 text-white text-xs transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#ffb5d7]" />
                      {getEventText(event, "tiktokLabel")}
                    </a>
                  )}
                </div>
              </div>

              {/* Información y Ubicación debajo en la columna izquierda */}
              <div className="space-y-6 pt-4 border-t border-white/20">
                <div>
                  <h3 className="text-2xl font-normal mb-4">Información</h3>
                  <div className="space-y-3 text-sm text-white/85">
                    {event.ageRestriction?.trim() && (
                      <div className="flex items-start gap-3">
                        <Info className="w-4 h-4 mt-1 shrink-0" />
                        <p className="whitespace-pre-line">
                          {event.ageRestriction}
                        </p>
                      </div>
                    )}
                    {event.description?.trim() && (
                      <div className="flex items-start gap-3">
                        <Info className="w-4 h-4 mt-1 shrink-0" />
                        <p className="whitespace-pre-line">{event.description}</p>
                      </div>
                    )}
                    {getEventText(event, "ticketInfoText").trim() && (
                      <div className="flex items-start gap-3">
                        <QrCode className="w-4 h-4 mt-1 shrink-0" />
                        <p className="whitespace-pre-line">
                          <EventPriceText
                            event={event}
                            text={getEventText(event, "ticketInfoText")}
                          />
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-normal mb-4">Ubicación</h3>
                  <div className="flex items-start gap-3 text-sm text-white/85 mb-4">
                    <MapPin className="w-4 h-4 mt-1 shrink-0" />
                    <p>
                      {[event.venueAddress, event.venueCity]
                        .filter((s) => s && s.trim())
                        .join(", ")}
                    </p>
                  </div>
                  <div className="rounded-t-lg bg-[#1A1A1A] flex items-center gap-3 p-3">
                    <div className="h-8 px-2 rounded bg-[#f5f4f0] flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src="/logo-mas30.png"
                        alt="MASTREINTA"
                        className="h-full w-auto object-contain"
                      />
                    </div>
                    <span className="font-medium text-sm">
                      {event.venueName}
                    </span>
                  </div>
                  <div className="rounded-b-lg overflow-hidden h-56 bg-[#1c1c1c]">
                    <iframe
                      src={
                        event.mapEmbedUrl ||
                        "https://www.google.com/maps?q=Palermo+Buenos+Aires&output=embed"
                      }
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA (#121212): COMPRA POR TRANSFERENCIA + EMISIÓN DE QR + PREGUNTAS */}
          <div className="md:pl-12 py-8 md:py-12 flex flex-col min-w-0 space-y-8">
            <div className="hidden lg:flex justify-end">
              <Link
                href="/"
                className="flex items-center gap-1 text-sm hover:opacity-80"
              >
                Volver <X className="w-6 h-6" />
              </Link>
            </div>

            {/* BLOQUE DE RESERVA POR TRANSFERENCIA Y ACCESO QR */}
            <div
              id="reservar"
              className="bg-[#1c1c1c] rounded-lg p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-2xl font-normal text-white">
                    Tickets & Accesos QR
                  </h2>
                  {getEventText(event, "checkoutNote") && (
                    <p className="text-xs text-[#8a8a8a] mt-1">
                      {getEventText(event, "checkoutNote")}
                    </p>
                  )}
                </div>
                <QrCode className="w-7 h-7 text-[#ffb5d7]" />
              </div>

              {/* PLANO DEL LUGAR, MESAS Y SECTORES (SI ESTÁ HABILITADO) */}
              {event.venueMap?.enabled && (event.venueMap.spots?.length || 0) > 0 && (
                <div className="pb-4 border-b border-white/10">
                  <VenueMapViewer
                    event={event}
                    selectedSpotId={selectedSpot?.id}
                    onSelectSpot={(spot) => {
                      setSelectedSpot(spot);
                    }}
                  />
                </div>
              )}

              {/* LUGAR O MESA SELECCIONADA EN EL PLANO */}
              {selectedSpot ? (
                <div className="p-4 rounded-xl bg-[#221820] border-2 border-[#AF2C75] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-[#ffb5d7] font-bold block">
                      📍 Lugar Seleccionado en el Plano
                    </span>
                    <h3 className="text-base font-extrabold text-white">
                      {selectedSpot.name} {selectedSpot.sectorName ? `· ${selectedSpot.sectorName}` : ""}
                    </h3>
                    <p className="text-xs text-[#b0b0b0]">
                      Incluye <strong>{selectedSpot.capacity} accesos QR individuales</strong> · Total: <strong className="text-[#ffb5d7] font-mono">{formatARS(selectedSpot.price)}</strong>
                    </p>
                    {selectedSpot.perks && (
                      <p className="text-xs text-amber-300 font-medium pt-0.5">
                        ✨ {selectedSpot.perks}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSpot(null)}
                    className="self-start sm:self-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2a2a2a] hover:bg-[#353535] text-[#ffb5d7] border border-[#ffb5d7]/30 transition-colors cursor-pointer"
                  >
                    ✕ Cambiar a Entrada General
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. Selector de Tandas Generales */}
                  <div className="space-y-2.5">
                    <label className="text-xs uppercase text-[#8a8a8a] block">
                      1. Elegí tu entrada general
                    </label>
                    {event.ticketTiers.map((tier) => {
                      const isSelected = tier.id === selectedTier?.id;
                      const available = Math.max(0, tier.stock - tier.sold);
                      return (
                        <div
                          key={tier.id}
                          onClick={() => setSelectedTierId(tier.id)}
                          className={`p-4 rounded-md cursor-pointer transition-colors flex items-center justify-between gap-4 ${
                            isSelected
                              ? "bg-[#353535] border border-[#ffb5d7]"
                              : "bg-[#121212] border border-[#2a2a2a] hover:bg-[#242424]"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-base text-white">
                                {tier.name}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-sm bg-[#1c1c1c] text-white/70">
                                Quedan {available}
                              </span>
                            </div>
                            <p className="text-xs text-[#8a8a8a]">
                              {tier.description}
                            </p>
                          </div>
                          <span className="text-lg font-medium text-[#ffb5d7] shrink-0">
                            {formatARS(tier.price)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 2. Cantidad */}
                  <div className="p-4 rounded-md bg-[#121212] border border-[#2a2a2a] flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium block">
                        2. Cantidad de Entradas
                      </span>
                      <span className="text-xs text-[#8a8a8a]">
                        {qrCountPerUnit > 1
                          ? `Cada unidad incluye ${qrCountPerUnit} QRs (Total: ${totalQRs} códigos QR)`
                          : "Cada entrada genera su propio código QR personal"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-9 h-9 rounded-sm bg-[#252525] text-white font-medium cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-lg font-medium w-6 text-center">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(10, quantity + 1))}
                        className="w-9 h-9 rounded-sm bg-[#252525] text-white font-medium cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 3. Selección de Método de Pago y Total */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase text-[#8a8a8a]">
                    3. Método de Pago
                  </span>
                  <span className="text-lg font-medium text-[#ffb5d7]">
                    Total: {formatARS(totalAmount)}
                  </span>
                </div>

                {event.paymentAccountId ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("mercadopago")}
                      className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                        paymentMethod === "mercadopago"
                          ? "bg-[#009ee3]/15 border-[#009ee3] text-white shadow-md shadow-sky-950/40 ring-1 ring-[#009ee3]/50"
                          : "bg-[#121212] border-[#2a2a2a] text-white/60 hover:bg-[#1a1a1a]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold text-xs text-[#00b2f6]">
                          <CreditCard className="w-4 h-4" />
                          Mercado Pago
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#009ee3]/30 text-[#60cdff]">
                          Automático
                        </span>
                      </div>
                      <span className="text-[11px] text-white/80 leading-tight">
                        Tarjetas, Débito o Saldo · QR Inmediato
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("transfer")}
                      className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                        paymentMethod === "transfer"
                          ? "bg-soft-pink/15 border-soft-pink text-white shadow-md ring-1 ring-soft-pink/50"
                          : "bg-[#121212] border-[#2a2a2a] text-white/60 hover:bg-[#1a1a1a]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold text-xs text-soft-pink">
                          <Wallet className="w-4 h-4" />
                          Transferencia
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                          Manual
                        </span>
                      </div>
                      <span className="text-[11px] text-white/80 leading-tight">
                        Alias / CBU + Comprobante WhatsApp
                      </span>
                    </button>
                  </div>
                ) : null}

                {/* Si elige Transferencia (o el evento no tiene MP configurado), mostramos datos bancarios */}
                {(paymentMethod === "transfer" || !event.paymentAccountId) && (
                  <div className="p-4 rounded-md bg-[#121212] border border-[#353535] space-y-3">
                    <span className="text-xs uppercase text-[#8a8a8a] block">
                      Datos para Transferir
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-3 rounded bg-[#1c1c1c] flex items-center justify-between">
                        <div>
                          <span className="text-[#8a8a8a] block text-[10px] uppercase">
                            Alias
                          </span>
                          <strong className="font-mono text-white">
                            {bank.alias}
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(bank.alias);
                            setCopiedAlias(true);
                            setTimeout(() => setCopiedAlias(false), 2000);
                          }}
                          className="px-2.5 py-1 rounded-sm bg-white text-black font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          {copiedAlias ? (
                            <>
                              <Check className="w-3 h-3" /> Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copiar
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-3 rounded bg-[#1c1c1c] flex items-center justify-between">
                        <div>
                          <span className="text-[#8a8a8a] block text-[10px] uppercase">
                            CBU / CVU
                          </span>
                          <strong className="font-mono text-white text-[11px]">
                            {bank.cbu}
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(bank.cbu);
                            setCopiedCbu(true);
                            setTimeout(() => setCopiedCbu(false), 2000);
                          }}
                          className="px-2.5 py-1 rounded-sm bg-[#353535] text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCbu ? (
                            <>
                              <Check className="w-3 h-3" /> Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copiar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#8a8a8a]">
                      Titular: {bank.accountHolder} · {bank.bankName}
                    </p>
                  </div>
                )}
              </div>

              {/* 4. Formulario del Comprador */}
              <form onSubmit={paymentMethod === "mercadopago" && event.paymentAccountId ? handleMercadoPagoCheckout : handleOrderSubmit} className="space-y-3.5">
                <span className="text-xs uppercase text-[#8a8a8a] block">
                  4. Tus Datos para los Tickets
                </span>

                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Nombre y Apellido *"
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-[#8a8a8a]"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="WhatsApp *"
                    className="px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-[#8a8a8a]"
                  />
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="Email *"
                    className="px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-[#8a8a8a]"
                  />
                </div>

                {totalQRs > 1 && (
                  <div className="p-3.5 rounded-md bg-[#121212] border border-[#2a2a2a] space-y-2">
                    <p className="text-xs text-white/80 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#ffb5d7]" />
                      Nombres para cada QR individual ({totalQRs} accesos):
                    </p>
                    {attendees.map((att, idx) => (
                      <div key={idx}>
                        <input
                          type="text"
                          value={att.name}
                          onChange={(e) =>
                            handleAttendeeChange(idx, "name", e.target.value)
                          }
                          placeholder={`Nombre Invitado QR #${idx + 1}`}
                          className="w-full px-2.5 py-1.5 rounded bg-[#1c1c1c] text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Nota opcional (cumpleaños, dudas, etc.)"
                  className="w-full px-3.5 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white placeholder:text-[#8a8a8a]"
                />

                {mpError && (
                  <div className="p-3 rounded-md bg-red-950/80 border border-red-500/40 text-red-200 text-xs">
                    ⚠️ {mpError}
                  </div>
                )}

                {/* BOTÓN MERCADO PAGO */}
                {event.paymentAccountId && paymentMethod === "mercadopago" ? (
                  <div className="space-y-2 pt-1">
                    <button
                      type="submit"
                      disabled={payingMp}
                      className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-[#009ee3] to-[#00b2f6] hover:brightness-110 active:scale-[0.99] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-sky-950/50 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {payingMp ? (
                        <>
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Conectando con Mercado Pago...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          <span>Pagar con Mercado Pago · {formatARS(totalAmount)}</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-white/50 flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Pago procesado por Mercado Pago · Emisión instantánea de QR
                    </p>
                  </div>
                ) : (
                  /* BOTÓN WHATSAPP / TRANSFERENCIA */
                  <a
                    href={organizerWhatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      trackVisit("whatsapp_click", event.id);
                      if (buyerName.trim()) {
                        createTransferOrder({
                          event,
                          tierId: selectedSpot ? selectedSpot.id : selectedTier.id,
                          quantity: selectedSpot ? 1 : quantity,
                          buyerName,
                          buyerDni: "",
                          buyerEmail,
                          buyerPhone,
                          transferSender: buyerName,
                          transferReference: "Transferencia / WhatsApp",
                          notes,
                          attendees,
                          spotId: selectedSpot?.id,
                          spotName: selectedSpot?.name,
                          spotPerks: selectedSpot?.perks,
                          sectorName: selectedSpot?.sectorName,
                        }).catch(() => {});
                      }
                    }}
                    className="w-full py-3.5 px-4 rounded-[3px] bg-soft-pink hover:brightness-90 text-[#1c1c1c] font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-[#1c1c1c]" />
                    Contactar al WhatsApp del Organizador (Enviar Datos y Comprobante)
                  </a>
                )}

                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="hidden w-full py-3.5 rounded-[3px] bg-soft-pink hover:brightness-90 text-[#1c1c1c] font-medium text-base cursor-pointer transition-all"
                >
                  {submittingOrder
                    ? "Registrando..."
                    : `Informar Transferencia (${formatARS(totalAmount)}) y Solicitar ${totalQRs} QR${totalQRs > 1 ? "s" : ""}`}
                </button>
              </form>
            </div>

            {/* PREGUNTAS DEL EVENTO */}
            <div className="bg-[#1c1c1c] rounded-lg p-6 space-y-4">
              <h3 className="text-xl font-normal flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#ffb5d7]" />
                Preguntas sobre este evento
              </h3>

              {questions.map((q) => (
                <div
                  key={q.id}
                  className="p-3.5 rounded-md bg-[#121212] space-y-1 text-xs"
                >
                  <p className="text-white">
                    <strong>{q.name}:</strong> &ldquo;{q.message}&rdquo;
                  </p>
                  {q.reply && (
                    <p className="text-[#ffb5d7]">
                      <strong>MAS30:</strong> {q.reply}
                    </p>
                  )}
                </div>
              ))}

              {qSent ? (
                <p className="text-xs text-[#ffb5d7]">
                  ✓ Tu pregunta fue enviada al Administrador.
                </p>
              ) : (
                <form onSubmit={handleQuestionSubmit} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      value={qName}
                      onChange={(e) => setQName(e.target.value)}
                      placeholder="Tu nombre *"
                      className="px-3 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                    <input
                      type="email"
                      required
                      value={qEmail}
                      onChange={(e) => setQEmail(e.target.value)}
                      placeholder="Tu email *"
                      className="px-3 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={qMessage}
                      onChange={(e) => setQMessage(e.target.value)}
                      placeholder="Escribí tu consulta sobre esta fiesta..."
                      className="flex-1 px-3 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-[3px] bg-white text-black text-xs font-medium cursor-pointer flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" /> Enviar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
