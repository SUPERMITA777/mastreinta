"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  QrCode,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type { TicketQR } from "@/lib/types";
import TicketQRCard from "@/components/TicketQRCard";

type Info = {
  status: string;
  paymentStatus?: string;
  orderCode: string;
  eventTitle: string;
  eventSlug?: string;
  buyerName?: string;
  totalAmount?: number;
  tickets?: TicketQR[];
} | null;

const MAX_TRIES = 24;

function Resultado() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || "";
  const accessToken = searchParams.get("t") || "";
  const resParam = searchParams.get("res") || "";
  const rawPaymentId =
    searchParams.get("payment_id") || searchParams.get("collection_id") || "";
  const paymentId = /^\d+$/.test(rawPaymentId) ? rawPaymentId : "";
  const mpStatus =
    searchParams.get("status") || searchParams.get("collection_status") || "";

  const [info, setInfo] = useState<Info>(null);
  const [tries, setTries] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ref) return;
    let stop = false;
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      if (stop) return;
      if (tries >= MAX_TRIES) {
        setTimedOut(true);
        return;
      }
      timerId = setTimeout(() => {
        if (!stop) setTries((n) => n + 1);
      }, 2500);
    };

    const tick = async () => {
      try {
        const qs = new URLSearchParams({ ref, t: accessToken });
        if (paymentId) qs.set("payment_id", paymentId);
        if (tries % 3 === 0) qs.set("sync", "1");

        const r = await fetch(`/api/mp/order-status?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!r.ok) {
          if (r.status === 403 || r.status === 404) {
            if (!stop) setTimedOut(true);
            return;
          }
          scheduleNext();
          return;
        }
        if (stop) return;

        const d = (await r.json()) as NonNullable<Info>;
        setInfo(d);

        const approvedWithTickets =
          d.status === "APROBADA" &&
          Array.isArray(d.tickets) &&
          d.tickets.length > 0;
        const rejectedFinal = d.status === "RECHAZADA";
        const returnedWithFailure =
          (resParam === "failure" || mpStatus === "rejected") &&
          d.status !== "APROBADA" &&
          (d.paymentStatus === "rejected" || tries >= 2);

        if (approvedWithTickets || rejectedFinal || returnedWithFailure) {
          return;
        }
        scheduleNext();
      } catch {
        scheduleNext();
      }
    };

    tick();
    return () => {
      stop = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [ref, accessToken, paymentId, resParam, mpStatus, tries, reloadKey]);

  const status = info?.status;
  const isFailure =
    status === "RECHAZADA" ||
    ((resParam === "failure" || mpStatus === "rejected") &&
      status !== "APROBADA" &&
      (info?.paymentStatus === "rejected" || tries >= 2));

  const retryHref = info?.eventSlug ? `/eventos/${info.eventSlug}` : "/";

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
      ) : isFailure ? (
        <div className="text-center space-y-4 max-w-md mx-auto py-12">
          <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-3xl font-normal">El pago no se pudo completar</h1>
          <p className="text-sm text-[#8a8a8a]">
            No se realizó ningún cobro. Podés volver al evento e intentarlo nuevamente con Mercado Pago o transferencia bancaria.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href={retryHref}
              className="px-5 py-2.5 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm"
            >
              {info?.eventSlug ? "Volver al Evento" : "Volver a Eventos"}
            </Link>
            {info?.eventSlug && (
              <Link
                href="/"
                className="px-5 py-2.5 rounded-[3px] bg-white/10 hover:bg-white/20 text-white font-medium text-sm"
              >
                Ver todos los eventos
              </Link>
            )}
          </div>
        </div>
      ) : timedOut ? (
        <div className="text-center space-y-4 max-w-md mx-auto py-12">
          <Clock className="w-12 h-12 text-[#ffb5d7] mx-auto" />
          <h1 className="text-2xl md:text-3xl font-normal">
            El pago sigue pendiente de confirmación
          </h1>
          <p className="text-sm text-[#8a8a8a]">
            Mercado Pago todavía no informó la acreditación. Si ya abonaste, recibirás tus códigos QR por email en cuanto se confirme o podés volver a comprobar ahora.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setTimedOut(false);
                setTries(0);
                setReloadKey((k) => k + 1);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Volver a comprobar
            </button>
            {info?.orderCode && (
              <Link
                href={`/mi-entrada/${encodeURIComponent(info.orderCode)}`}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[3px] bg-white/10 hover:bg-white/20 text-white font-medium text-sm"
              >
                Ver mi orden #{info.orderCode}
              </Link>
            )}
          </div>
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
