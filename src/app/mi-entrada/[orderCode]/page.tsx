"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageCircle,
  QrCode,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  approveOrderAndGenerateQRs,
  formatARS,
  getBankSettings,
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
  const [approvingDemo, setApprovingDemo] = useState(false);

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

  const handleQuickDemoApprove = async () => {
    if (!order) return;
    setApprovingDemo(true);
    try {
      await approveOrderAndGenerateQRs(order.id);
      loadOrderData();
    } finally {
      setApprovingDemo(false);
    }
  };

  if (!order) {
    return (
      <div className="container py-24 text-center space-y-5">
        <AlertCircle className="w-10 h-10 text-[#ffb5d7] mx-auto" />
        <h1 className="text-3xl font-normal text-white">
          No encontramos la orden &ldquo;{rawCode}&rdquo;
        </h1>
        <p className="text-sm text-[#8a8a8a] max-w-md mx-auto">
          Probá con{" "}
          <strong className="text-white font-mono">MAS30-8492</strong> (orden aprobada) o{" "}
          <strong className="text-white font-mono">MAS30-9104</strong> (pendiente).
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/mi-entrada/MAS30-8492"
            className="px-5 py-2.5 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm"
          >
            Ver Orden Ejemplo (MAS30-8492)
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-[3px] bg-[#353535] text-white font-medium text-sm"
          >
            Volver a Eventos
          </Link>
        </div>
      </div>
    );
  }

  const whatsappMessage = encodeURIComponent(
    `¡Hola MAS30! Informo mi reserva código *${order.orderCode}* para *${order.eventTitle}* (${order.quantity}x ${order.tierName} - Total ${formatARS(
      order.totalAmount
    )}). Comprobante: ${order.transferReference}.`
  );

  return (
    <div className="bg-dark-background text-white min-h-screen py-12">
      <div className="container space-y-10">
        {/* Cabecera estilo Bresh */}
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
              href="/admin/scanner"
              className="px-4 py-2 rounded-sm bg-[#3F3F3F] text-white text-sm hover:bg-[#4f4f4f] transition-colors flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Lector QR Puerta
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-sm bg-[#3F3F3F] text-white text-sm hover:bg-[#4f4f4f] transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Panel Admin
            </Link>
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
                Titular: <strong className="text-white">{order.buyerName}</strong>{" "}
                (DNI {order.buyerDni}) · {order.quantity}x {order.tierName} · Total:{" "}
                <strong className="text-[#ffb5d7]">
                  {formatARS(order.totalAmount)}
                </strong>
              </p>
              <p className="text-xs text-[#8a8a8a]">
                Comprobante: {order.transferReference} ({order.transferSender})
              </p>
            </div>

            <a
              href={`https://wa.me/${bank.whatsappSupport.replace(
                /[^0-9]/g,
                ""
              )}?text=${whatsappMessage}`}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm flex items-center justify-center gap-2 shrink-0 hover:brightness-90"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar Comprobante por WhatsApp
            </a>
          </div>

          {order.status === "PENDIENTE" && (
            <div className="p-5 rounded-md bg-[#121212] border border-[#353535] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#ffb5d7]">
                  Transferencia en revisión por el Administrador
                </p>
                <p className="text-xs text-[#8a8a8a]">
                  En cuanto el administrador autorice el pago en el Panel Admin, aparecerán acá tus{" "}
                  {order.quantity} códigos QR individuales.
                </p>
              </div>
              <button
                type="button"
                onClick={handleQuickDemoApprove}
                disabled={approvingDemo}
                className="px-4 py-2.5 rounded-[3px] bg-bresh text-white text-xs font-medium cursor-pointer shrink-0 hover:brightness-90"
              >
                {approvingDemo
                  ? "Generando..."
                  : `Simular Aprobación Admin (${order.quantity} QRs)`}
              </button>
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
