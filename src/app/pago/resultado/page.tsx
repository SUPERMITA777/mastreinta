"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, ExternalLink, QrCode, XCircle } from "lucide-react";
import type { TicketQR } from "@/lib/types";
import TicketQRCard from "@/components/TicketQRCard";

type Info = {
  status: string;
  orderCode: string;
  eventTitle: string;
  buyerName?: string;
  buyerEmail?: string;
  totalAmount?: number;
  tickets?: TicketQR[];
} | null;

function Resultado() {
  const ref = useSearchParams().get("ref") || "";
  const [info, setInfo] = useState<Info>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!ref) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/mp/order-status?ref=${encodeURIComponent(ref)}`, {
          cache: "no-store",
        });
        if (r.ok && !stop) {
          const d = await r.json();
          setInfo(d);
          // Si está pendiente o si está aprobada pero aún se están generando los tickets
          if (d.status === "PENDIENTE" || (d.status === "APROBADA" && (!d.tickets || d.tickets.length === 0))) {
            setTimeout(() => setTries((n) => n + 1), 2500);
          }
        }
      } catch {
        // reintenta
      }
    };
    tick();
    return () => {
      stop = true;
    };
  }, [ref, tries]);

  const status = info?.status;

  return (
    <div className="container py-12 md:py-16 text-white min-h-[75vh]">
      {status === "APROBADA" ? (
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Cabecera de éxito */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg shadow-emerald-950/40">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">
              ¡Pago Acreditado con Éxito!
            </h1>
            <p className="text-base text-white/80 max-w-lg mx-auto">
              Tu compra para <strong className="text-white">{info?.eventTitle}</strong> está confirmada y lista.
            </p>
            <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-xs font-mono text-white/90">
              <span>Orden #{info?.orderCode}</span>
              {info?.buyerEmail && <span>· Enviada a {info.buyerEmail}</span>}
            </div>
          </div>

          {/* Grilla de Entradas con QR */}
          {info?.tickets && info.tickets.length > 0 ? (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-soft-pink" />
                    Tus Entradas y Códigos QR ({info.tickets.length})
                  </h2>
                  <p className="text-xs text-white/60">
                    Podés descargar cada entrada a tu galería o compartirla directamente por WhatsApp.
                  </p>
                </div>
                {info?.orderCode && (
                  <Link
                    href={`/mi-entrada/${info.orderCode}`}
                    className="inline-flex items-center gap-1.5 text-xs text-soft-pink hover:underline font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Enlace permanente a mi orden
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {info.tickets.map((ticket) => (
                  <TicketQRCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center p-8 rounded-xl bg-[#1c1c1c] border border-white/10 space-y-3">
              <Clock className="w-8 h-8 text-[#ffb5d7] mx-auto animate-spin" />
              <p className="text-sm text-white/80">Generando tus códigos QR únicos...</p>
            </div>
          )}

          <div className="flex justify-center gap-3 pt-4">
            <Link
              href="/"
              className="px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-colors"
            >
              Volver a Eventos
            </Link>
            {info?.orderCode && (
              <Link
                href={`/mi-entrada/${info.orderCode}`}
                className="px-6 py-2.5 rounded-lg bg-soft-pink hover:brightness-95 text-[#1c1c1c] font-semibold text-sm transition-all"
              >
                Abrir Mis Entradas
              </Link>
            )}
          </div>
        </div>
      ) : status === "RECHAZADA" ? (
        <div className="text-center space-y-4 max-w-md mx-auto py-12">
          <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-3xl font-normal">El pago no se pudo completar</h1>
          <p className="text-sm text-[#8a8a8a]">
            No se realizó ningún cobro. Podés volver a intentarlo desde el evento.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-5 py-2.5 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm"
          >
            Volver a Eventos
          </Link>
        </div>
      ) : (
        <div className="text-center space-y-4 max-w-md mx-auto py-12">
          <Clock className="w-12 h-12 text-[#ffb5d7] mx-auto animate-spin" />
          <h1 className="text-3xl font-normal">Confirmando tu pago…</h1>
          <p className="text-sm text-[#8a8a8a]">
            Estamos esperando la confirmación de Mercado Pago. Esta página se
            actualiza sola para mostrarte tus entradas y códigos QR.
          </p>
        </div>
      )}
    </div>
  );
}

export default function PagoResultadoPage() {
  return (
    <Suspense fallback={null}>
      <Resultado />
    </Suspense>
  );
}
