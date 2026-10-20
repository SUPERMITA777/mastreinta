"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageCircle,
  X,
} from "lucide-react";
import {
  formatARS,
  getBankSettings,
  getEvents,
  getOrderByCode,
  getTicketsByOrderCode,
  INITIAL_SETTINGS,
} from "@/lib/store";
import { BankSettings, OrderItem, TicketQR } from "@/lib/types";
import TicketQRCard from "@/components/TicketQRCard";

export default function MyOrderTicketsPage() {
  const params = useParams<{ orderCode: string }>();
  const rawCode = decodeURIComponent(params?.orderCode || "");

  const [order, setOrder] = useState<OrderItem | undefined>(undefined);
  const [tickets, setTickets] = useState<TicketQR[]>([]);
  const [bank, setBank] = useState<BankSettings>(INITIAL_SETTINGS);

  const loadOrderData = () => {
    const foundOrder = getOrderByCode(rawCode);
    setOrder(foundOrder);
    if (foundOrder) {
      setTickets(getTicketsByOrderCode(foundOrder.orderCode));
    }
    setBank(getBankSettings());
  };

  useEffect(() => {
    loadOrderData();
    window.addEventListener("mas30-store-updated", loadOrderData);
    window.addEventListener("storage", loadOrderData);
    return () => {
      window.removeEventListener("mas30-store-updated", loadOrderData);
      window.removeEventListener("storage", loadOrderData);
    };
  }, [rawCode]);

  if (!order) {
    return (
      <div className="container py-24 text-center space-y-5">
        <AlertCircle className="w-10 h-10 text-[#ffb5d7] mx-auto" />
        <h1 className="text-3xl font-normal text-white">
          No encontramos la orden &ldquo;{rawCode}&rdquo;
        </h1>
        <p className="text-sm text-[#8a8a8a] max-w-md mx-auto">
          Verificá que el código de reserva esté bien escrito.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm"
          >
            Volver a Eventos
          </Link>
        </div>
      </div>
    );
  }

  const orderEvent = getEvents().find((e) => e.id === order.eventId);
  const organizerPhone = (
    orderEvent?.organizerWhatsapp || bank.whatsappSupport
  ).replace(/[^0-9]/g, "");

  const totalQRs = order.totalQrCount || order.quantity;

  const whatsappMessage = encodeURIComponent(
    [
      `¡Hola! Te envío los datos y el comprobante de mi compra para *${order.eventTitle}* (${order.eventDateLabel}).`,
      ``,
      `🎟 *Detalle de la compra:*`,
      `• Orden: *${order.orderCode}*`,
      `• Entrada: ${order.quantity}x ${order.tierName}`,
      `• Cantidad de QRs / Accesos: *${totalQRs} QR${totalQRs > 1 ? "s" : ""}*`,
      `• Total: *${formatARS(order.totalAmount)}*`,
      ``,
      `👤 *Datos del cliente:*`,
      `• Nombre: ${order.buyerName}`,
      `• WhatsApp: ${order.buyerPhone}`,
      `• Email: ${order.buyerEmail}`,
    ].join("\n")
  );

  return (
    <div className="bg-dark-background text-white min-h-screen py-12">
      <div className="container space-y-10">
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-sm text-[#8a8a8a] mb-1">
              Orden #{order.orderCode}
            </p>
            <h1 className="text-3xl md:text-5xl font-normal">
              Mis Tickets QR
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-sm bg-white text-black text-sm flex items-center gap-1"
            >
              Eventos <X className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Resumen de la Orden */}
        <div className="rounded-lg bg-[#1c1c1c] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-sm bg-[#353535] font-mono text-sm text-white">
                  {order.orderCode}
                </span>
                {order.status === "APROBADA" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-[#AF2C75] text-white text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Autorizada · {tickets.length} Tickets QR Emitidos
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-[#353535] text-[#ffb5d7] text-xs font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    Pendiente de verificación de transferencia
                  </span>
                )}
              </div>

              <h2 className="text-2xl md:text-3xl font-normal text-white">
                {order.eventTitle}
              </h2>
              <p className="text-sm text-[#8a8a8a]">
                Titular: <strong className="text-white">{order.buyerName}</strong>
                {order.buyerDni ? ` (DNI ${order.buyerDni})` : ""} ·{" "}
                {order.quantity}x {order.tierName} ({totalQRs} QR
                {totalQRs > 1 ? "s" : ""}) · Total:{" "}
                <strong className="text-[#ffb5d7]">
                  {formatARS(order.totalAmount)}
                </strong>
              </p>
            </div>

            <a
              href={`https://wa.me/${organizerPhone}?text=${whatsappMessage}`}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm flex items-center justify-center gap-2 shrink-0 hover:brightness-90"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar Comprobante al WhatsApp del Organizador
            </a>
          </div>

          {order.status === "PENDIENTE" && (
            <div className="p-5 rounded-md bg-[#121212] border border-[#353535]">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#ffb5d7]">
                  Transferencia en revisión por el Organizador
                </p>
                <p className="text-xs text-[#8a8a8a]">
                  Enviá tu comprobante por WhatsApp al organizador. En cuanto se autorice tu pago, recibirás tus{" "}
                  {totalQRs} código{totalQRs > 1 ? "s" : ""} QR y código de 4 dígitos.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Grilla de Entradas QR */}
        {order.status === "APROBADA" && tickets.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-medium">
              Tus Entradas Individuales ({tickets.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {tickets.map((ticket) => (
                <TicketQRCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
