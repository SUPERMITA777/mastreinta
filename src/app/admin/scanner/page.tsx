"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  Lock,
  LogOut,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
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
  resetTicketScanStatus,
  ScanValidationResult,
  validateAndScanQR,
} from "@/lib/store";
import { AdminUser, EventItem, TicketQR } from "@/lib/types";

export default function DoorQRScannerPage() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [tickets, setTickets] = useState<TicketQR[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventFilter, setSelectedEventFilter] =
    useState<string>("TODOS");
  const [manualInput, setManualInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastResult, setLastResult] = useState<ScanValidationResult | null>(
    null
  );

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string>("");

  const syncData = () => {
    setTickets(getTickets());
    setEvents(getEvents());
    setCurrentUser(getCurrentAdminSession());
  };

  useEffect(() => {
    syncData();
    window.addEventListener("mas30-store-updated", syncData);
    window.addEventListener("storage", syncData);
    return () => {
      window.removeEventListener("mas30-store-updated", syncData);
      window.removeEventListener("storage", syncData);
      stopCamera();
    };
  }, []);

  const permissions = getUserPermissions(currentUser);
  const isSuper = isSuperAdminUser(currentUser);

  // Filtrar solo los eventos a los que tiene acceso este usuario
  const allowedEvents = events.filter((ev) =>
    canUserAccessEvent(currentUser, ev)
  );
  const allowedEventIds = new Set(allowedEvents.map((e) => e.id));
  const allowedTickets = tickets.filter((t) => allowedEventIds.has(t.eventId));

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
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(165, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch {
      // ignore
    }
  };

  const handleProcessQR = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    // Si no es Superadmin, verificar que el ticket pertenezca a uno de sus eventos asignados
    if (!isSuper) {
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
            "Este ticket pertenece a un evento que tu usuario no tiene asignado para validar.",
        });
        playFeedbackSound("error");
        return;
      }
    }

    const operatorLabel = currentUser
      ? `${currentUser.fullName} (@${currentUser.username})`
      : "Control Puerta MASTREINTA";
    const res = await validateAndScanQR(clean, operatorLabel);
    setLastResult(res);
    syncData();
    if (res.outcome === "AUTORIZADO") {
      playFeedbackSound("ok");
    } else {
      playFeedbackSound("error");
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    lastScannedCodeRef.current = "";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActive(true);
        requestAnimationFrame(tickScannerFrame);
      }
    } catch {
      setCameraError(
        "No se pudo acceder a la cámara. Podés subir una imagen de QR descargada, escribir el código de 4 dígitos o validar desde la lista."
      );
      setCameraActive(false);
    }
  };

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

  const tickScannerFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code && code.data && code.data !== lastScannedCodeRef.current) {
          lastScannedCodeRef.current = code.data;
          handleProcessQR(code.data);
          setTimeout(() => {
            lastScannedCodeRef.current = "";
          }, 3000);
        }
      }
    }
    if (videoRef.current && videoRef.current.srcObject) {
      rafRef.current = requestAnimationFrame(tickScannerFrame);
    }
  };

  const handleImageUploadScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height);
        if (decoded && decoded.data) {
          handleProcessQR(decoded.data);
        } else {
          setLastResult({
            outcome: "NO_ENCONTRADO",
            message: "No se detectó un código QR válido en la imagen.",
          });
          playFeedbackSound("error");
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const filteredTickets = allowedTickets.filter((t) => {
    const matchesEvent =
      selectedEventFilter === "TODOS" || t.eventId === selectedEventFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.holderName.toLowerCase().includes(q) ||
      t.holderDni.toLowerCase().includes(q) ||
      t.shortCode.toLowerCase().includes(q) ||
      t.orderCode.toLowerCase().includes(q);
    return matchesEvent && matchesSearch;
  });

  const usedCount = filteredTickets.filter((t) => t.status === "USADO").length;
  const validCount = filteredTickets.filter((t) => t.status === "VALIDO").length;

  if (!currentUser) {
    return (
      <div className="bg-dark-background text-white min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-[#1c1c1c] border border-[#353535] p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="h-10 px-3 rounded bg-[#f5f4f0] inline-flex items-center justify-center mx-auto mb-1 overflow-hidden">
              <img
                src="/logo-mas30.png"
                alt="MASTREINTA"
                className="h-full w-auto object-contain"
              />
            </div>
            <p className="text-xs uppercase tracking-widest text-[#ffb5d7]">
              Control de Puerta · Lector QR
            </p>
            <h1 className="text-2xl font-normal text-white">
              Validación de Ingresos
            </h1>
          </div>
          {loginError && (
            <div className="p-3 rounded bg-red-950/80 text-xs text-red-200 text-center">
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
            }}
            className="space-y-4"
          >
            <input
              type="text"
              required
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="Usuario (ej: lector, puerta o superadmin)"
              className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white"
            />
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white"
            />
            <button
              type="submit"
              className="w-full py-3 rounded-[3px] bg-soft-pink text-[#1c1c1c] font-medium text-sm cursor-pointer"
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
      <div className="bg-dark-background text-white min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-[#1c1c1c] border border-[#353535] p-8 text-center space-y-4">
          <Lock className="w-10 h-10 text-[#ffb5d7] mx-auto" />
          <h1 className="text-xl font-medium">Sin permiso de Lector QR</h1>
          <p className="text-xs text-[#8a8a8a]">
            Tu usuario (@{currentUser.username}) no tiene habilitado el permiso
            para validar entradas en puerta.
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
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-background text-white min-h-screen py-12">
      <div className="container space-y-10">
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <div className="h-7 px-2 rounded bg-[#f5f4f0] inline-flex items-center justify-center overflow-hidden">
                <img
                  src="/logo-mas30.png"
                  alt="MASTREINTA"
                  className="h-full w-auto object-contain"
                />
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#AF2C75] text-white text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Validador: {currentUser.fullName} (@{currentUser.username} ·{" "}
                {currentUser.role})
              </span>
              <button
                type="button"
                onClick={() => {
                  logoutAdminUser();
                  setCurrentUser(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-[#1c1c1c] hover:bg-[#353535] text-xs text-white/70 hover:text-white cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </button>
            </div>
            <h1 className="text-2xl md:text-5xl font-normal">
              Lector QR · Validación de Puerta
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 rounded-sm bg-[#1c1c1c] text-sm">
              Ingresaron: <strong className="text-[#ffb5d7]">{usedCount}</strong>
            </div>
            <div className="px-4 py-2 rounded-sm bg-[#1c1c1c] text-sm">
              Por ingresar: <strong className="text-white">{validCount}</strong>
            </div>
            {!permissions.scannerOnly && (
              <Link
                href="/admin"
                className="px-4 py-2 rounded-sm bg-white text-black text-sm flex items-center gap-1"
              >
                Panel Admin <X className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Cámara & Validador */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-lg bg-[#1c1c1c] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-normal text-white">
                  Escáner de Cámara
                </h2>
                {cameraActive ? (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-[3px] bg-[#353535] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <CameraOff className="w-4 h-4" />
                    Apagar Cámara
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 rounded-[3px] bg-soft-pink text-[#1c1c1c] text-xs font-medium flex items-center gap-1.5 cursor-pointer hover:brightness-90"
                  >
                    <Camera className="w-4 h-4" />
                    Activar Cámara QR
                  </button>
                )}
              </div>

              <div className="relative rounded-md overflow-hidden bg-[#121212] border border-[#353535] aspect-video flex flex-col items-center justify-center">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${
                    cameraActive ? "block" : "hidden"
                  }`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {cameraActive && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-[#ffb5d7] relative">
                      <div className="absolute inset-x-2 top-1/2 h-0.5 bg-[#da0078] animate-pulse" />
                    </div>
                  </div>
                )}

                {!cameraActive && (
                  <div className="p-6 text-center space-y-3">
                    <QrCode className="w-10 h-10 text-white/50 mx-auto" />
                    <p className="text-xs text-[#8a8a8a] max-w-xs mx-auto">
                      Activá la cámara para escanear en puerta o subí la imagen
                      de un código QR descargado:
                    </p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-[3px] bg-[#353535] hover:bg-[#454545] text-white text-xs font-medium cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Subir imagen de QR (.png)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUploadScan}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {cameraError && (
                <p className="text-xs text-[#ffb5d7] bg-[#121212] p-3 rounded">
                  {cameraError}
                </p>
              )}

              {/* Validación Manual */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessQR(manualInput);
                  setManualInput("");
                }}
                className="space-y-2 pt-2 border-t border-white/10"
              >
                <label className="block text-xs text-[#8a8a8a]">
                  Validar por código alfanumérico de 4 dígitos o cadena QR:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) =>
                      setManualInput(e.target.value.toUpperCase())
                    }
                    placeholder="Ej: A9F3"
                    className="flex-1 px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm font-mono uppercase tracking-wider text-white"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-[3px] bg-white text-black font-medium text-xs cursor-pointer"
                  >
                    Validar
                  </button>
                </div>
              </form>
            </div>

            {/* Resultado de lectura */}
            {lastResult && (
              <div
                className={`rounded-lg p-6 border-2 ${
                  lastResult.outcome === "AUTORIZADO"
                    ? "bg-[#1c1c1c] border-emerald-400"
                    : lastResult.outcome === "YA_USADO"
                    ? "bg-[#1c1c1c] border-amber-400"
                    : "bg-[#1c1c1c] border-rose-500"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    {lastResult.outcome === "AUTORIZADO" && (
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    )}
                    {lastResult.outcome === "YA_USADO" && (
                      <AlertTriangle className="w-10 h-10 text-amber-400" />
                    )}
                    {(lastResult.outcome === "NO_ENCONTRADO" ||
                      lastResult.outcome === "ANULADO") && (
                      <XCircle className="w-10 h-10 text-rose-400" />
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-[2px] text-xs font-medium uppercase ${
                        lastResult.outcome === "AUTORIZADO"
                          ? "bg-emerald-400 text-black"
                          : lastResult.outcome === "YA_USADO"
                          ? "bg-amber-400 text-black"
                          : "bg-rose-500 text-white"
                      }`}
                    >
                      {lastResult.outcome === "AUTORIZADO"
                        ? "✓ ACCESO AUTORIZADO"
                        : lastResult.outcome === "YA_USADO"
                        ? "⚠ ENTRADA YA UTILIZADA"
                        : "✕ ACCESO DENEGADO"}
                    </span>
                    <h3 className="text-lg font-medium text-white">
                      {lastResult.message}
                    </h3>
                    {lastResult.ticket && (
                      <div className="p-4 rounded-md bg-[#121212] space-y-1 text-xs">
                        <p className="text-sm font-medium text-white">
                          {lastResult.ticket.holderName}
                          {lastResult.ticket.holderDni
                            ? ` (DNI ${lastResult.ticket.holderDni})`
                            : ""}
                        </p>
                        <p className="text-[#ffb5d7]">
                          {lastResult.ticket.tierName} · Entrada{" "}
                          {lastResult.ticket.ticketNumber} de{" "}
                          {lastResult.ticket.totalInOrder}
                        </p>
                        <p className="text-[#8a8a8a]">
                          {lastResult.ticket.eventTitle} (
                          {lastResult.ticket.shortCode})
                        </p>
                        {lastResult.previousScannedAt && (
                          <p className="text-amber-300 pt-1">
                            Ingresó previamente a las:{" "}
                            {new Date(
                              lastResult.previousScannedAt
                            ).toLocaleTimeString("es-AR")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Padrón de Asistentes Habilitados */}
          <div className="lg:col-span-6 rounded-lg bg-[#1c1c1c] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl font-normal text-white">
                Padrón QR en Puerta ({filteredTickets.length})
              </h2>
              <select
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
                className="px-3 py-2 rounded-md bg-[#121212] border border-[#353535] text-xs text-white"
              >
                <option value="TODOS">
                  {isSuper
                    ? "Todos los eventos"
                    : `Mis eventos asignados (${allowedEvents.length})`}
                </option>
                {allowedEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative p-2 bg-gray-100/20 text-white rounded-md">
              <Search className="w-4 h-4 text-white absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar asistente por nombre, DNI o código de 4 dígitos..."
                className="w-full pl-8 pr-3 py-1 bg-transparent text-sm text-white outline-none placeholder:text-[#A1A199]"
              />
            </div>

            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {filteredTickets.map((t) => {
                const isUsed = t.status === "USADO";
                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-md bg-[#121212] border border-[#2a2a2a] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-sm bg-[#353535] font-mono text-xs text-white">
                          {t.shortCode}
                        </span>
                        <span className="text-sm font-medium text-white">
                          {t.holderName}
                        </span>
                        {t.holderDni && (
                          <span className="text-xs text-[#8a8a8a] font-mono">
                            DNI {t.holderDni}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8a8a8a]">
                        {t.tierName} · {t.eventTitle}
                      </p>
                      {isUsed && t.scannedAt && (
                        <p className="text-[11px] text-[#ffb5d7] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Ingresó{" "}
                          {new Date(t.scannedAt).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          hs
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleProcessQR(t.qrCode)}
                        className={`px-3.5 py-2 rounded-[3px] text-xs font-medium cursor-pointer transition-all ${
                          isUsed
                            ? "bg-[#353535] text-white/70 hover:text-white"
                            : "bg-soft-pink text-[#1c1c1c] hover:brightness-90"
                        }`}
                      >
                        {isUsed ? "Ya Validado" : "Validar Ingreso"}
                      </button>

                      {isUsed && permissions.canResetScannedQR && (
                        <button
                          type="button"
                          onClick={async () => {
                            await resetTicketScanStatus(t.id);
                            syncData();
                            setLastResult(null);
                          }}
                          title="Restablecer entrada"
                          className="p-2 rounded-[3px] bg-[#252525] text-white/70 hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredTickets.length === 0 && (
                <p className="text-xs text-center text-[#8a8a8a] py-8">
                  No hay entradas QR para mostrar en este filtro.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

