"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Copy,
  Info,
  MapPin,
  MessageSquare,
  QrCode,
  Send,
  Users,
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
} from "@/lib/store";
import {
  BankSettings,
  EventItem,
  InquiryItem,
  OrderAttendeeInput,
} from "@/lib/types";
import BreshPosterArt from "@/components/BreshPosterArt";

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug || "";

  const [event, setEvent] = useState<EventItem | undefined>(undefined);
  const [bank, setBank] = useState<BankSettings>(INITIAL_SETTINGS);
  const [questions, setQuestions] = useState<InquiryItem[]>([]);

  // Estado Reserva / Compra por Transferencia
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
  const [submittingOrder, setSubmittingOrder] = useState(false);

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
        const allInq = getInquiries();
        setQuestions(
          allInq.filter(
            (i) =>
              i.type === "PREGUNTA_EVENTO" &&
              i.eventId === found.id &&
              i.isPublic &&
              i.reply
          )
        );
      }
    };
    load();
    window.addEventListener("mas30-store-updated", load);
    return () => window.removeEventListener("mas30-store-updated", load);
  }, [slug, selectedTierId]);

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
  const totalAmount = (selectedTier?.price || 0) * quantity;

  const handleAttendeeChange = (
    idx: number,
    field: "name" | "dni",
    val: string
  ) => {
    setAttendees((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !buyerDni.trim() || !transferReference.trim())
      return;
    setSubmittingOrder(true);
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
        notes,
        attendees,
      });
      router.push(`/mi-entrada/${order.orderCode}?nueva=1`);
    } finally {
      setSubmittingOrder(false);
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
              <h1 className="text-5xl font-medium mt-4 mb-2">MAS30</h1>
              <h2 className="text-4xl md:text-5xl font-medium mb-2">
                {event.title}
              </h2>
              <p className="text-white/80 text-sm mt-2">{event.subtitle}</p>
            </div>

            <div className="w-full">
              <div className="mb-6 aspect-video max-w-md mx-auto lg:mx-0 rounded-md w-full overflow-hidden shadow-xl">
                <BreshPosterArt event={event} variant="wide" />
              </div>

              <div className="mb-8">
                <div className="text-sm text-white/60 mb-1">Fecha</div>
                <div className="text-[40px] font-medium leading-none">
                  {event.shortDate}
                </div>
                <div className="text-sm text-white/85 mt-1">
                  {event.dateLabel} · {event.time}
                </div>
              </div>

              {/* Información y Ubicación debajo en la columna izquierda */}
              <div className="space-y-6 pt-4 border-t border-white/20">
                <div>
                  <h3 className="text-2xl font-normal mb-4">Información</h3>
                  <div className="space-y-3 text-sm text-white/85">
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 mt-1 shrink-0" />
                      <p>{event.ageRestriction}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 mt-1 shrink-0" />
                      <p>{event.description}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-normal mb-4">Ubicación</h3>
                  <div className="flex items-start gap-3 text-sm text-white/85 mb-4">
                    <MapPin className="w-4 h-4 mt-1 shrink-0" />
                    <p>
                      {event.venueAddress}, {event.venueCity}
                    </p>
                  </div>
                  <div className="rounded-t-lg bg-[#1A1A1A] flex items-center gap-3 p-3">
                    <div className="w-9 h-9 rounded-full bg-[#f6f3ec] flex items-center justify-center overflow-hidden">
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
                  <p className="text-xs text-[#8a8a8a] mt-1">
                    Aboná por transferencia bancaria · Recibís 1 código QR individual por cada entrada
                  </p>
                </div>
                <QrCode className="w-7 h-7 text-[#ffb5d7]" />
              </div>

              {/* 1. Selector de Tandas */}
              <div className="space-y-2.5">
                <label className="text-xs uppercase text-[#8a8a8a] block">
                  1. Elegí tu sector / tanda
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
                    Cada entrada genera su propio código QR personal
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

              {/* 3. Datos Bancarios */}
              <div className="p-4 rounded-md bg-[#121212] border border-[#353535] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase text-[#8a8a8a]">
                    3. Datos para Transferir
                  </span>
                  <span className="text-lg font-medium text-[#ffb5d7]">
                    Total: {formatARS(totalAmount)}
                  </span>
                </div>

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

              {/* 4. Formulario del Comprador */}
              <form onSubmit={handleOrderSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Nombre y Apellido *"
                    className="px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-[#8a8a8a]"
                  />
                  <input
                    type="text"
                    required
                    value={buyerDni}
                    onChange={(e) => setBuyerDni(e.target.value)}
                    placeholder="DNI *"
                    className="px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-[#8a8a8a]"
                  />
                </div>

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

                {quantity > 1 && (
                  <div className="p-3.5 rounded-md bg-[#121212] border border-[#2a2a2a] space-y-2">
                    <p className="text-xs text-white/80 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#ffb5d7]" />
                      Nombres para cada QR individual ({quantity} entradas):
                    </p>
                    {attendees.map((att, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={att.name}
                          onChange={(e) =>
                            handleAttendeeChange(idx, "name", e.target.value)
                          }
                          placeholder={`Nombre Invitado QR #${idx + 1}`}
                          className="col-span-7 px-2.5 py-1.5 rounded bg-[#1c1c1c] text-xs text-white"
                        />
                        <input
                          type="text"
                          value={att.dni}
                          onChange={(e) =>
                            handleAttendeeChange(idx, "dni", e.target.value)
                          }
                          placeholder="DNI"
                          className="col-span-5 px-2.5 py-1.5 rounded bg-[#1c1c1c] text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={transferSender}
                    onChange={(e) => setTransferSender(e.target.value)}
                    placeholder="Titular cuenta desde la que transferís *"
                    className="px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-[#8a8a8a]"
                  />
                  <input
                    type="text"
                    required
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                    placeholder="N° Comprobante / Operación *"
                    className="px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white placeholder:text-[#8a8a8a]"
                  />
                </div>

                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Nota opcional (cumpleaños, dudas, etc.)"
                  className="w-full px-3.5 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white placeholder:text-[#8a8a8a]"
                />

                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="w-full py-3.5 rounded-[3px] bg-soft-pink hover:brightness-90 text-[#1c1c1c] font-medium text-base cursor-pointer transition-all"
                >
                  {submittingOrder
                    ? "Registrando..."
                    : `Informar Transferencia (${formatARS(totalAmount)}) y Solicitar ${quantity} QR`}
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
