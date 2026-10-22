"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

type Info = { status: string; orderCode: string; eventTitle: string } | null;

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
          if (d.status === "PENDIENTE") {
            setTimeout(() => setTries((n) => n + 1), 3000);
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
    <div className="container py-24 text-center space-y-5 text-white">
      {status === "APROBADA" ? (
        <>
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
          <h1 className="text-3xl font-normal">¡Pago acreditado!</h1>
          <p className="text-sm text-[#8a8a8a] max-w-md mx-auto">
            Te enviamos tus entradas con QR a tu email para{" "}
            <b>{info?.eventTitle}</b>. Código de orden: <b>{info?.orderCode}</b>.
            Revisá también la carpeta de spam.
          </p>
        </>
      ) : status === "RECHAZADA" ? (
        <>
          <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-3xl font-normal">El pago no se pudo completar</h1>
          <p className="text-sm text-[#8a8a8a] max-w-md mx-auto">
            No se realizó ningún cobro. Podés volver a intentarlo desde el evento.
          </p>
        </>
      ) : (
        <>
          <Clock className="w-12 h-12 text-[#ffb5d7] mx-auto" />
          <h1 className="text-3xl font-normal">Confirmando tu pago…</h1>
          <p className="text-sm text-[#8a8a8a] max-w-md mx-auto">
            Estamos esperando la confirmación de Mercado Pago. Esta página se
            actualiza sola; las entradas llegan a tu email.
          </p>
        </>
      )}
      <Link
        href="/"
        className="inline-block px-5 py-2.5 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm"
      >
        Volver a Eventos
      </Link>
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
