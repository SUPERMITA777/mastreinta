"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  Lock,
  LogOut,
  QrCode,
  User,
  X,
  XCircle,
} from "lucide-react";
import {
  canUserAccessEvent,
  getCurrentAdminSession,
  getEvents,
  getTickets,
  getUserPermissions,
  isSuperAdminUser,
  loginAdminUser,
  logoutAdminUser,
  ScanValidationResult,
  syncFromCloudStore,
  validateAndScanQR,
} from "@/lib/store";
import { AdminUser, EventItem, TicketQR } from "@/lib/types";

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

export default function DoorQRScannerPage() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [tickets, setTickets] = useState<TicketQR[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [lastResult, setLastResult] = useState<ScanValidationResult | null>(
    null
  );

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string>("");
  const isProcessingScanRef = useRef<boolean>(false);

  const syncData = useCallback(() => {
    setTickets(getTickets());
    setEvents(getEvents());
    setCurrentUser(getCurrentAdminSession());
  }, []);

  useEffect(() => {
    syncData();
    void syncFromCloudStore();
    window.addEventListener("mas30-store-updated", syncData);
    window.addEventListener("storage", syncData);
    return () => {
      window.removeEventListener("mas30-store-updated", syncData);
      window.removeEventListener("storage", syncData);
      stopCamera();
    };
  }, [syncData]);

  const permissions = getUserPermissions(currentUser);
  const isSuper = isSuperAdminUser(currentUser);

  const allowedEvents = events.filter((ev) =>
    canUserAccessEvent(currentUser, ev)
  );
  const allowedEventIds = new Set(allowedEvents.map((e) => e.id));

  const playFeedbackSound = (type: "ok" | "error") => {
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
      if (!clean || isProcessingScanRef.current) return;

      isProcessingScanRef.current = true;
      setIsValidating(true);

      try {
        if (!isSuper && allowedEventIds.size > 0) {
          const matchingTicket = tickets.find(
            (t) =>
              t.qrCode.toLowerCase() === clean.toLowerCase() ||
              t.shortCode.toLowerCase() === clean.toLowerCase() ||
              t.id.toLowerCase() === clean.toLowerCase()
          );
          if (matchingTicket && !allowedEventIds.has(matchingTicket.eventId)) {
            setLastResult({
              outcome: "NO_ENCONTRADO",
              message:
                "Este código pertenece a un evento no asignado a tu usuario.",
            });
            playFeedbackSound("error");
            return;
          }
        }

        const operatorLabel = currentUser
          ? currentUser.fullName
          : "Control Puerta MASTREINTA";
        const res = await validateAndScanQR(
          clean,
          operatorLabel,
          "Puerta Principal",
          currentUser?.username
        );
        setLastResult(res);
        syncData();
        if (res.outcome === "AUTORIZADO") {
          playFeedbackSound("ok");
        } else {
          playFeedbackSound("error");
        }
      } finally {
        setIsValidating(false);
        isProcessingScanRef.current = false;
      }
    },
    [isSuper, allowedEventIds, tickets, currentUser, syncData]
  );

  const stopCamera = () => {
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
  };

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
        // Recortar el cuadrado central del video y escalar a 420x420 para lectura rápida y nítida en celulares
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

  // Iniciar cámara automáticamente al estar autenticado
  useEffect(() => {
    if (currentUser && permissions.canUseScanner && !cameraActive) {
      void startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, permissions.canUseScanner]);

  // Mantener loop actualizado con el último callback
  useEffect(() => {
    if (cameraActive) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tickScannerFrame);
    }
  }, [cameraActive, tickScannerFrame]);

  if (!currentUser) {
    return (
      <div className="bg-[#121212] text-white h-[100dvh] w-full overflow-hidden flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-[#1c1c1c] border border-[#353535] p-6 space-y-5">
          <div className="text-center space-y-1.5">
            <div className="h-9 px-3 rounded bg-[#f5f4f0] inline-flex items-center justify-center mx-auto overflow-hidden">
              <img
                src="/logo-mas30.png"
                alt="MASTREINTA"
                className="h-full w-auto object-contain"
              />
            </div>
            <p className="text-[11px] uppercase tracking-widest text-[#ffb5d7]">
              Acceso Lector de QR
            </p>
            <h1 className="text-xl font-medium text-white">
              Validación de Puerta
            </h1>
          </div>
          {loginError && (
            <div className="p-2.5 rounded bg-red-950/90 text-xs text-red-200 text-center">
              {loginError}
            </div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const { user: logged, error } = await loginAdminUser(
                loginUsername,
                loginPassword
              );
              if (!logged) {
                setLoginError(error || "Usuario o contraseña incorrectos.");
                return;
              }
              setLoginError("");
              setCurrentUser(logged);
              await syncFromCloudStore();
              syncData();
            }}
            className="space-y-3"
          >
            <input
              type="text"
              required
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="Usuario"
              className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-base text-white outline-none focus:border-[#ffb5d7]"
            />
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-base text-white outline-none focus:border-[#ffb5d7]"
            />
            <button
              type="submit"
              className="w-full py-3 rounded-md bg-soft-pink text-[#1c1c1c] font-semibold text-sm cursor-pointer"
            >
              Ingresar al Lector QR
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!permissions.canUseScanner) {
    return (
      <div className="bg-[#121212] text-white h-[100dvh] w-full overflow-hidden flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-[#1c1c1c] border border-[#353535] p-6 text-center space-y-4">
          <Lock className="w-10 h-10 text-[#ffb5d7] mx-auto" />
          <h1 className="text-lg font-medium">Sin permiso de Lector QR</h1>
          <p className="text-xs text-[#8a8a8a]">
            Tu usuario (@{currentUser.username}) no tiene permiso para validar
            entradas.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 rounded bg-soft-pink text-[#1c1c1c] text-xs font-medium"
            >
              Ir al Panel
            </Link>
            <button
              type="button"
              onClick={() => {
                logoutAdminUser();
                setCurrentUser(null);
              }}
              className="px-4 py-2 rounded bg-[#353535] text-white text-xs cursor-pointer"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = lastResult?.outcome === "AUTORIZADO";
  const isError = Boolean(lastResult && lastResult.outcome !== "AUTORIZADO");
  const isAlreadyUsed = lastResult?.outcome === "YA_USADO";

  const screenBgClass = isSuccess
    ? "bg-emerald-600 text-white"
    : isError
    ? "bg-red-600 text-white"
    : "bg-[#121212] text-white";

  const scannedByDisplay =
    lastResult?.ticket?.scannedByName ||
    lastResult?.ticket?.scannedBy ||
    (lastResult?.ticket?.scannedByUsername
      ? `@${lastResult.ticket.scannedByUsername}`
      : "Operador de Puerta");

  const scannedAtDisplay = formatScanTime(
    lastResult?.previousScannedAt || lastResult?.ticket?.scannedAt
  );

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col justify-between select-none transition-colors duration-200 ${screenBgClass}`}
    >
      <div className="w-full max-w-md mx-auto h-full flex flex-col justify-between p-3 sm:p-4 gap-2 overflow-hidden">
        {/* Barra superior mínima */}
        <div className="shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded bg-black/30 text-[11px] font-medium truncate">
              Lector QR · @{currentUser.username}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
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
            {!permissions.scannerOnly && (
              <Link
                href="/admin"
                className="px-2.5 py-1 rounded bg-black/30 hover:bg-black/50 text-[11px] font-medium"
              >
                Panel
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                stopCamera();
                logoutAdminUser();
                setCurrentUser(null);
              }}
              className="px-2.5 py-1 rounded bg-black/30 hover:bg-black/50 text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              Salir
            </button>
          </div>
        </div>

        {/* Sector Central: Cuadrado de escaneo QR + Estado de validación */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2.5 overflow-hidden">
          {/* Cuadrado del Lector QR */}
          <div
            className={`relative aspect-square w-full max-w-[250px] sm:max-w-[280px] max-h-full shrink min-h-[140px] rounded-2xl overflow-hidden bg-black border-4 shadow-2xl flex items-center justify-center ${
              isSuccess
                ? "border-white"
                : isError
                ? "border-white"
                : "border-[#ffb5d7]"
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

          {/* Resultado de Validación (Verde = Válido / Rojo = Inválido o Ya Registrado) */}
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

                  {isAlreadyUsed && (
                    <div className="mt-1.5 p-2 rounded-lg bg-black/45 border border-white/30 space-y-0.5 text-xs">
                      <p className="flex items-center gap-1.5 font-semibold text-white">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Escaneó: <strong>{scannedByDisplay}</strong>
                          {lastResult.ticket.scannedByUsername &&
                          !scannedByDisplay.includes(
                            lastResult.ticket.scannedByUsername
                          )
                            ? ` (@${lastResult.ticket.scannedByUsername})`
                            : ""}
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

        {/* Sector Inferior: Escribir el código manualmente */}
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
