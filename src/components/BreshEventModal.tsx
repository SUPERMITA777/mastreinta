"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Info,
  Instagram,
  MapPin,
  MessageCircle,
  MessageSquare,
  QrCode,
  Send,
  Share2,
  X,
} from "lucide-react";
import {
  BankSettings,
  EventItem,
  InquiryItem,
  OrderAttendeeInput,
  VenueSpot,
} from "@/lib/types";
import {
  createInquiry,
  createTransferOrder,
  formatARS,
  getBankSettings,
  getInquiries,
  INITIAL_SETTINGS,
  trackVisit,
} from "@/lib/store";
import BreshPosterArt from "./BreshPosterArt";
import EventPriceText from "./EventPriceText";
import VenueMapViewer from "./VenueMapViewer";
import { fillEventTemplate, getEventText } from "@/lib/eventTexts";

interface BreshEventModalProps {
  event: EventItem | null;
  onClose: () => void;
}

export default function BreshEventModal({
  event,
  onClose,
}: BreshEventModalProps) {
  const router = useRouter();
  const [bank, setBank] = useState<BankSettings>(INITIAL_SETTINGS);
  const [questions, setQuestions] = useState<InquiryItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);

  // Estado Reserva por Transferencia
  const [selectedSpot, setSelectedSpot] = useState<VenueSpot | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(2);
  const [buyerName, setBuyerName] = useState("");
  const [buyerDni, setBuyerDni] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [transferSender, setTransferSender] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [attendees, setAttendees] = useState<OrderAttendeeInput[]>([
    { name: "", dni: "" },
    { name: "", dni: "" },
  ]);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [sharedCopied, setSharedCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  // Estado Pregunta Rápida
  const [qName, setQName] = useState("");
  const [qEmail, setQEmail] = useState("");
  const [qMessage, setQMessage] = useState("");
  const [qSent, setQSent] = useState(false);

  useEffect(() => {
    if (!event) return;
    trackVisit("event_modal", event.id);
    setSelectedTierId(event.ticketTiers[0]?.id || "");
    setSelectedSpot(null);
    setShowCheckout(false);
    setBank(getBankSettings());
    const allInq = getInquiries();
    setQuestions(
      allInq.filter(
        (i) =>
          (i.eventId === event.id || i.eventId === "ALL" || !i.eventId) &&
          i.isPublic &&
          Boolean(i.reply)
      )
    );
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [event]);

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

  if (!event) return null;

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
  ].join("\n");

  const organizerWhatsappHref = `https://wa.me/${(
    event.organizerWhatsapp || bank.whatsappSupport
  ).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappOrderText)}`;

  const handleMercadoPago = async () => {
    if (!event) return;
    setPayError("");
    if (!buyerName.trim() || !buyerPhone.trim() || !/^\S+@\S+\.\S+$/.test(buyerEmail)) {
      setPayError("Completá tu nombre, WhatsApp y un email válido.");
      return;
    }
    setPaying(true);
    try {
      const res = await fetch("/api/mp/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          tierId: selectedTier?.id,
          spotId: selectedSpot?.id,
          quantity: selectedSpot ? 1 : quantity,
          buyerName,
          buyerEmail,
          buyerPhone,
          attendees,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.initPoint) {
        throw new Error(data.error || "No pudimos iniciar el pago.");
      }
      window.location.href = data.initPoint;
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Error al iniciar el pago.");
      setPaying(false);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (buyerName.trim()) {
      createTransferOrder({
        event,
        tierId: selectedTier.id,
        quantity,
        buyerName,
        buyerDni: "",
        buyerEmail,
        buyerPhone,
        transferSender: buyerName,
        transferReference: "Transferencia / WhatsApp",
        attendees,
      }).catch(() => {});
    }
    window.open(organizerWhatsappHref, "_blank", "noopener,noreferrer");
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
      phone: "",
      message: qMessage,
    });
    setQSent(true);
    setQName("");
    setQEmail("");
    setQMessage("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overflow-x-hidden text-white animate-in fade-in duration-300">
      {/* Backdrop Blur idéntico a Bresh */}
      <div
        className="fixed inset-0 bg-gray-400/10 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Hoja Modal Deslizante (Estructura exacta de Bresh EventModal) */}
      <div className="relative w-full mt-[10px] lg:mt-[60px] z-10 bg-dark-background rounded-t-2xl overflow-hidden shadow-2xl">
        <div className="relative rounded-b-2xl overflow-hidden">
          {/* Mitad Izquierda Magenta #AF2C75 en Desktop */}
          <div className="bg-[#AF2C75] absolute w-1/2 h-full hidden lg:block" />

          <div className="container grid lg:grid-cols-2 overflow-hidden rounded-b-2xl relative z-10">
            {/* COLUMNA IZQUIERDA (#AF2C75) */}
            <div className="py-6 md:py-10 lg:pr-10 flex flex-col min-w-0 relative">
              <div className="bg-[#AF2C75] absolute top-0 -left-8 -right-8 h-full lg:hidden -z-10" />

              {/* Botón Cerrar en Móvil */}
              <div className="flex justify-end mb-4 lg:hidden z-20">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1 text-sm cursor-pointer"
                >
                  Volver
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative z-10">
                <div className="mb-8">
                  {getEventText(event, "headerLabel") && (
                    <h1 className="text-4xl md:text-5xl font-medium mt-4 mb-2 tracking-tight">
                      {getEventText(event, "headerLabel")}
                    </h1>
                  )}
                  <h2 className="text-3xl md:text-5xl font-medium mb-2 leading-tight">
                    {event.title}
                  </h2>
                </div>

                <div className="flex-grow flex items-center">
                  <div className="w-full">
                    {/* Póster horizontal (aspect-video max-w-md rounded-md) */}
                    <div className="mb-6 aspect-video max-w-md mx-auto lg:mx-0 rounded-md w-full overflow-hidden shadow-lg">
                      <BreshPosterArt event={event} variant="wide" />
                    </div>

                    {/* Bloque Fecha 40px */}
                    <div className="mb-6">
                      <div className="text-sm text-white/60 mb-1">Fecha</div>
                      <div className="text-[40px] font-medium leading-none">
                        {event.shortDate}
                      </div>
                      <div className="text-sm text-white/80 mt-1">
                        {event.dateLabel} · {event.time}
                      </div>
                    </div>

                    {/* Botones Rápidos: Compartir Evento + WhatsApp Organizador + Redes Sociales */}
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
                            const shareUrl = `${window.location.origin}/eventos/${event.slug}`;
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

                      {/* Links a Redes Sociales del Evento */}
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

                    {/* Botón CTA en móvil */}
                    <div className="mt-auto flex gap-2 p-2 rounded-md bg-dark-background lg:hidden mb-6">
                      <button
                        type="button"
                        onClick={() => setShowCheckout(!showCheckout)}
                        className="text-center flex-grow bg-[#ffb5d7] text-black font-medium py-3 rounded-md cursor-pointer"
                      >
                        {showCheckout
                          ? "Ver Información y Mapa"
                          : "Comprar Tickets (Transferencia / QR)"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA (Fondo #121212) */}
            <div className="md:pl-10 py-6 md:py-10 flex flex-col min-w-0">
              {/* Botón Volver X en Desktop */}
              <div className="hidden lg:flex justify-end mb-8">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1 text-sm hover:opacity-80 cursor-pointer"
                >
                  Volver
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Botón Principal Rosa #ffb5d7 en Desktop */}
              <div className="mb-8 lg:flex items-center gap-3 hidden">
                <button
                  type="button"
                  onClick={() => setShowCheckout(!showCheckout)}
                  className="text-center flex-grow text-xl hover:brightness-90 transition-all cursor-pointer bg-[#ffb5d7] text-black font-medium py-3 rounded-md"
                >
                  {showCheckout
                    ? "← Volver a Información del Evento"
                    : "Comprar Tickets"}
                </button>
                <Link
                  href={`/eventos/${event.slug}`}
                  onClick={onClose}
                  className="px-4 py-3.5 rounded-md bg-[#1c1c1c] hover:bg-[#252525] text-white/80 text-sm font-medium border border-[#353535]"
                >
                  Página completa
                </Link>
              </div>

              {showCheckout ? (
                /* FLUJO DE COMPRA POR TRANSFERENCIA + GENERACIÓN DE QR ESTILO BRESH */
                <div className="space-y-5 bg-[#1c1c1c] p-6 rounded-lg border border-[#353535]">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <h3 className="text-xl font-medium text-white">
                        Reservar Entradas con QR
                      </h3>
                      {getEventText(event, "checkoutNote") && (
                        <p className="text-xs text-white/60">
                          {getEventText(event, "checkoutNote")}
                        </p>
                      )}
                    </div>
                    <QrCode className="w-6 h-6 text-[#ffb5d7]" />
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
                        <h4 className="text-sm font-extrabold text-white">
                          {selectedSpot.name} {selectedSpot.sectorName ? `· ${selectedSpot.sectorName}` : ""}
                        </h4>
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
                      {/* Selección de Tanda */}
                      <div className="space-y-2">
                        <label className="text-xs text-white/60 uppercase">
                          1. Selecciona tu entrada general
                        </label>
                        <div className="space-y-2">
                          {event.ticketTiers.map((tier) => {
                            const active = tier.id === selectedTier?.id;
                            return (
                              <div
                                key={tier.id}
                                onClick={() => setSelectedTierId(tier.id)}
                                className={`p-3.5 rounded-md cursor-pointer transition-colors flex items-center justify-between ${
                                  active
                                    ? "bg-[#353535] border border-[#ffb5d7]"
                                    : "bg-[#121212] border border-[#2a2a2a] hover:bg-[#222]"
                                }`}
                              >
                                <div>
                                  <p className="font-medium text-sm text-white">
                                    {tier.name}
                                  </p>
                                  <p className="text-xs text-white/60">
                                    {tier.description}
                                  </p>
                                </div>
                                <span className="text-base font-semibold text-[#ffb5d7] ml-3 shrink-0">
                                  {formatARS(tier.price)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cantidad */}
                      <div className="flex items-center justify-between bg-[#121212] p-3.5 rounded-md border border-[#2a2a2a]">
                        <div>
                          <span className="text-sm font-medium block">
                            Cantidad de Entradas
                          </span>
                          <span className="text-xs text-white/60">
                            {qrCountPerUnit > 1
                              ? `Cada unidad incluye ${qrCountPerUnit} QRs (Total: ${totalQRs} códigos QR)`
                              : "Se genera 1 código QR individual por cada entrada"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-8 h-8 rounded bg-[#252525] text-white font-medium cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-semibold text-lg w-6 text-center">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(Math.min(10, quantity + 1))}
                            className="w-8 h-8 rounded bg-[#252525] text-white font-medium cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Datos de Transferencia */}
                  <div className="p-4 rounded-md bg-[#121212] border border-[#353535] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60 uppercase">
                        Transferir Total a MAS30:
                      </span>
                      <span className="text-lg font-semibold text-[#ffb5d7]">
                        {formatARS(totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[11px] text-white/50 block">
                          Alias Oficial
                        </span>
                        <span className="font-mono text-sm text-white">
                          {bank.alias}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(bank.alias);
                          setCopiedAlias(true);
                          setTimeout(() => setCopiedAlias(false), 2000);
                        }}
                        className="px-3 py-1.5 rounded-[3px] bg-[#353535] text-white text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedAlias ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Alias
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-white/50">
                      CBU: {bank.cbu} · {bank.accountHolder}
                    </p>
                  </div>

                  {/* Formulario Comprador */}
                  <form onSubmit={handleOrderSubmit} className="space-y-3">
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Tu Nombre y Apellido *"
                      className="w-full px-3 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-white/40"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        required
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="Tu WhatsApp *"
                        className="px-3 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-white/40"
                      />
                      <input
                        type="email"
                        required
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="Tu Email *"
                        className="px-3 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-white/40"
                      />
                    </div>

                    {event.paymentAccountId && (
                      <>
                        <button
                          type="button"
                          onClick={handleMercadoPago}
                          disabled={paying}
                          className="w-full py-3.5 px-4 rounded-[3px] bg-[#009ee3] hover:brightness-90 disabled:opacity-60 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          {paying
                            ? "Redirigiendo a Mercado Pago..."
                            : `Pagar ${formatARS(totalAmount)} con tarjeta o transferencia`}
                        </button>
                        {payError && (
                          <p className="text-xs text-red-300">{payError}</p>
                        )}
                        <p className="text-[11px] text-white/50 text-center">
                          Pago seguro con Mercado Pago. Recibís tus QR por email al acreditarse.
                        </p>
                      </>
                    )}

                    <a
                      href={`https://wa.me/${(
                        event.organizerWhatsapp || bank.whatsappSupport
                      ).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappOrderText)}`}
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
                            notes: selectedSpot ? `[Mesa / Sector: ${selectedSpot.name}]` : undefined,
                            attendees,
                            spotId: selectedSpot?.id,
                            spotName: selectedSpot?.name,
                            spotPerks: selectedSpot?.perks,
                            sectorName: selectedSpot?.sectorName,
                          }).catch(() => {});
                        }
                      }}
                      className="w-full py-3.5 px-4 rounded-[3px] bg-[#ffb5d7] hover:brightness-90 text-[#1c1c1c] font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-[#1c1c1c]" />
                      Contactar al WhatsApp del Organizador (Enviar Datos y Comprobante)
                    </a>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="hidden w-full py-3.5 rounded-[3px] bg-[#ffb5d7] hover:brightness-90 text-[#1c1c1c] font-medium text-base cursor-pointer transition-all"
                    >
                      {submitting
                        ? "Procesando..."
                        : `Confirmar Reserva (${formatARS(totalAmount)}) y Solicitar ${totalQRs} QR${totalQRs > 1 ? "s" : ""}`}
                    </button>
                  </form>
                </div>
              ) : (
                /* VISTA INFORMACIÓN + UBICACIÓN + MAPA EXACTA A BRESH */
                <>
                  <div className="mb-10">
                    <h3 className="text-2xl font-normal mb-6">Información</h3>
                    <div className="flex flex-col gap-4 mb-4">
                      {event.ageRestriction?.trim() && (
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            <Info className="w-[18px] h-[18px] text-white/60" />
                          </div>
                          <div>
                            <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">
                              {event.ageRestriction}
                            </p>
                          </div>
                        </div>
                      )}
                      {event.description?.trim() && (
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            <Info className="w-[18px] h-[18px] text-white/60" />
                          </div>
                          <div>
                            <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      )}
                      {getEventText(event, "ticketInfoText").trim() && (
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            <QrCode className="w-[18px] h-[18px] text-white/60" />
                          </div>
                          <div>
                            <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">
                              <EventPriceText
                                event={event}
                                text={getEventText(event, "ticketInfoText")}
                              />
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ubicación + Iframe Mapa igual a Bresh */}
                  <div className="mb-8">
                    <h3 className="text-2xl font-normal mb-6">Ubicación</h3>
                    <div className="flex items-start gap-4 mb-6">
                      <div className="mt-1">
                        <MapPin className="w-[18px] h-[18px] text-white/60" />
                      </div>
                      <div>
                        <p className="text-white/60 text-sm">
                          {[event.venueAddress, event.venueCity]
                            .filter((s) => s && s.trim())
                            .join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="mb-6">
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
                      <div className="rounded-b-lg overflow-hidden h-60 bg-[#1c1c1c]">
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
                          referrerPolicy="no-referrer-when-downgrade"
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preguntas rápidas del evento */}
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <h4 className="text-base font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#ffb5d7]" />
                      Preguntas sobre esta fecha
                    </h4>
                    {questions.map((q) => (
                      <div
                        key={q.id}
                        className="p-3 rounded-md bg-[#1c1c1c] text-xs space-y-1"
                      >
                        <p className="text-white/90">
                          <strong>{q.name}:</strong> {q.message}
                        </p>
                        <p className="text-[#ffb5d7]">
                          <strong>MAS30:</strong> {q.reply}
                        </p>
                      </div>
                    ))}

                    {qSent ? (
                      <p className="text-xs text-[#ffb5d7]">
                        ✓ Tu pregunta fue enviada al administrador.
                      </p>
                    ) : (
                      <form
                        onSubmit={handleQuestionSubmit}
                        className="flex flex-col sm:flex-row gap-2"
                      >
                        <input
                          type="text"
                          required
                          value={qName}
                          onChange={(e) => setQName(e.target.value)}
                          placeholder="Nombre"
                          className="sm:w-32 px-3 py-2 rounded-md bg-[#1c1c1c] text-xs text-white placeholder:text-white/40"
                        />
                        <input
                          type="text"
                          required
                          value={qMessage}
                          onChange={(e) => setQMessage(e.target.value)}
                          placeholder="¿Tenés alguna duda sobre esta fiesta?"
                          className="flex-1 px-3 py-2 rounded-md bg-[#1c1c1c] text-xs text-white placeholder:text-white/40"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-[3px] bg-white text-black text-xs font-medium cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Enviar
                        </button>
                      </form>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
