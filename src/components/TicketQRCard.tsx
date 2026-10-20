"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { TicketQR } from "@/lib/types";
import { CheckCircle2, Clock, Copy, Download, QrCode, XCircle } from "lucide-react";

interface TicketQRCardProps {
  ticket: TicketQR;
  compact?: boolean;
}

export default function TicketQRCard({
  ticket,
  compact = false,
}: TicketQRCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(ticket.qrCode, {
      width: 340,
      margin: 2,
      color: {
        dark: "#121212",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => {
        if (mounted) setQrDataUrl(url);
      })
      .catch((err) => console.error("Error generating QR:", err));
    return () => {
      mounted = false;
    };
  }, [ticket.qrCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ticket.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `Ticket-${ticket.shortCode}-${ticket.holderName.replace(/\s+/g, "_")}.png`;
    link.click();
  };

  const isUsed = ticket.status === "USADO";
  const isVoid = ticket.status === "ANULADO";

  return (
    <div className="rounded-lg overflow-hidden bg-[#1c1c1c] border border-[#353535] flex flex-col">
      {/* Cabecera estilo Bresh (#AF2C75) */}
      <div className="px-5 py-3.5 bg-[#AF2C75] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 px-2 rounded-[2px] bg-[#f6f3ec] flex items-center justify-center overflow-hidden">
            <img
              src="/logo-mas30.png"
              alt="MAS30"
              className="h-full w-auto object-contain scale-150"
            />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-white">
            TICKET QR
          </span>
        </div>

        <span className="text-xs font-medium px-2.5 py-1 rounded-[2px] bg-black/30 text-white">
          {ticket.ticketNumber} / {ticket.totalInOrder}
        </span>
      </div>

      {/* Cuerpo del Ticket */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
        <div className="space-y-1">
          <p className="text-xs text-[#ffb5d7] font-medium uppercase">
            {ticket.tierName}
          </p>
          <h3 className="text-2xl font-normal text-white leading-tight">
            {ticket.eventTitle}
          </h3>
          <p className="text-sm text-[#8a8a8a]">
            {ticket.eventDateLabel} · {ticket.eventTime}
          </p>
        </div>

        {/* Asistente */}
        <div className="p-3.5 rounded-md bg-[#121212] flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase text-[#8a8a8a]">Asistente</p>
            <p className="text-sm font-medium text-white">{ticket.holderName}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase text-[#8a8a8a]">DNI</p>
            <p className="text-xs font-mono text-white">{ticket.holderDni}</p>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center">
          <div className="relative p-3 rounded-md bg-white">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR ${ticket.shortCode}`}
                className={`${compact ? "w-40 h-40" : "w-52 h-52"} object-contain`}
              />
            ) : (
              <div
                className={`${
                  compact ? "w-40 h-40" : "w-52 h-52"
                } flex items-center justify-center text-neutral-400`}
              >
                <QrCode className="w-10 h-10 animate-pulse" />
              </div>
            )}

            {isUsed && (
              <div className="absolute inset-0 bg-black/85 rounded-md flex flex-col items-center justify-center p-4 text-center">
                <CheckCircle2 className="w-10 h-10 text-[#ffb5d7] mb-1" />
                <span className="text-xs font-semibold uppercase text-white">
                  TICKET YA UTILIZADO
                </span>
                {ticket.scannedAt && (
                  <span className="text-[11px] text-[#8a8a8a] mt-1">
                    Ingresó:{" "}
                    {new Date(ticket.scannedAt).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    hs
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 text-center space-y-1.5">
            <p className="text-xs font-mono text-[#8a8a8a]">
              ID Puerta: <strong className="text-white">{ticket.shortCode}</strong>
            </p>
            {!isUsed && !isVoid && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] bg-[#252525] text-[#ffb5d7] text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Habilitado para ingresar
              </span>
            )}
            {isUsed && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] bg-[#252525] text-white/60 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                Escaneado en puerta
              </span>
            )}
            {isVoid && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] bg-red-950 text-red-300 text-xs font-medium">
                <XCircle className="w-3.5 h-3.5" />
                Anulado
              </span>
            )}
          </div>
        </div>

        {/* Botones estilo Bresh */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadQR}
            className="py-2.5 px-3 rounded-[3px] bg-soft-pink hover:brightness-90 text-[#1c1c1c] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar QR
          </button>
          <button
            type="button"
            onClick={handleCopyCode}
            className="py-2.5 px-3 rounded-[3px] bg-[#353535] hover:bg-[#444] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? "¡Copiado!" : "Copiar Código"}
          </button>
        </div>
      </div>
    </div>
  );
}
