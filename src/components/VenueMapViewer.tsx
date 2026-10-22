"use client";

import React, { useState } from "react";
import { EventItem, VenuePoint, VenuePolygon, VenueSpot } from "@/lib/types";
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
  const polygons = mapConfig.polygons || [];

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

  // Convertir puntos % a coordenadas SVG strings (0-100 viewBox)
  const getSvgPointsString = (points: VenuePoint[]): string => {
    return points.map((p) => `${p.x},${p.y}`).join(" ");
  };

  // Calcular centroide para ubicar texto del polígono
  const getPolygonCenter = (points: VenuePoint[]): VenuePoint => {
    if (!points || points.length === 0) return { x: 50, y: 50 };
    const total = points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    return {
      x: Math.round(total.x / points.length),
      y: Math.round(total.y / points.length),
    };
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
        {/* PISTA DANCEFLOOR CIRCULAR */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 sm:w-72 h-56 sm:h-72 rounded-full border border-dashed border-white/10 pointer-events-none flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/10">
            Pista Central
          </span>
        </div>

        {/* CAPA SVG PARA ELEMENTOS POLIGONALES (ESCENARIO, PISTAS, BARRAS) */}
        {polygons.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {polygons.map((poly) => {
              const strokeColor = poly.color || "#AF2C75";
              const fillColor = poly.fillColor || `${strokeColor}33`;
              const center = getPolygonCenter(poly.points);

              return (
                <g key={poly.id}>
                  <polygon
                    points={getSvgPointsString(poly.points)}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={0.5}
                  />
                  <text
                    x={center.x}
                    y={center.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize="2.2"
                    fontWeight="bold"
                    letterSpacing="0.08em"
                    className="select-none drop-shadow pointer-events-none"
                  >
                    {poly.name}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* ETIQUETAS DE SECTORES */}
        {sectors.map((sec) => (
          <div
            key={sec.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm pointer-events-none select-none z-10"
            style={{
              left: `${sec.x}%`,
              top: `${sec.y}%`,
              transform: `translate(-50%, -50%) rotate(${sec.rotation || 0}deg)`,
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

          let statusClass = "bg-emerald-950/90 border-emerald-500 text-emerald-200 hover:scale-105 shadow-lg shadow-emerald-950/50 cursor-pointer";
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

          // Tamaños proporcionales en el visualizador (escalados suavemente para móviles/desktop)
          const widthPx = spot.width ? Math.round(spot.width * 0.9) : (isRect ? 112 : 80);
          const heightPx = spot.height ? Math.round(spot.height * 0.9) : (isRect ? 60 : 80);
          const rotationDeg = spot.rotation || 0;

          return (
            <button
              key={spot.id}
              type="button"
              onClick={() => handleSpotClick(spot)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center transition-all z-20 ${
                isRect ? "rounded-xl border-2 p-1" : "rounded-full border-2 p-1"
              } ${statusClass} ${
                isSelected || isChosen
                  ? "ring-4 ring-[#ffb5d7] scale-105 shadow-2xl z-30"
                  : ""
              }`}
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                width: `${widthPx}px`,
                height: `${heightPx}px`,
                transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
              }}
            >
              <span className="text-[10px] sm:text-[11px] font-bold truncate max-w-[92%] leading-tight text-white drop-shadow">
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
                    ? "✓ DISPONIBLE"
                    : activeSpot.status === "RESERVADO"
                    ? "⏳ RESERVADA"
                    : "✕ NO DISPONIBLE"}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-[#8a8a8a] flex-wrap pt-1">
                <span className="flex items-center gap-1 font-mono text-white">
                  <Users className="w-3.5 h-3.5 text-[#ffb5d7]" />
                  <strong>{activeSpot.capacity} accesos / QRs incluidos</strong>
                </span>
                <span className="font-mono text-sm font-bold text-[#ffb5d7]">
                  Total: {formatARS(activeSpot.price)}
                </span>
              </div>

              {activeSpot.perks && (
                <p className="text-xs text-white/80 flex items-start gap-1.5 pt-1">
                  <Gift className="w-3.5 h-3.5 text-[#ffb5d7] shrink-0 mt-0.5" />
                  <span>{activeSpot.perks}</span>
                </p>
              )}
            </div>

            <div className="w-full md:w-auto flex items-center justify-end">
              {activeSpot.status === "DISPONIBLE" ? (
                <button
                  type="button"
                  onClick={() => handleConfirmReservation(activeSpot)}
                  className={`w-full md:w-auto px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedSpotId === activeSpot.id
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50"
                      : "bg-soft-pink text-[#1c1c1c] hover:bg-white shadow-lg"
                  }`}
                >
                  {selectedSpotId === activeSpot.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Mesa Seleccionada para Reserva</span>
                    </>
                  ) : (
                    <>
                      <span>Elegir Esta Mesa ({formatARS(activeSpot.price)})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <div className="w-full md:w-auto text-center px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-medium flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Este lugar ya no se encuentra disponible</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
