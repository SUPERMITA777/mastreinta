"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import jsQR from "jsqr";
import {
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Loader2,
  Lock,
  QrCode,
  RefreshCw,
  User,
  X,
  XCircle,
} from "lucide-react";

type DoorOutcome =
  | "AUTORIZADO"
  | "YA_USADO"
  | "NO_ENCONTRADO"
  | "ANULADO"
  | "OTRO_EVENTO";

interface DoorTicketInfo {
  id: string;
  shortCode: string;
  orderCode: string;
  eventId: string;
  eventTitle: string;
  tierName: string;
  spotName?: string;
  spotPerks?: string;
  sectorName?: string;
  holderName: string;
  holderDni: string;
  ticketNumber: number;
  totalInOrder: number;
  status: string;
  scannedAt?: string;
  scannedBy?: string;
  scannedByName?: string;
  scannedDoor?: string;
}

interface DoorScanResult {
  outcome: DoorOutcome;
  message: string;
  ticket?: DoorTicketInfo;
  previousScannedAt?: string;
}

interface DoorSessionData {
  event: {
    id: string;
    title: string;
    dateLabel: string;
    time: string;
    venueName: string;
    flyerUrl?: string;
  };
  doorLabel: string;
  stats: {
    totalTickets: number;
    scannedTickets: number;
  };
}

const OPERATOR_STORAGE_KEY = "mas30_door_operator_name";

function formatScanTime(iso?: string): string {
  if (!iso) return "Sin hora registrada";
  try {
    return (
      new Date(iso).toLocaleTimeString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) + " hs"
    );
  } catch {
    return new Date(iso).toLocaleTimeString("es-AR") + " hs";
  }
}

export default function DoorTokenScannerPage() {
  const params = useParams<{ token: string }>();
  const token = decodeURIComponent(params?.token || "").trim();

  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [session, setSession] = useState<DoorSessionData | null>(null);
  const [stats, setStats] = useState({ totalTickets: 0, scannedTickets: 0 });

  const [operatorName, setOperatorName] = useState("Puerta Principal");
  const [editingOperator, setEditingOperator] = useState(false);
  const [operatorDraft, setOperatorDraft] = useState("");

  const [manualInput, setManualInput] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [lastResult, setLastResult] = useState<DoorScanResult | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string>("");
  const isProcessingScanRef = useRef<boolean>(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const loadSession = useCallback(async () => {
    if (!token) {
      setSessionError("Código QR de acceso a puerta inválido.");
      setLoadingSession(false);
      return;
    }
    setLoadingSession(true);
    setSessionError(null);
    try {
      const res = await fetch(
        `/api/door/session?token=${encodeURIComponent(token)}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.event) {
        setSession(null);
        setSessionError(
          data.error ||
            "No pudimos validar este acceso de puerta. Pedile al organizador el QR actualizado."
        );
        return;
      }

      const loaded: DoorSessionData = {
        event: data.event,
        doorLabel: data.doorLabel || "Puerta Principal",
        stats: data.stats || { totalTickets: 0, scannedTickets: 0 },
      };
      setSession(loaded);
      setStats(loaded.stats);

      let initialOp = loaded.doorLabel;
      try {
        const stored = localStorage.getItem(OPERATOR_STORAGE_KEY);
        if (stored && stored.trim()) {
          initialOp = stored.trim().slice(0, 60);
        }
      } catch {
        // ignore storage error
      }
      setOperatorName(initialOp);
      setOperatorDraft(initialOp);
    } catch {
      setSession(null);
      setSessionError(
        "Error de conexión al verificar el acceso de puerta. Tocá Reintentar."
      );
    } finally {
      setLoadingSession(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSession();
    return () => {
      stopCamera();
    };
  }, [loadSession, stopCamera]);

  const playFeedbackSound = (type: "ok" | "error") => {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(type === "ok" ? [60] : [120, 60, 120]);
      }
    } catch {
      // ignore vibrate error
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "ok") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(165, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.26, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch {
      // ignore audio error
    }
  };

  const handleProcessQR = useCallback(
    async (code: string) => {
      const clean = code.trim();
      if (!clean || !token || isProcessingScanRef.current) return;

      isProcessingScanRef.current = true;
      setIsValidating(true);

      try {
        const res = await fetch("/api/door/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            code: clean,
            operatorName,
            doorName: session?.doorLabel || "Puerta Principal",
          }),
        });
        const data = await res.json().catch(() => ({}));

        if ((res.status === 401 || res.status === 403) && data.revoked) {
          stopCamera();
          setSession(null);
          setSessionError(
            data.error ||
              "El acceso de puerta fue revocado o pausado por el organizador."
          );
          playFeedbackSound("error");
          return;
        }

        if (data.stats) {
          setStats(data.stats);
        }

        if (data.result) {
          const result = data.result as DoorScanResult;
          setLastResult(result);
          playFeedbackSound(result.outcome === "AUTORIZADO" ? "ok" : "error");
        } else {
          setLastResult({
            outcome: "NO_ENCONTRADO",
            message:
              data.error || "No se pudo validar el código. Intentá de nuevo.",
          });
          playFeedbackSound("error");
        }
      } catch {
        setLastResult({
          outcome: "NO_ENCONTRADO",
          message: "Sin conexión con el servidor para validar la entrada.",
        });
        playFeedbackSound("error");
      } finally {
        setIsValidating(false);
        isProcessingScanRef.current = false;
      }
    },
    [token, operatorName, session?.doorLabel, stopCamera]
  );

  const tickScannerFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (
      video &&
      canvas &&
      video.readyState >= video.HAVE_CURRENT_DATA &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        const minSide = Math.min(video.videoWidth, video.videoHeight);
        const sx = Math.floor((video.videoWidth - minSide) / 2);
        const sy = Math.floor((video.videoHeight - minSide) / 2);
        const targetSize = 420;
        canvas.width = targetSize;
        canvas.height = targetSize;
        ctx.drawImage(
          video,
          sx,
          sy,
          minSide,
          minSide,
          0,
          0,
          targetSize,
          targetSize
        );
        const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });
        if (
          code &&
          code.data &&
          code.data.trim() &&
          code.data !== lastScannedCodeRef.current
        ) {
          lastScannedCodeRef.current = code.data;
          void handleProcessQR(code.data);
          setTimeout(() => {
            lastScannedCodeRef.current = "";
          }, 3000);
        }
      }
    }
    if (videoRef.current && videoRef.current.srcObject) {
      rafRef.current = requestAnimationFrame(tickScannerFrame);
    }
  }, [handleProcessQR]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    lastScannedCodeRef.current = "";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.muted = true;
        await videoRef.current.play();
        setCameraActive(true);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tickScannerFrame);
      }
    } catch {
      setCameraError(
        "No se pudo abrir la cámara. Tocá para reintentar o escribí el código abajo."
      );
      setCameraActive(false);
    }
  }, [tickScannerFrame]);

  useEffect(() => {
    if (session && !cameraActive) {
      void startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (cameraActive) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tickScannerFrame);
    }
  }, [cameraActive, tickScannerFrame]);

  if (loadingSession) {
    return (
      <div className="fixed inset-0 z-50 bg-[#121212] text-white h-[100dvh] w-full flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="h-10 px-3 rounded bg-[#f5f4f0] inline-flex items-center justify-center mx-auto overflow-hidden">
            <img
              src="/logo-mas30.png"
              alt="MASTREINTA"
              className="h-full w-auto object-contain"
            />
          </div>
          <Loader2 className="w-8 h-8 text-[#ffb5d7] animate-spin mx-auto" />
          <p className="text-sm text-white/80">Validando acceso de puerta...</p>
        </div>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="fixed inset-0 z-50 bg-[#121212] text-white h-[100dvh] w-full flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-[#1c1c1c] border border-[#353535] p-6 text-center space-y-4">
          <div className="h-9 px-3 rounded bg-[#f5f4f0] inline-flex items-center justify-center mx-auto overflow-hidden">
            <img
              src="/logo-mas30.png"
              alt="MASTREINTA"
              className="h-full w-auto object-contain"
            />
          </div>
          <Lock className="w-10 h-10 text-[#ffb5d7] mx-auto" />
          <h1 className="text-lg font-semibold text-white">
            Acceso de Puerta No Disponible
          </h1>
          <p className="text-xs text-white/75 leading-relaxed">
            {sessionError ||
              "Este código QR de acceso ya no está activo. Pedile uno nuevo al organizador."}
          </p>
          <button
            type="button"
            onClick={() => void loadSession()}
            className="w-full py-2.5 px-4 rounded-md bg-soft-pink text-[#1c1c1c] font-semibold text-xs inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const isSuccess = lastResult?.outcome === "AUTORIZADO";
  const isError = Boolean(lastResult && lastResult.outcome !== "AUTORIZADO");
  const isAlreadyUsed = lastResult?.outcome === "YA_USADO";
  const isOtherEvent = lastResult?.outcome === "OTRO_EVENTO";
  const isAnnulled = lastResult?.outcome === "ANULADO";

  const screenBgClass = isSuccess
    ? "bg-emerald-600 text-white"
    : isError
    ? "bg-red-600 text-white"
    : "bg-[#121212] text-white";

  const scannedByDisplay =
    lastResult?.ticket?.scannedByName ||
    lastResult?.ticket?.scannedBy ||
    "Control Puerta";

  const scannedAtDisplay = formatScanTime(
    lastResult?.previousScannedAt || lastResult?.ticket?.scannedAt
  );

  const saveOperatorLabel = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned =
      operatorDraft.trim().slice(0, 60) || session.doorLabel || "Puerta Principal";
    setOperatorName(cleaned);
    setOperatorDraft(cleaned);
    try {
      localStorage.setItem(OPERATOR_STORAGE_KEY, cleaned);
    } catch {
      // ignore
    }
    setEditingOperator(false);
  };

  return (
    <div
      className={`fixed inset-0 z-50 h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col justify-between select-none transition-colors duration-200 ${screenBgClass}`}
    >
      <div className="w-full max-w-md mx-auto h-full flex flex-col justify-between p-3 sm:p-4 gap-2 overflow-hidden">
        {/* Barra superior compacta: solo evento elegido + contador + puesto + cámara */}
        <div className="shrink-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-2 py-0.5 rounded bg-black/35 text-[11px] font-bold uppercase tracking-wide truncate">
                  {session.event.title}
                </span>
                <span className="px-2 py-0.5 rounded bg-black/35 font-mono text-[11px] font-semibold shrink-0">
                  {stats.scannedTickets} / {stats.totalTickets}
                </span>
              </div>
              <p className="text-[10px] text-white/75 truncate mt-0.5 px-0.5">
                Solo valida entradas de este evento · {session.event.dateLabel}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setOperatorDraft(operatorName);
                  setEditingOperator((v) => !v);
                }}
                className="px-2 py-1 rounded bg-black/30 hover:bg-black/50 text-[11px] flex items-center gap-1 max-w-[115px] cursor-pointer"
                title="Cambiar nombre del puesto/operador"
              >
                <Edit3 className="w-3 h-3 shrink-0" />
                <span className="truncate">{operatorName}</span>
              </button>

              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-2 py-1 rounded bg-black/30 hover:bg-black/50 text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Apagar cámara"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-2 py-1 rounded bg-black/30 hover:bg-black/50 text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Activar cámara"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {editingOperator && (
            <form
              onSubmit={saveOperatorLabel}
              className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-lg border border-white/20"
            >
              <input
                type="text"
                value={operatorDraft}
                onChange={(e) => setOperatorDraft(e.target.value)}
                placeholder="Tu nombre o puesto (ej: Puerta VIP)"
                maxLength={60}
                className="flex-1 min-w-0 px-2.5 py-1 rounded bg-[#121212] border border-white/25 text-xs text-white outline-none focus:border-[#ffb5d7]"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded bg-soft-pink text-[#1c1c1c] text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                Guardar
              </button>
            </form>
          )}
        </div>

        {/* Sector Central: Visor QR + Resultado de validación */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2.5 overflow-hidden">
          <div
            className={`relative aspect-square w-full max-w-[250px] sm:max-w-[280px] max-h-full shrink min-h-[140px] rounded-2xl overflow-hidden bg-black border-4 shadow-2xl flex items-center justify-center ${
              isSuccess || isError ? "border-white" : "border-[#ffb5d7]"
            }`}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${
                cameraActive ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {cameraActive && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-4/5 h-4/5 border-2 border-white/70 rounded-xl relative">
                  <div className="absolute inset-x-2 top-1/2 h-0.5 bg-[#ffb5d7] animate-pulse" />
                </div>
              </div>
            )}

            {!cameraActive && (
              <button
                type="button"
                onClick={startCamera}
                className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center gap-2 cursor-pointer bg-[#181818] hover:bg-[#222]"
              >
                <QrCode className="w-10 h-10 text-[#ffb5d7]" />
                <span className="text-xs font-semibold text-white px-3 py-1.5 rounded bg-[#AF2C75]">
                  Activar Cámara QR
                </span>
                {cameraError && (
                  <span className="text-[11px] text-white/70 leading-tight max-w-[200px]">
                    {cameraError}
                  </span>
                )}
              </button>
            )}
          </div>

          {lastResult && (
            <div className="shrink-0 w-full rounded-xl bg-black/35 backdrop-blur-xs border-2 border-white/40 p-3 text-white shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isSuccess ? (
                    <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-white shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-extrabold uppercase tracking-wide leading-tight">
                      {isSuccess
                        ? "✓ ACCESO VALIDADO"
                        : isAlreadyUsed
                        ? "✕ CÓDIGO YA REGISTRADO"
                        : isOtherEvent
                        ? "✕ ENTRADA DE OTRO EVENTO"
                        : isAnnulled
                        ? "✕ ENTRADA ANULADA"
                        : "✕ CÓDIGO INVÁLIDO"}
                    </p>
                    {!lastResult.ticket && (
                      <p className="text-xs text-white/95 mt-0.5 leading-snug">
                        {lastResult.message}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLastResult(null)}
                  className="p-1 rounded bg-black/30 hover:bg-black/50 text-white shrink-0 cursor-pointer"
                  title="Limpiar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {lastResult.ticket && (
                <div className="mt-2 pt-2 border-t border-white/25 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm truncate">
                      {lastResult.ticket.holderName}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/40 font-mono font-bold text-xs shrink-0">
                      {lastResult.ticket.shortCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/90 truncate">
                    {lastResult.ticket.tierName} · Entrada{" "}
                    {lastResult.ticket.ticketNumber}/
                    {lastResult.ticket.totalInOrder}
                    {lastResult.ticket.holderDni
                      ? ` · DNI ${lastResult.ticket.holderDni}`
                      : ""}
                  </p>

                  {(lastResult.ticket.spotName ||
                    lastResult.ticket.sectorName ||
                    lastResult.ticket.spotPerks) && (
                    <div className="inline-flex flex-wrap items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-white/25 text-[11px] font-medium">
                      {lastResult.ticket.sectorName && (
                        <span>{lastResult.ticket.sectorName}</span>
                      )}
                      {lastResult.ticket.spotName && (
                        <span>· {lastResult.ticket.spotName}</span>
                      )}
                      {lastResult.ticket.spotPerks && (
                        <span className="text-amber-200">
                          · {lastResult.ticket.spotPerks}
                        </span>
                      )}
                    </div>
                  )}

                  {isAlreadyUsed && (
                    <div className="mt-1.5 p-2 rounded-lg bg-black/45 border border-white/30 space-y-0.5 text-xs">
                      <p className="flex items-center gap-1.5 font-semibold text-white">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Escaneó: <strong>{scannedByDisplay}</strong>
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5 font-semibold text-white">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Hora: <strong>{scannedAtDisplay}</strong>
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sector Inferior: Ingreso manual de código */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!manualInput.trim() || isValidating) return;
            const codeToValidate = manualInput.trim().toUpperCase();
            setManualInput("");
            await handleProcessQR(codeToValidate);
          }}
          className="shrink-0 w-full bg-black/30 rounded-xl p-2.5 border border-white/20 space-y-1.5"
        >
          <label className="block text-[11px] font-medium text-white/90 text-center">
            Escribir código si no está el QR:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value.toUpperCase())}
              placeholder="CÓDIGO (EJ: UPEE)"
              className="flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-[#121212] border border-white/30 text-base font-mono font-bold uppercase tracking-widest text-white text-center placeholder:text-white/40 placeholder:font-sans placeholder:text-xs placeholder:tracking-normal outline-none focus:border-[#ffb5d7]"
            />
            <button
              type="submit"
              disabled={isValidating || !manualInput.trim()}
              className="px-5 py-2.5 rounded-lg bg-white text-black font-bold text-xs uppercase tracking-wider shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isValidating ? "..." : "Validar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
