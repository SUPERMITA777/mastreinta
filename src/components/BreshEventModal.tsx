"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Copy,
  Info,
  MapPin,
  MessageSquare,
  QrCode,
  Send,
  X,
} from "lucide-react";
import {
  BankSettings,
  EventItem,
  InquiryItem,
  OrderAttendeeInput,
} from "@/lib/types";
import {
  createInquiry,
  createTransferOrder,
  formatARS,
  getBankSettings,
  getInquiries,
  INITIAL_SETTINGS,
} from "@/lib/store";
import BreshPosterArt from "./BreshPosterArt";

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
  const [submitting, setSubmitting] = useState(false);

  // Estado Pregunta Rápida
  const [qName, setQName] = useState("");
  const [qEmail, setQEmail] = useState("");
  const [qMessage, setQMessage] = useState("");
  const [qSent, setQSent] = useState(false);

  useEffect(() => {
    if (!event) return;
    setSelectedTierId(event.ticketTiers[0]?.id || "");
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
    setAttendees((prev) =>
      Array.from({ length: quantity }, (_, idx) => {
        if (idx === 0) {
          return {
            name: prev[0]?.name || buyerName,
            dni: prev[0]?.dni || buyerDni,
          };
        }
        return prev[idx] || { name: "", dni: "" };
      })
    );
  }, [quantity, buyerName, buyerDni]);

  if (!event) return null;

  const selectedTier =
    event.ticketTiers.find((t) => t.id === selectedTierId) ||
    event.ticketTiers[0];
  const totalAmount = (selectedTier?.price || 0) * quantity;

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !buyerDni.trim() || !transferReference.trim())
      return;
    setSubmitting(true);
    try {
      const order = await createTransferOrder({
        event,
        tierId: selectedTier.id,
        quantity,
        buyerName,
        buyerDni,
        buyerEmail,
        buyerPhone,
        transferSender: transferSender || buyerName,
        transferReference,
        attendees,
      });
      onClose();
      router.push(`/mi-entrada/${order.orderCode}`);
    } finally {
      setSubmitting(false);
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
                  <h1 className="text-4xl md:text-5xl font-medium mt-4 mb-2 tracking-tight">
                    MAS30
                  </h1>
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
                    <div className="mb-8">
                      <div className="text-sm text-white/60 mb-1">Fecha</div>
                      <div className="text-[40px] font-medium leading-none">
                        {event.shortDate}
                      </div>
                      <div className="text-sm text-white/80 mt-1">
                        {event.dateLabel} · {event.time}
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
                      <p className="text-xs text-white/60">
                        Pago por transferencia · El administrador autoriza y emite 1 QR por entrada
                      </p>
                    </div>
                    <QrCode className="w-6 h-6 text-[#ffb5d7]" />
                  </div>

                  {/* Selección de Tanda */}
                  <div className="space-y-2">
                    <label className="text-xs text-white/60 uppercase">
                      1. Selecciona tu entrada
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
                        Se genera 1 código QR individual por cada entrada
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        required
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Tu Nombre y Apellido *"
                        className="px-3 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-white/40"
                      />
                      <input
                        type="text"
                        required
                        value={buyerDni}
                        onChange={(e) => setBuyerDni(e.target.value)}
                        placeholder="Tu DNI *"
                        className="px-3 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-white/40"
                      />
                    </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        required
                        value={transferSender}
                        onChange={(e) => setTransferSender(e.target.value)}
                        placeholder="Titular cuenta emisora *"
                        className="px-3 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-white/40"
                      />
                      <input
                        type="text"
                        required
                        value={transferReference}
                        onChange={(e) => setTransferReference(e.target.value)}
                        placeholder="N° Comprobante / Operación *"
                        className="px-3 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-white/40"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 rounded-[3px] bg-[#ffb5d7] hover:brightness-90 text-[#1c1c1c] font-medium text-base cursor-pointer transition-all"
                    >
                      {submitting
                        ? "Procesando..."
                        : `Confirmar Reserva (${formatARS(totalAmount)}) y Solicitar ${quantity} QR`}
                    </button>
                  </form>
                </div>
              ) : (
                /* VISTA INFORMACIÓN + UBICACIÓN + MAPA EXACTA A BRESH */
                <>
                  <div className="mb-10">
                    <h3 className="text-2xl font-normal mb-6">Información</h3>
                    <div className="flex flex-col gap-4 mb-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <Info className="w-[18px] h-[18px] text-white/60" />
                        </div>
                        <div>
                          <p className="text-white/60 text-sm leading-relaxed">
                            {event.ageRestriction}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <Info className="w-[18px] h-[18px] text-white/60" />
                        </div>
                        <div>
                          <p className="text-white/60 text-sm leading-relaxed">
                            {event.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <QrCode className="w-[18px] h-[18px] text-white/60" />
                        </div>
                        <div>
                          <p className="text-white/60 text-sm leading-relaxed">
                            Entradas desde{" "}
                            <strong className="text-white font-medium">
                              {formatARS(
                                Math.min(...event.ticketTiers.map((t) => t.price))
                              )}
                            </strong>{" "}
                            por transferencia. Al autorizarse tu pago recibís un QR individual por cada entrada.
                          </p>
                        </div>
                      </div>
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
                          {event.venueAddress}, {event.venueCity}
                        </p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="rounded-t-lg bg-[#1A1A1A] flex items-center gap-3 p-3">
                        <div className="w-10 h-10 rounded-full bg-[#f6f3ec] flex items-center justify-center overflow-hidden">
                          <img
                            src="/logo-mas30.png"
                            alt="MAS30"
                            className="w-full h-full object-contain scale-150"
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
