"use client";

import React, { useState } from "react";
import { EventItem, VenueSpot } from "@/lib/types";
import { formatARS } from "@/lib/store";
import {
  Users,
  Sparkles,
  MapPin,
  Check,
  Gift,
  Lock,
  ArrowRight,
  Circle,
  Square,
  Info,
} from "lucide-react";

interface VenueMapViewerProps {
  event: EventItem;
  selectedSpotId?: string;
  onSelectSpot: (spot: VenueSpot) => void;
}

export default function VenueMapViewer({
  event,
  selectedSpotId,
  onSelectSpot,
}: VenueMapViewerProps) {
  const mapConfig = event.venueMap;
  if (!mapConfig || !mapConfig.enabled || !mapConfig.spots || mapConfig.spots.length === 0) {
    return null;
  }

  const sectors = mapConfig.sectors || [];
  const spots = mapConfig.spots || [];

  // Active clicked spot in the viewer
  const [activeSpot, setActiveSpot] = useState<VenueSpot | null>(
    spots.find((s) => s.id === selectedSpotId) || null
  );

  const handleSpotClick = (spot: VenueSpot) => {
    setActiveSpot(spot);
  };

  const handleConfirmReservation = (spot: VenueSpot) => {
    if (spot.status !== "DISPONIBLE") return;
    onSelectSpot(spot);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-[#AF2C75]/20 text-[#ffb5d7]">
            <MapPin className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Plano del Lugar · Mesas & Sectores VIP
            </h3>
            <p className="text-xs text-[#8a8a8a]">
              Toca o haz clic en cualquier mesa o sector para ver su ubicación, precio y beneficios.
            </p>
          </div>
        </div>

        {/* Leyenda de colores */}
        <div className="flex items-center gap-3 text-[11px] text-[#8a8a8a]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <strong className="text-white">Disponible</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Reservada</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Ocupada</span>
          </span>
        </div>
      </div>

      {/* PLANO INTERACTIVO */}
      <div
        className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-[#0c0c0c] border border-[#2b2b2b] rounded-2xl overflow-hidden shadow-2xl select-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 15%, rgba(175, 44, 117, 0.28) 0%, transparent 60%),
            radial-gradient(circle at 85% 50%, rgba(234, 179, 8, 0.20) 0%, transparent 55%),
            radial-gradient(circle at 15% 50%, rgba(16, 185, 129, 0.16) 0%, transparent 55%),
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 100% 100%, 100% 100%, 40px 40px, 40px 40px",
        }}
      >
        {/* CABINA DJ / ESCENARIO */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-44 py-1 px-3 rounded-full bg-[#181818]/90 border border-[#AF2C75]/60 text-center text-[10px] uppercase font-bold tracking-widest text-[#ffb5d7] shadow-lg pointer-events-none">
          Cabina DJ / Escenario MAS30
        </div>

        {/* PISTA DANCEFLOOR */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 sm:w-72 h-56 sm:h-72 rounded-full border border-dashed border-white/10 pointer-events-none flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/10">
            Pista Central
          </span>
        </div>

        {/* ETIQUETAS DE SECTORES */}
        {sectors.map((sec) => (
          <div
            key={sec.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm pointer-events-none select-none z-10"
            style={{
              left: `${sec.x}%`,
              top: `${sec.y}%`,
              backgroundColor: `${sec.color || "#ffb5d7"}22`,
              border: `1.5px dashed ${sec.color || "#ffb5d7"}`,
              color: sec.color || "#ffb5d7",
            }}
          >
            {sec.name}
          </div>
        ))}

        {/* MESAS / SPOTS */}
        {spots.map((spot) => {
          const isSelected = activeSpot?.id === spot.id;
          const isChosen = selectedSpotId === spot.id;
          const isAvailable = spot.status === "DISPONIBLE";
          const isReserved = spot.status === "RESERVADO";
          const isSold = spot.status === "VENDIDO";
          const isBlocked = spot.status === "BLOQUEADO";

          let statusClass = "bg-emerald-950/90 border-emerald-500 text-emerald-200 hover:scale-110 shadow-lg shadow-emerald-950/50 cursor-pointer";
          let badgeClass = "bg-emerald-500 text-black";
          if (isReserved) {
            statusClass = "bg-amber-950/80 border-amber-500 text-amber-200 cursor-not-allowed opacity-80";
            badgeClass = "bg-amber-500 text-black";
          } else if (isSold) {
            statusClass = "bg-rose-950/80 border-rose-500 text-rose-300 cursor-not-allowed opacity-60";
            badgeClass = "bg-rose-500 text-white";
          } else if (isBlocked) {
            statusClass = "bg-zinc-900 border-zinc-700 text-zinc-400 cursor-not-allowed opacity-50";
            badgeClass = "bg-zinc-700 text-white";
          }

          const isRect = spot.shape === "rect" || spot.type === "LIVING" || spot.type === "SECTOR_VIP";

          return (
            <button
              key={spot.id}
              type="button"
              onClick={() => handleSpotClick(spot)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center transition-all z-20 ${
                isRect
                  ? "w-24 sm:w-28 py-1.5 px-1 rounded-xl border-2"
                  : "w-16 sm:w-20 h-16 sm:h-20 rounded-full border-2"
              } ${statusClass} ${
                isSelected || isChosen
                  ? "ring-4 ring-[#ffb5d7] scale-110 shadow-2xl z-30"
                  : ""
              }`}
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
              }}
            >
              <span className="text-[10px] sm:text-[11px] font-bold truncate max-w-[90%] leading-tight text-white drop-shadow">
                {spot.name}
              </span>

              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`text-[8px] font-black px-1.5 py-0.2 rounded-full font-mono ${badgeClass}`}
                >
                  {spot.capacity}p
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-white/95">
                  {formatARS(spot.price)}
                </span>
              </div>

              {!isAvailable && (
                <span className="text-[7px] uppercase tracking-wider font-extrabold mt-0.5 opacity-90">
                  {spot.status === "VENDIDO"
                    ? "OCUPADA"
                    : spot.status === "RESERVADO"
                    ? "RESERVADA"
                    : "NO DISPONIBLE"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* DETALLE DEL LUGAR TOCADO / SELECCIONADO */}
      {activeSpot && (
        <div className="rounded-xl bg-[#181818] border-2 border-[#AF2C75] p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-extrabold text-white">
                  {activeSpot.name}
                </h4>
                {activeSpot.sectorName && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#AF2C75]/20 text-[#ffb5d7] border border-[#AF2C75]/40">
                    {activeSpot.sectorName}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    activeSpot.status === "DISPONIBLE"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-600"
                      : "bg-rose-950 text-rose-300 border border-rose-700"
                  }`}
                >
                  {activeSpot.status === "DISPONIBLE"
                    ? "Disponible"
                    : "Ya reservada"}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-[#b0b0b0]">
                <span className="flex items-center gap-1.5 text-white font-medium">
                  <Users className="w-3.5 h-3.5 text-[#ffb5d7]" />
                  Incluye <strong>{activeSpot.capacity} accesos QR individuales</strong>
                </span>
                <span className="text-soft-pink font-bold font-mono text-sm">
                  {formatARS(activeSpot.price)}
                </span>
              </div>

              {activeSpot.perks && (
                <p className="text-xs text-[#d1d5db] flex items-center gap-1.5 pt-1">
                  <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    <strong>Beneficios incluidos:</strong> {activeSpot.perks}
                  </span>
                </p>
              )}
            </div>

            <div className="w-full md:w-auto shrink-0">
              {activeSpot.status === "DISPONIBLE" ? (
                <button
                  type="button"
                  onClick={() => handleConfirmReservation(activeSpot)}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-soft-pink text-[#1c1c1c] hover:bg-white shadow-lg hover:shadow-[#AF2C75]/40 transition-all cursor-pointer"
                >
                  <span>Reservar {activeSpot.name} ({formatARS(activeSpot.price)})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-400 cursor-not-allowed">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Este lugar ya no está disponible</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LISTA RÁPIDA DE MESAS Y SECTORES (SELECTOR ALTERNATIVO) */}
      <div className="space-y-2 pt-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8a8a8a] block">
          Mesas y Sectores Disponibles para Reservar
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {spots
            .filter((s) => s.status === "DISPONIBLE")
            .map((spot) => (
              <button
                key={spot.id}
                type="button"
                onClick={() => {
                  setActiveSpot(spot);
                  handleConfirmReservation(spot);
                }}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedSpotId === spot.id || activeSpot?.id === spot.id
                    ? "bg-[#221820] border-[#AF2C75] shadow-lg shadow-[#AF2C75]/20"
                    : "bg-[#181818] border-[#2e2e2e] hover:border-[#ffb5d7]/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      {spot.shape === "rect" ? (
                        <Square className="w-3 h-3 text-[#ffb5d7]" />
                      ) : (
                        <Circle className="w-3 h-3 text-blue-400" />
                      )}
                      {spot.name}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#ffb5d7]">
                      {formatARS(spot.price)}
                    </span>
                  </div>

                  <span className="text-[10px] text-[#8a8a8a] block mt-0.5">
                    {spot.sectorName || "Pista"} · <strong>{spot.capacity} accesos QR</strong>
                  </span>

                  {spot.perks && (
                    <p className="text-[10px] text-[#b0b0b0] line-clamp-1 mt-1">
                      {spot.perks}
                    </p>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-[#262626] flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-semibold">
                    ✓ Disponible
                  </span>
                  <span className="text-soft-pink font-bold flex items-center gap-1">
                    Reservar →
                  </span>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
