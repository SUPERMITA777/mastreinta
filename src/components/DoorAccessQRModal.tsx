"use client";

import React, { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import type { EventItem } from "@/lib/types";

interface DoorPassPublic {
  eventId: string;
  token: string;
  enabled: boolean;
  doorLabel: string;
  createdAt: string;
  rotatedAt?: string;
}

interface DoorAccessQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  initialEventId?: string;
}

async function buildDoorPassPngBlob(
  eventMeta: { title: string; dateLabel: string; venueName: string },
  doorLabel: string,
  qrDataUrl: string
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 820;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#141414";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#AF2C75";
  ctx.fillRect(0, 0, canvas.width, 96);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("MASTREINTA · ACCESO CONTROL PUERTA", 36, 58);

  ctx.fillStyle = "#ffb5d7";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(doorLabel.toUpperCase(), 36, 146);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText((eventMeta.title || "").slice(0, 28), 36, 192);

  ctx.fillStyle = "#b0b0b0";
  ctx.font = "20px sans-serif";
  ctx.fillText(
    `${eventMeta.dateLabel || ""} · ${eventMeta.venueName || ""}`.slice(0, 48),
    36,
    228
  );

  const qrImg = new Image();
  await new Promise<void>((resolve) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = () => resolve();
    qrImg.src = qrDataUrl;
  });

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(120, 270, 400, 400);
  ctx.drawImage(qrImg, 138, 288, 364, 364);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffb5d7";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText(
    "ESCANEÁ PARA HABILITAR CONTROL DE PUERTA",
    canvas.width / 2,
    725
  );
  ctx.fillStyle = "#b0b0b0";
  ctx.font = "16px sans-serif";
  ctx.fillText(
    "SOLO VÁLIDO PARA ESTE EVENTO",
    canvas.width / 2,
    756
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export default function DoorAccessQRModal({
  isOpen,
  onClose,
  events,
  initialEventId,
}: DoorAccessQRModalProps) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [pass, setPass] = useState<DoorPassPublic | null>(null);
  const [passUrl, setPassUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [doorLabelInput, setDoorLabelInput] = useState("Puerta Principal");
  const [loading, setLoading] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedLabelMsg, setSavedLabelMsg] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const validInitial =
      initialEventId && events.some((e) => e.id === initialEventId)
        ? initialEventId
        : events[0]?.id || "";
    setSelectedEventId(validInitial);
    setErrorMsg("");
    setSavedLabelMsg("");
    setCopied(false);
  }, [isOpen, initialEventId, events]);

  const callPassesApi = useCallback(
    async (
      eventId: string,
      action: "ensure" | "rotate" | "toggle" | "update_label",
      extra?: { enabled?: boolean; doorLabel?: string }
    ) => {
      if (!eventId) return;
      if (action === "ensure") setLoading(true);
      else setSavingAction(true);
      setErrorMsg("");
      try {
        const res = await fetch("/api/door/passes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ eventId, action, ...extra }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok || !data.pass) {
          throw new Error(data.error || "No se pudo obtener el QR de puerta.");
        }
        setPass(data.pass);
        const url = String(data.url || "");
        setPassUrl(url);
        setDoorLabelInput(data.pass.doorLabel || "Puerta Principal");
        if (url) {
          const dataUrl = await QRCode.toDataURL(url, {
            margin: 2,
            width: 320,
            color: { dark: "#000000", light: "#FFFFFF" },
          });
          setQrDataUrl(dataUrl);
        }
        if (action === "update_label") {
          setSavedLabelMsg("Guardado");
          setTimeout(() => setSavedLabelMsg(""), 2500);
        }
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Error al gestionar el QR de puerta."
        );
      } finally {
        setLoading(false);
        setSavingAction(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen || !selectedEventId) return;
    void callPassesApi(selectedEventId, "ensure");
  }, [isOpen, selectedEventId, callPassesApi]);

  if (!isOpen) return null;

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const handleCopy = async () => {
    if (!passUrl) return;
    try {
      await navigator.clipboard.writeText(passUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleDownloadPng = async () => {
    if (!qrDataUrl || !selectedEvent) return;
    const blob = await buildDoorPassPngBlob(
      {
        title: selectedEvent.title,
        dateLabel: selectedEvent.dateLabel,
        venueName: selectedEvent.venueName,
      },
      pass?.doorLabel || doorLabelInput || "Puerta Principal",
      qrDataUrl
    );
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR-Puerta-${selectedEvent.slug || selectedEvent.id}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const whatsappHref =
    passUrl && selectedEvent
      ? `https://wa.me/?text=${encodeURIComponent(
          `Control de Puerta MASTREINTA · *${selectedEvent.title}* (${selectedEvent.dateLabel})\nAbrí este enlace en el celular para habilitar el escáner QR exclusivo de este evento:\n${passUrl}`
        )}`
      : "#";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-[#1c1c1c] border border-[#353535] p-5 sm:p-6 space-y-4 my-auto">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#ffb5d7]" />
              QR de Acceso · Control de Puerta
            </h3>
            <p className="text-xs text-[#8a8a8a] mt-0.5">
              El personal escanea este QR con su celular y queda habilitado directo para validar entradas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/60 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-[#8a8a8a] py-6 text-center">
            No hay eventos activos disponibles para generar un QR de puerta.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="block text-xs text-[#8a8a8a]">
                Evento habilitado para este QR
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-xs text-white focus:border-[#ffb5d7] focus:outline-none"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.dateLabel})
                  </option>
                ))}
              </select>
            </div>

            {selectedEvent && (
              <div className="p-3 rounded-lg bg-[#121212] border border-[#2a2a2a] space-y-1">
                <p className="text-sm font-semibold text-white">
                  {selectedEvent.title}
                </p>
                <p className="text-xs text-[#8a8a8a]">
                  {selectedEvent.dateLabel} · {selectedEvent.time} ·{" "}
                  {selectedEvent.venueName}
                </p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  Solo habilita el escáner para las entradas de este evento
                </p>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-md bg-red-950/70 border border-red-500/40 text-xs text-red-200 text-center">
                {errorMsg}
              </div>
            )}

            {loading ? (
              <div className="py-10 text-center space-y-2">
                <Loader2 className="w-8 h-8 text-[#ffb5d7] animate-spin mx-auto" />
                <p className="text-xs text-[#8a8a8a]">
                  Generando QR exclusivo del evento...
                </p>
              </div>
            ) : pass && qrDataUrl ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-[#121212] border border-[#2e2e2e]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        pass.enabled
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-red-500/20 text-red-300 border border-red-500/40"
                      }`}
                    >
                      {pass.enabled ? "ACTIVO" : "PAUSADO"}
                    </span>
                    <span className="text-xs text-white/70">
                      {pass.doorLabel}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl shadow-md">
                    <img
                      src={qrDataUrl}
                      alt={`QR acceso puerta ${selectedEvent?.title || ""}`}
                      className="w-52 h-52 block"
                    />
                  </div>
                </div>

                {/* Etiqueta de puerta */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void callPassesApi(selectedEventId, "update_label", {
                      doorLabel: doorLabelInput,
                    });
                  }}
                  className="flex items-end gap-2"
                >
                  <div className="flex-1">
                    <label className="block text-[11px] text-[#8a8a8a] mb-1">
                      Etiqueta de puerta (opcional)
                    </label>
                    <input
                      type="text"
                      value={doorLabelInput}
                      onChange={(e) => setDoorLabelInput(e.target.value)}
                      maxLength={60}
                      placeholder="Puerta Principal"
                      className="w-full px-3 py-2 rounded bg-[#121212] border border-[#353535] text-xs text-white focus:border-[#ffb5d7] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="px-3.5 py-2 rounded bg-[#2a2a2a] hover:bg-[#353535] text-white text-xs font-medium cursor-pointer disabled:opacity-50"
                  >
                    {savedLabelMsg || "Guardar"}
                  </button>
                </form>

                {/* Acciones principales */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="py-2.5 px-3 rounded-md bg-[#252525] hover:bg-[#303030] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar enlace
                      </>
                    )}
                  </button>

                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Enviar por WhatsApp
                  </a>

                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    className="py-2.5 px-3 rounded-md bg-soft-pink hover:brightness-95 text-[#1c1c1c] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar QR (PNG)
                  </button>

                  <a
                    href={passUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-md bg-[#AF2C75] hover:brightness-110 text-white text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir escáner
                  </a>
                </div>

                {/* Controles de seguridad */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    disabled={savingAction}
                    onClick={() =>
                      void callPassesApi(selectedEventId, "toggle", {
                        enabled: !pass.enabled,
                      })
                    }
                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      pass.enabled
                        ? "bg-amber-950/70 border border-amber-500/40 text-amber-200 hover:bg-amber-900/70"
                        : "bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/70"
                    }`}
                  >
                    {pass.enabled ? (
                      <>
                        <PauseCircle className="w-3.5 h-3.5" />
                        Pausar acceso
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-3.5 h-3.5" />
                        Reactivar acceso
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={savingAction}
                    onClick={() => {
                      if (
                        window.confirm(
                          "¿Regenerar el código QR de puerta?\n\nEl código QR y enlace anteriores dejarán de funcionar inmediatamente."
                        )
                      ) {
                        void callPassesApi(selectedEventId, "rotate");
                      }
                    }}
                    className="px-3 py-1.5 rounded bg-red-950/70 border border-red-500/40 text-red-200 hover:bg-red-900/70 text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerar QR (revocar anterior)
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
