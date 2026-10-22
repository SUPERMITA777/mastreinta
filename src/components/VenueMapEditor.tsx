"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  EventItem,
  VenueMapConfig,
  VenueSectorLabel,
  VenueSpot,
  VenueSpotStatus,
  VenueSpotType,
} from "@/lib/types";
import { formatARS } from "@/lib/store";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  Lock,
  Unlock,
  Move,
  Users,
  Sparkles,
  MapPin,
  Tag,
  Circle,
  Square,
  DollarSign,
  Gift,
  HelpCircle,
  Check,
} from "lucide-react";

interface VenueMapEditorProps {
  event: EventItem;
  onSaveMap: (updatedMap: VenueMapConfig) => void;
}

const SECTOR_COLOR_OPTIONS = [
  { label: "Magenta MAS30", value: "#AF2C75" },
  { label: "Dorado VIP", value: "#eab308" },
  { label: "Azul Pista", value: "#3b82f6" },
  { label: "Verde Esmeralda", value: "#10b981" },
  { label: "Púrpura Neón", value: "#8b5cf6" },
  { label: "Rosa Glow", value: "#ffb5d7" },
  { label: "Cian Eléctrico", value: "#06b6d4" },
  { label: "Naranja Fuego", value: "#f97316" },
];

export default function VenueMapEditor({
  event,
  onSaveMap,
}: VenueMapEditorProps) {
  const mapConfig: VenueMapConfig = event.venueMap || {
    enabled: true,
    sectors: [],
    spots: [],
  };

  const [enabled, setEnabled] = useState<boolean>(mapConfig.enabled ?? true);
  const [sectors, setSectors] = useState<VenueSectorLabel[]>(
    mapConfig.sectors || []
  );
  const [spots, setSpots] = useState<VenueSpot[]>(mapConfig.spots || []);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Spot editing form state
  const [spotForm, setSpotForm] = useState<VenueSpot | null>(null);

  // Sector editing form state
  const [sectorForm, setSectorForm] = useState<VenueSectorLabel | null>(null);

  // Canvas dragging state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingItem, setDraggingItem] = useState<{
    type: "spot" | "sector";
    id: string;
  } | null>(null);

  // Keep state synced if event changes
  useEffect(() => {
    if (event.venueMap) {
      setEnabled(event.venueMap.enabled ?? true);
      setSectors(event.venueMap.sectors || []);
      setSpots(event.venueMap.spots || []);
    }
  }, [event.id, event.venueMap]);

  // Handle saving the full map
  const handleSaveAll = () => {
    const updated: VenueMapConfig = {
      enabled,
      sectors,
      spots,
    };
    onSaveMap(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Select spot for editing
  const handleSelectSpot = (spot: VenueSpot) => {
    setSelectedSpotId(spot.id);
    setSelectedSectorId(null);
    setSpotForm({ ...spot });
    setSectorForm(null);
  };

  // Select sector for editing
  const handleSelectSector = (sec: VenueSectorLabel) => {
    setSelectedSectorId(sec.id);
    setSelectedSpotId(null);
    setSectorForm({ ...sec });
    setSpotForm(null);
  };

  // Deselect
  const handleDeselect = () => {
    setSelectedSpotId(null);
    setSelectedSectorId(null);
    setSpotForm(null);
    setSectorForm(null);
  };

  // Save current spot form
  const handleSaveSpotForm = () => {
    if (!spotForm) return;
    const updatedSpots = spots.map((s) =>
      s.id === spotForm.id ? { ...spotForm } : s
    );
    setSpots(updatedSpots);
    onSaveMap({ enabled, sectors, spots: updatedSpots });
    handleDeselect();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Delete spot
  const handleDeleteSpot = (id: string) => {
    if (!confirm("¿Eliminar esta mesa o sector del mapa?")) return;
    const updatedSpots = spots.filter((s) => s.id !== id);
    setSpots(updatedSpots);
    if (selectedSpotId === id) handleDeselect();
    onSaveMap({ enabled, sectors, spots: updatedSpots });
  };

  // Quick toggle spot status
  const handleQuickStatusChange = (
    id: string,
    newStatus: VenueSpotStatus
  ) => {
    const updatedSpots = spots.map((s) =>
      s.id === id ? { ...s, status: newStatus } : s
    );
    setSpots(updatedSpots);
    if (spotForm && spotForm.id === id) {
      setSpotForm({ ...spotForm, status: newStatus });
    }
    onSaveMap({ enabled, sectors, spots: updatedSpots });
  };

  // Save sector form
  const handleSaveSectorForm = () => {
    if (!sectorForm) return;
    const updatedSectors = sectors.map((sec) =>
      sec.id === sectorForm.id ? { ...sectorForm } : sec
    );
    setSectors(updatedSectors);
    onSaveMap({ enabled, sectors: updatedSectors, spots });
    handleDeselect();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Delete sector
  const handleDeleteSector = (id: string) => {
    if (!confirm("¿Eliminar esta etiqueta de sector?")) return;
    const updatedSectors = sectors.filter((sec) => sec.id !== id);
    setSectors(updatedSectors);
    if (selectedSectorId === id) handleDeselect();
    onSaveMap({ enabled, sectors: updatedSectors, spots });
  };

  // Preset: Add Mesa (8 accesos)
  const handleAddMesaPreset = () => {
    const nextNum = spots.filter((s) => s.type === "MESA").length + 1;
    const newSpot: VenueSpot = {
      id: `spot-mesa-${Date.now()}`,
      name: `Mesa ${nextNum} (8 personas)`,
      sectorName: "PISTA CENTRAL",
      type: "MESA",
      capacity: 8,
      price: 50000,
      perks: "8 accesos + 4 espumantes o botellas incluidas",
      x: Math.round(20 + Math.random() * 60),
      y: Math.round(30 + Math.random() * 40),
      shape: "circle",
      status: "DISPONIBLE",
    };
    const updatedSpots = [...spots, newSpot];
    setSpots(updatedSpots);
    handleSelectSpot(newSpot);
    onSaveMap({ enabled, sectors, spots: updatedSpots });
  };

  // Preset: Add Living VIP (10 accesos)
  const handleAddLivingPreset = () => {
    const nextNum = spots.filter((s) => s.type === "LIVING").length + 1;
    const newSpot: VenueSpot = {
      id: `spot-living-${Date.now()}`,
      name: `Living VIP ${nextNum} (10 personas)`,
      sectorName: "SECTOR VIP EXCLUSIVO",
      type: "LIVING",
      capacity: 10,
      price: 100000,
      perks: "10 accesos + 5 espumantes Baron B + camarero exclusivo + living privado",
      x: Math.round(70 + Math.random() * 15),
      y: Math.round(30 + Math.random() * 40),
      shape: "rect",
      status: "DISPONIBLE",
    };
    const updatedSpots = [...spots, newSpot];
    setSpots(updatedSpots);
    handleSelectSpot(newSpot);
    onSaveMap({ enabled, sectors, spots: updatedSpots });
  };

  // Preset: Add Sector VIP (20 accesos)
  const handleAddSectorVIPPreset = () => {
    const newSpot: VenueSpot = {
      id: `spot-sector-vip-${Date.now()}`,
      name: `Sector VIP Gold (20 personas)`,
      sectorName: "SECTOR VIP EXCLUSIVO",
      type: "SECTOR_VIP",
      capacity: 20,
      price: 200000,
      perks: "20 accesos + 10 espumantes Baron B + camarero exclusivo + acceso VIP sin fila",
      x: 82,
      y: 25,
      shape: "rect",
      status: "DISPONIBLE",
    };
    const updatedSpots = [...spots, newSpot];
    setSpots(updatedSpots);
    handleSelectSpot(newSpot);
    onSaveMap({ enabled, sectors, spots: updatedSpots });
  };

  // Add new Sector Label
  const handleAddSectorLabel = () => {
    const newSec: VenueSectorLabel = {
      id: `sec-${Date.now()}`,
      name: "NUEVO SECTOR",
      x: 50,
      y: 50,
      color: "#ffb5d7",
    };
    const updatedSectors = [...sectors, newSec];
    setSectors(updatedSectors);
    handleSelectSector(newSec);
    onSaveMap({ enabled, sectors: updatedSectors, spots });
  };

  // Dragging logic on canvas
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingItem || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(3, Math.min(97, Math.round(rawX)));
    const clampedY = Math.max(3, Math.min(97, Math.round(rawY)));

    if (draggingItem.type === "spot") {
      setSpots((prev) =>
        prev.map((s) =>
          s.id === draggingItem.id ? { ...s, x: clampedX, y: clampedY } : s
        )
      );
      if (spotForm && spotForm.id === draggingItem.id) {
        setSpotForm((prev) =>
          prev ? { ...prev, x: clampedX, y: clampedY } : null
        );
      }
    } else if (draggingItem.type === "sector") {
      setSectors((prev) =>
        prev.map((sec) =>
          sec.id === draggingItem.id ? { ...sec, x: clampedX, y: clampedY } : sec
        )
      );
      if (sectorForm && sectorForm.id === draggingItem.id) {
        setSectorForm((prev) =>
          prev ? { ...prev, x: clampedX, y: clampedY } : null
        );
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingItem) {
      setDraggingItem(null);
      onSaveMap({ enabled, sectors, spots });
    }
  };

  // Filtered spots for the summary table
  const filteredSpots = spots.filter((s) => {
    if (filterStatus === "ALL") return true;
    return s.status === filterStatus;
  });

  // Calculate statistics
  const totalCapacity = spots.reduce((acc, s) => acc + (s.capacity || 0), 0);
  const potentialRevenue = spots.reduce((acc, s) => acc + (s.price || 0), 0);
  const availableCount = spots.filter((s) => s.status === "DISPONIBLE").length;
  const reservedCount = spots.filter((s) => s.status === "RESERVADO").length;
  const soldCount = spots.filter((s) => s.status === "VENDIDO").length;

  return (
    <div className="space-y-6">
      {/* CABECERA Y CONTROL DE ACTIVACIÓN */}
      <div className="rounded-xl bg-[#181818] border border-[#2e2e2e] p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-[#AF2C75]/20 text-[#ffb5d7]">
                <MapPin className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Plano del Lugar, Sectores y Mesas Reservables
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-[#AF2C75]/20 text-[#ffb5d7] border border-[#AF2C75]/40 font-mono">
                    {spots.length} lugares cargados
                  </span>
                </h3>
                <p className="text-xs text-[#8a8a8a]">
                  Crea y personaliza el croquis interactivo de {event.title}. Los clientes podrán ver los sectores, elegir su mesa y recibir sus accesos automáticamente.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer bg-[#222] hover:bg-[#282828] px-3.5 py-2 rounded-lg border border-[#353535] transition-colors">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => {
                  const val = e.target.checked;
                  setEnabled(val);
                  onSaveMap({ enabled: val, sectors, spots });
                }}
                className="w-4 h-4 rounded accent-[#AF2C75]"
              />
              <span>Habilitar Mapa en Web Pública</span>
            </label>

            <button
              type="button"
              onClick={handleSaveAll}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                saveSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-soft-pink text-[#1c1c1c] hover:bg-white shadow-lg"
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Mapa Guardado!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Mapa</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-[#2a2a2a]">
          <div className="bg-[#121212] p-3 rounded-lg border border-[#262626]">
            <span className="text-[11px] uppercase tracking-wider text-[#8a8a8a] block">
              Total Lugares
            </span>
            <span className="text-lg font-bold font-mono text-white">
              {spots.length}
            </span>
          </div>
          <div className="bg-[#121212] p-3 rounded-lg border border-[#262626]">
            <span className="text-[11px] uppercase tracking-wider text-emerald-400 block">
              Disponibles
            </span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {availableCount}
            </span>
          </div>
          <div className="bg-[#121212] p-3 rounded-lg border border-[#262626]">
            <span className="text-[11px] uppercase tracking-wider text-amber-400 block">
              Reservadas
            </span>
            <span className="text-lg font-bold font-mono text-amber-400">
              {reservedCount}
            </span>
          </div>
          <div className="bg-[#121212] p-3 rounded-lg border border-[#262626]">
            <span className="text-[11px] uppercase tracking-wider text-rose-400 block">
              Vendidas
            </span>
            <span className="text-lg font-bold font-mono text-rose-400">
              {soldCount}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-[#121212] p-3 rounded-lg border border-[#262626]">
            <span className="text-[11px] uppercase tracking-wider text-[#ffb5d7] block">
              Recaudación Potencial
            </span>
            <span className="text-lg font-bold font-mono text-[#ffb5d7]">
              {formatARS(potentialRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN RÁPIDA (PRESETS) */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleAddMesaPreset}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#222222] hover:bg-[#2c2c2c] text-white border border-[#353535] transition-all cursor-pointer hover:border-[#ffb5d7]/50"
        >
          <Circle className="w-3.5 h-3.5 text-blue-400" />
          <span>+ Mesa (8 personas · $50.000)</span>
        </button>

        <button
          type="button"
          onClick={handleAddLivingPreset}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#222222] hover:bg-[#2c2c2c] text-white border border-[#353535] transition-all cursor-pointer hover:border-[#ffb5d7]/50"
        >
          <Square className="w-3.5 h-3.5 text-emerald-400" />
          <span>+ Living VIP (10 personas · $100.000)</span>
        </button>

        <button
          type="button"
          onClick={handleAddSectorVIPPreset}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#222222] hover:bg-[#2c2c2c] text-white border border-[#353535] transition-all cursor-pointer hover:border-amber-400/50"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>+ Sector VIP Gold (20 accesos · $200.000)</span>
        </button>

        <button
          type="button"
          onClick={handleAddSectorLabel}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#222222] hover:bg-[#2c2c2c] text-white border border-[#353535] transition-all cursor-pointer hover:border-[#ffb5d7]"
        >
          <Tag className="w-3.5 h-3.5 text-[#ffb5d7]" />
          <span>+ Etiqueta de Sector</span>
        </button>
      </div>

      {/* PLANO INTERACTIVO Y PANEL DE EDICIÓN LATERAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CANVAS VISUAL (9 de 12 o 12 completo si no hay nada seleccionado) */}
        <div className={`space-y-2 ${spotForm || sectorForm ? "lg:col-span-8" : "lg:col-span-12"}`}>
          <div className="flex items-center justify-between text-xs text-[#8a8a8a] px-1">
            <span className="flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-[#ffb5d7]" />
              Arrastra mesas o sectores para posicionarlos. Haz clic para editar precio, accesos y beneficios.
            </span>
            <span className="hidden sm:inline font-mono">
              Visualización 100% interactiva
            </span>
          </div>

          <div
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-[#0f0f0f] border-2 border-[#2b2b2b] rounded-2xl overflow-hidden shadow-2xl select-none"
            style={{
              backgroundImage: `
                radial-gradient(circle at 50% 15%, rgba(175, 44, 117, 0.22) 0%, transparent 60%),
                radial-gradient(circle at 85% 50%, rgba(234, 179, 8, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 15% 50%, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
                linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: "100% 100%, 100% 100%, 100% 100%, 40px 40px, 40px 40px",
            }}
          >
            {/* ESCENARIO / CABINA DJ REFERENCIAL */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-48 py-1 px-3 rounded-full bg-[#1e1e1e]/90 border border-[#AF2C75]/60 text-center text-[10px] uppercase font-bold tracking-widest text-[#ffb5d7] shadow-lg pointer-events-none">
              Cabina DJ / Escenario MAS30
            </div>

            {/* PISTA DANCEFLOOR CIRCULAR EN EL CENTRO */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-80 h-64 sm:h-80 rounded-full border border-dashed border-white/10 pointer-events-none flex items-center justify-center">
              <span className="text-[11px] uppercase tracking-widest font-bold text-white/10">
                Pista de Baile
              </span>
            </div>

            {/* ETIQUETAS DE SECTOR */}
            {sectors.map((sec) => {
              const isSelected = selectedSectorId === sec.id;
              return (
                <div
                  key={sec.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingItem({ type: "sector", id: sec.id });
                    handleSelectSector(sec);
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition-all z-10 select-none shadow-md ${
                    isSelected
                      ? "ring-2 ring-white scale-110 shadow-2xl"
                      : "hover:scale-105"
                  }`}
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
              );
            })}

            {/* SPOTS / MESAS / SECTORES VIP */}
            {spots.map((spot) => {
              const isSelected = selectedSpotId === spot.id;
              const isAvailable = spot.status === "DISPONIBLE";
              const isReserved = spot.status === "RESERVADO";
              const isSold = spot.status === "VENDIDO";
              const isBlocked = spot.status === "BLOQUEADO";

              let statusBg = "bg-emerald-950/80 border-emerald-500 text-emerald-200";
              let badgeColor = "bg-emerald-500 text-black";
              if (isReserved) {
                statusBg = "bg-amber-950/80 border-amber-500 text-amber-200";
                badgeColor = "bg-amber-500 text-black";
              } else if (isSold) {
                statusBg = "bg-rose-950/80 border-rose-500 text-rose-200";
                badgeColor = "bg-rose-500 text-white";
              } else if (isBlocked) {
                statusBg = "bg-zinc-900 border-zinc-600 text-zinc-400";
                badgeColor = "bg-zinc-600 text-white";
              }

              const isRect = spot.shape === "rect" || spot.type === "LIVING" || spot.type === "SECTOR_VIP";

              return (
                <div
                  key={spot.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingItem({ type: "spot", id: spot.id });
                    handleSelectSpot(spot);
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center text-center transition-transform z-20 shadow-xl ${
                    isRect
                      ? "w-28 sm:w-32 py-2 px-1.5 rounded-xl border-2"
                      : "w-20 sm:w-24 h-20 sm:h-24 rounded-full border-2"
                  } ${statusBg} ${
                    isSelected
                      ? "ring-4 ring-[#ffb5d7] scale-110 shadow-2xl z-30"
                      : "hover:scale-105"
                  }`}
                  style={{
                    left: `${spot.x}%`,
                    top: `${spot.y}%`,
                  }}
                >
                  <span className="text-[11px] sm:text-xs font-bold truncate max-w-[90%] leading-tight text-white drop-shadow">
                    {spot.name}
                  </span>

                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full font-mono ${badgeColor}`}
                    >
                      {spot.capacity}p
                    </span>
                    <span className="text-[10px] font-mono font-bold text-white/90">
                      {formatARS(spot.price)}
                    </span>
                  </div>

                  {spot.perks && (
                    <span className="text-[8px] text-white/70 truncate max-w-[95%] mt-0.5">
                      {spot.perks}
                    </span>
                  )}

                  {/* Estado indicator */}
                  <span className="text-[8px] uppercase tracking-wider font-bold mt-0.5 opacity-80">
                    {spot.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL LATERAL DE EDICIÓN DEL ELEMENTO SELECCIONADO */}
        {(spotForm || sectorForm) && (
          <div className="lg:col-span-4 rounded-xl bg-[#181818] border border-[#2e2e2e] p-5 space-y-4 shadow-2xl">
            {/* EDICIÓN DE SPOT / MESA */}
            {spotForm && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
                  <div className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-[#ffb5d7]" />
                    <h4 className="text-sm font-bold text-white">
                      Editar Lugar / Mesa
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeselect}
                    className="text-xs text-[#8a8a8a] hover:text-white"
                  >
                    ✕ Cerrar
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider block mb-1">
                      Nombre / Identificador
                    </label>
                    <input
                      type="text"
                      value={spotForm.name}
                      onChange={(e) =>
                        setSpotForm({ ...spotForm, name: e.target.value })
                      }
                      placeholder="Ej: Mesa 5, Living VIP 1, Sector Gold"
                      className="w-full bg-[#121212] border border-[#353535] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ffb5d7]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider block mb-1">
                        Tipo
                      </label>
                      <select
                        value={spotForm.type}
                        onChange={(e) =>
                          setSpotForm({
                            ...spotForm,
                            type: e.target.value as VenueSpotType,
                          })
                        }
                        className="w-full bg-[#121212] border border-[#353535] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#ffb5d7]"
                      >
                        <option value="MESA">Mesa</option>
                        <option value="LIVING">Living</option>
                        <option value="SECTOR_VIP">Sector VIP</option>
                        <option value="BOX">Box Privado</option>
                        <option value="BARRA">Barra</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider block mb-1">
                        Forma
                      </label>
                      <select
                        value={spotForm.shape || "circle"}
                        onChange={(e) =>
                          setSpotForm({
                            ...spotForm,
                            shape: e.target.value as "circle" | "rect",
                          })
                        }
                        className="w-full bg-[#121212] border border-[#353535] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#ffb5d7]"
                      >
                        <option value="circle">Circular</option>
                        <option value="rect">Rectangular</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider block mb-1">
                      Sector Asociado
                    </label>
                    <input
                      type="text"
                      value={spotForm.sectorName || ""}
                      onChange={(e) =>
                        setSpotForm({ ...spotForm, sectorName: e.target.value })
                      }
                      placeholder="Ej: PISTA CENTRAL, SECTOR VIP"
                      className="w-full bg-[#121212] border border-[#353535] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ffb5d7]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider block mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#ffb5d7]" />
                        <span>Accesos (QRs)</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={spotForm.capacity}
                        onChange={(e) =>
                          setSpotForm({
                            ...spotForm,
                            capacity: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="w-full bg-[#121212] border border-[#353535] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#ffb5d7]"
                      />
                      <span className="text-[10px] text-[#8a8a8a]">
                        Emitirá {spotForm.capacity} QRs
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider block mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-[#ffb5d7]" />
                        <span>Precio Total ($)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={spotForm.price}
                        onChange={(e) =>
                          setSpotForm({
                            ...spotForm,
                            price: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-full bg-[#121212] border border-[#353535] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#ffb5d7]"
                      />
                      <span className="text-[10px] text-[#ffb5d7] font-mono">
                        {formatARS(spotForm.price)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Gift className="w-3 h-3 text-[#ffb5d7]" />
                      <span>Beneficios Adicionales (Perks)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={spotForm.perks || ""}
                      onChange={(e) =>
                        setSpotForm({ ...spotForm, perks: e.target.value })
                      }
                      placeholder="Ej: 10 espumantes Baron B + camarero exclusivo + acceso VIP sin fila"
                      className="w-full bg-[#121212] border border-[#353535] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ffb5d7]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider block mb-1">
                      Estado Actual
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          "DISPONIBLE",
                          "RESERVADO",
                          "VENDIDO",
                          "BLOQUEADO",
                        ] as VenueSpotStatus[]
                      ).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() =>
                            setSpotForm({ ...spotForm, status: st })
                          }
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                            spotForm.status === st
                              ? st === "DISPONIBLE"
                                ? "bg-emerald-600 text-white"
                                : st === "RESERVADO"
                                ? "bg-amber-600 text-white"
                                : st === "VENDIDO"
                                ? "bg-rose-600 text-white"
                                : "bg-zinc-600 text-white"
                              : "bg-[#222] text-[#8a8a8a] hover:text-white"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {spotForm.reservedByOrderCode && (
                    <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-[11px] text-amber-200">
                      <strong>Reservado por:</strong> {spotForm.reservedByName || "Comprador"} (Orden: {spotForm.reservedByOrderCode})
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveSpotForm}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-soft-pink text-[#1c1c1c] hover:bg-white transition-colors cursor-pointer"
                    >
                      Guardar Lugar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSpot(spotForm.id)}
                      className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 transition-colors cursor-pointer"
                      title="Eliminar del mapa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* EDICIÓN DE SECTOR LABEL */}
            {sectorForm && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#ffb5d7]" />
                    <h4 className="text-sm font-bold text-white">
                      Editar Etiqueta de Sector
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeselect}
                    className="text-xs text-[#8a8a8a] hover:text-white"
                  >
                    ✕ Cerrar
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider block mb-1">
                      Nombre del Sector
                    </label>
                    <input
                      type="text"
                      value={sectorForm.name}
                      onChange={(e) =>
                        setSectorForm({ ...sectorForm, name: e.target.value })
                      }
                      placeholder="Ej: PISTA CENTRAL, SECTOR VIP"
                      className="w-full bg-[#121212] border border-[#353535] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ffb5d7]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider block mb-1">
                      Color de la Etiqueta
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {SECTOR_COLOR_OPTIONS.map((col) => (
                        <button
                          key={col.value}
                          type="button"
                          onClick={() =>
                            setSectorForm({ ...sectorForm, color: col.value })
                          }
                          className={`h-8 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center ${
                            sectorForm.color === col.value
                              ? "border-white scale-105"
                              : "border-transparent opacity-75 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: col.value }}
                          title={col.label}
                        >
                          {sectorForm.color === col.value && (
                            <Check className="w-4 h-4 text-white drop-shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveSectorForm}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-soft-pink text-[#1c1c1c] hover:bg-white transition-colors cursor-pointer"
                    >
                      Guardar Etiqueta
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSector(sectorForm.id)}
                      className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 transition-colors cursor-pointer"
                      title="Eliminar etiqueta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TABLA Y LISTADO DETALLADO DE MESAS Y SECTORES */}
      <div className="rounded-xl bg-[#181818] border border-[#2e2e2e] p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2a2a2a] pb-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#ffb5d7]" />
              Listado de Mesas y Lugares Destacados
            </h4>
            <p className="text-xs text-[#8a8a8a]">
              Gestión individual de precios, cantidad de accesos emitidos y beneficios para este evento.
            </p>
          </div>

          {/* Filtros de estado */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {["ALL", "DISPONIBLE", "RESERVADO", "VENDIDO", "BLOQUEADO"].map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    filterStatus === st
                      ? "bg-soft-pink text-[#1c1c1c]"
                      : "bg-[#222222] text-[#8a8a8a] hover:text-white"
                  }`}
                >
                  {st === "ALL" ? "Todos" : st}
                </button>
              )
            )}
          </div>
        </div>

        {filteredSpots.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#8a8a8a]">
            No hay lugares cargados con este filtro. Agrega mesas o livings con los botones de arriba.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2e2e2e] text-[#8a8a8a] uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Nombre / Identificador</th>
                  <th className="py-2.5 px-3">Sector</th>
                  <th className="py-2.5 px-3">Accesos (QRs)</th>
                  <th className="py-2.5 px-3">Precio</th>
                  <th className="py-2.5 px-3">Beneficios Adicionales</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {filteredSpots.map((spot) => (
                  <tr
                    key={spot.id}
                    className="hover:bg-[#202020] transition-colors"
                  >
                    <td className="py-3 px-3 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        {spot.shape === "rect" ? (
                          <Square className="w-3.5 h-3.5 text-[#ffb5d7]" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        <span>{spot.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#b0b0b0]">
                      {spot.sectorName || "—"}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-[#ffb5d7] border border-[#ffb5d7]/30">
                        {spot.capacity} accesos
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {formatARS(spot.price)}
                    </td>
                    <td className="py-3 px-3 text-[#b0b0b0] max-w-xs truncate">
                      {spot.perks || "Sin beneficios adicionales especificados"}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          spot.status === "DISPONIBLE"
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700/60"
                            : spot.status === "RESERVADO"
                            ? "bg-amber-950/80 text-amber-300 border border-amber-700/60"
                            : spot.status === "VENDIDO"
                            ? "bg-rose-950/80 text-rose-300 border border-rose-700/60"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-600"
                        }`}
                      >
                        {spot.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSelectSpot(spot)}
                          className="px-2.5 py-1 rounded bg-[#252525] hover:bg-[#333] text-white text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        {spot.status === "DISPONIBLE" ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickStatusChange(spot.id, "BLOQUEADO")
                            }
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-colors cursor-pointer"
                            title="Bloquear"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickStatusChange(spot.id, "DISPONIBLE")
                            }
                            className="px-2 py-1 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 text-[11px] transition-colors cursor-pointer"
                            title="Habilitar"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteSpot(spot.id)}
                          className="p-1 rounded text-rose-400 hover:text-white hover:bg-rose-900/50 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
