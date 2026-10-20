"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { TicketQR } from "@/lib/types";
import { CheckCircle2, Clock, Copy, Download, QrCode, Share2, XCircle } from "lucide-react";

interface TicketQRCardProps {
  ticket: TicketQR;
  compact?: boolean;
}

async function buildTicketCardPngBlob(
  ticket: TicketQR,
  qrDataUrl: string
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 960;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fondo
  ctx.fillStyle = "#1c1c1c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cabecera magenta
  ctx.fillStyle = "#AF2C75";
  ctx.fillRect(0, 0, canvas.width, 96);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("MAS30 · TICKET DE INGRESO", 36, 58);
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "right";
  ctx.fillText(
    `${ticket.ticketNumber}/${ticket.totalInOrder}`,
    canvas.width - 36,
    58
  );
  ctx.textAlign = "left";

  // Evento y tanda
  ctx.fillStyle = "#ffb5d7";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText((ticket.tierName || "").toUpperCase(), 40, 150);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(ticket.eventTitle || "MAS30", 40, 200);

  ctx.fillStyle = "#b0b0b0";
  ctx.font = "22px sans-serif";
  ctx.fillText(
    `${ticket.eventDateLabel} · ${ticket.eventTime}`,
    40,
    240
  );

  // Caja asistente
  ctx.fillStyle = "#121212";
  ctx.fillRect(40, 270, canvas.width - 80, 90);
  ctx.fillStyle = "#8a8a8a";
  ctx.font = "16px sans-serif";
  ctx.fillText("ASISTENTE", 60, 302);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(ticket.holderName, 60, 338);

  // QR centrado
  const qrImg = new Image();
  await new Promise<void>((resolve) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = () => resolve();
    qrImg.src = qrDataUrl;
  });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(180, 390, 360, 360);
  ctx.drawImage(qrImg, 195, 405, 330, 330);

  // Código alfanumérico de 4 dígitos
  ctx.fillStyle = "#121212";
  ctx.strokeStyle = "#ffb5d7";
  ctx.lineWidth = 2;
  ctx.fillRect(160, 780, 400, 115);
  ctx.strokeRect(160, 780, 400, 115);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffb5d7";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("CÓDIGO ALFANUMÉRICO DE PUERTA", canvas.width / 2, 812);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px monospace";
  ctx.fillText(ticket.shortCode, canvas.width / 2, 872);

  ctx.fillStyle = "#8a8a8a";
  ctx.font = "16px sans-serif";
  ctx.fillText(
    "Válido presentando el QR o el código de 4 dígitos en puerta",
    canvas.width / 2,
    932
  );

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
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
    navigator.clipboard.writeText(ticket.shortCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = async () => {
    if (!qrDataUrl) return;
    const blob = await buildTicketCardPngBlob(ticket, qrDataUrl);
    const url = blob ? URL.createObjectURL(blob) : qrDataUrl;
    const link = document.createElement("a");
    link.href = url;
    link.download = `Ticket-${ticket.shortCode}-${ticket.holderName.replace(/\s+/g, "_")}.png`;
    link.click();
    if (blob) setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleShareTicketImage = async () => {
    if (!qrDataUrl) return;
    const blob = await buildTicketCardPngBlob(ticket, qrDataUrl);
    if (blob && typeof navigator !== "undefined" && navigator.share) {
      const file = new File(
        [blob],
        `Ticket-${ticket.shortCode}.png`,
        { type: "image/png" }
      );
      const shareData = {
        title: `Entrada ${ticket.eventTitle} · Código ${ticket.shortCode}`,
        text: `¡Hola ${ticket.holderName}! Acá tenés tu entrada para *${ticket.eventTitle}* (${ticket.eventDateLabel}).\n🔑 *Código de ingreso (4 dígitos):* ${ticket.shortCode}`,
        files: [file],
      };
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        try {
          await navigator.share(shareData);
          return;
        } catch {
          // fallback a descarga
        }
      }
    }
    await handleDownloadQR();
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
          {ticket.holderDni && (
            <div className="text-right">
              <p className="text-[11px] uppercase text-[#8a8a8a]">DNI</p>
              <p className="text-xs font-mono text-white">{ticket.holderDni}</p>
            </div>
          )}
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

          <div className="mt-3 text-center space-y-2 w-full">
            <div className="mx-auto inline-block px-4 py-2 rounded-md bg-[#121212] border border-[#ffb5d7]/60">
              <span className="block text-[10px] uppercase tracking-wider text-[#ffb5d7]">
                Código de Ingreso (4 dígitos)
              </span>
              <strong className="font-mono text-2xl tracking-[0.25em] text-white">
                {ticket.shortCode}
              </strong>
            </div>
            <p className="text-[11px] text-[#8a8a8a]">
              Emitido por:{" "}
              <strong className="text-[#ffb5d7]">
                {ticket.generatedByName || "Admin MAS30"} (@
                {ticket.generatedByUsername || "admin"})
              </strong>
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
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadQR}
              className="py-2.5 px-3 rounded-[3px] bg-soft-pink hover:brightness-90 text-[#1c1c1c] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar Imagen
            </button>
            <button
              type="button"
              onClick={handleCopyCode}
              className="py-2.5 px-3 rounded-[3px] bg-[#353535] hover:bg-[#444] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "¡Copiado!" : `Copiar ${ticket.shortCode}`}
            </button>
          </div>
          <button
            type="button"
            onClick={handleShareTicketImage}
            className="w-full py-2 px-3 rounded-[3px] bg-[#121212] hover:bg-[#242424] border border-[#ffb5d7]/40 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-[#ffb5d7]" />
            Compartir Imagen del Ticket (WhatsApp / Celular)
          </button>
        </div>
      </div>
    </div>
  );
}
