"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  EventItem,
  VenueMapConfig,
  VenuePoint,
  VenuePolygon,
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
  RotateCw,
  Maximize2,
  Minimize2,
  Pentagon,
  PenTool,
  Undo2,
  X,
  Compass,
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
    polygons: [],
  };

  const [enabled, setEnabled] = useState<boolean>(mapConfig.enabled ?? true);
  const [sectors, setSectors] = useState<VenueSectorLabel[]>(
    mapConfig.sectors || []
  );
  const [spots, setSpots] = useState<VenueSpot[]>(mapConfig.spots || []);
  const [polygons, setPolygons] = useState<VenuePolygon[]>(
    mapConfig.polygons || []
  );

  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Formularios de edición lateral
  const [spotForm, setSpotForm] = useState<VenueSpot | null>(null);
  const [sectorForm, setSectorForm] = useState<VenueSectorLabel | null>(null);
  const [polygonForm, setPolygonForm] = useState<VenuePolygon | null>(null);

  // Modo dibujo por puntos (ej: Escenario, Pista, Barra)
  const [isDrawingPolygon, setIsDrawingPolygon] = useState<boolean>(false);
  const [drawingPoints, setDrawingPoints] = useState<VenuePoint[]>([]);
  const [drawingName, setDrawingName] = useState<string>("ESCENARIO PRINCIPAL");
  const [drawingColor, setDrawingColor] = useState<string>("#AF2C75");

  // Estado de arrastre en el canvas
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingItem, setDraggingItem] = useState<{
    type: "spot" | "sector";
    id: string;
  } | null>(null);

  // Arrastre individual de un punto/vértice de un polígono
  const [draggingPolygonVertex, setDraggingPolygonVertex] = useState<{
    polygonId: string;
    pointIdx: number;
  } | null>(null);

  // Sincronizar estado si cambia el evento
  useEffect(() => {
    if (event.venueMap) {
      setEnabled(event.venueMap.enabled ?? true);
      setSectors(event.venueMap.sectors || []);
      setSpots(event.venueMap.spots || []);
      setPolygons(event.venueMap.polygons || []);
    }
  }, [event.id, event.venueMap]);

  // Guardar mapa completo
  const handleSaveAll = () => {
    const updated: VenueMapConfig = {
      enabled,
      sectors,
      spots,
      polygons,
    };
    onSaveMap(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Seleccionar spot
  const handleSelectSpot = (spot: VenueSpot) => {
    setSelectedSpotId(spot.id);
    setSelectedSectorId(null);
    setSelectedPolygonId(null);
    setSpotForm({ ...spot });
    setSectorForm(null);
    setPolygonForm(null);
  };

  // Seleccionar sector
  const handleSelectSector = (sec: VenueSectorLabel) => {
    setSelectedSectorId(sec.id);
    setSelectedSpotId(null);
    setSelectedPolygonId(null);
    setSectorForm({ ...sec });
    setSpotForm(null);
    setPolygonForm(null);
  };

  // Seleccionar polígono
  const handleSelectPolygon = (poly: VenuePolygon) => {
    setSelectedPolygonId(poly.id);
    setSelectedSpotId(null);
    setSelectedSectorId(null);
    setPolygonForm({ ...poly });
    setSpotForm(null);
    setSectorForm(null);
  };

  // Deseleccionar todo
  const handleDeselect = () => {
    setSelectedSpotId(null);
    setSelectedSectorId(null);
    setSelectedPolygonId(null);
    setSpotForm(null);
    setSectorForm(null);
    setPolygonForm(null);
  };

  // Guardar formulario de spot
  const handleSaveSpotForm = () => {
    if (!spotForm) return;
    const updatedSpots = spots.map((s) =>
      s.id === spotForm.id ? { ...spotForm } : s
    );
    setSpots(updatedSpots);
    onSaveMap({ enabled, sectors, spots: updatedSpots, polygons });
    handleDeselect();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Eliminar spot
  const handleDeleteSpot = (id: string) => {
    if (!confirm("¿Eliminar esta mesa o sector del mapa?")) return;
    const updatedSpots = spots.filter((s) => s.id !== id);
    setSpots(updatedSpots);
    if (selectedSpotId === id) handleDeselect();
    onSaveMap({ enabled, sectors, spots: updatedSpots, polygons });
  };

  // Cambio rápido de estado de spot
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
    onSaveMap({ enabled, sectors, spots: updatedSpots, polygons });
  };

  // Guardar formulario de sector
  const handleSaveSectorForm = () => {
    if (!sectorForm) return;
    const updatedSectors = sectors.map((sec) =>
      sec.id === sectorForm.id ? { ...sectorForm } : sec
    );
    setSectors(updatedSectors);
    onSaveMap({ enabled, sectors: updatedSectors, spots, polygons });
    handleDeselect();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Eliminar sector
  const handleDeleteSector = (id: string) => {
    if (!confirm("¿Eliminar esta etiqueta de sector?")) return;
    const updatedSectors = sectors.filter((sec) => sec.id !== id);
    setSectors(updatedSectors);
    if (selectedSectorId === id) handleDeselect();
    onSaveMap({ enabled, sectors: updatedSectors, spots, polygons });
  };

  // Guardar formulario de polígono
  const handleSavePolygonForm = () => {
    if (!polygonForm) return;
    const updatedPolygons = polygons.map((p) =>
      p.id === polygonForm.id ? { ...polygonForm } : p
    );
    setPolygons(updatedPolygons);
    onSaveMap({ enabled, sectors, spots, polygons: updatedPolygons });
    handleDeselect();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Eliminar polígono
  const handleDeletePolygon = (id: string) => {
    if (!confirm("¿Eliminar este elemento poligonal del mapa?")) return;
    const updatedPolygons = polygons.filter((p) => p.id !== id);
    setPolygons(updatedPolygons);
    if (selectedPolygonId === id) handleDeselect();
    onSaveMap({ enabled, sectors, spots, polygons: updatedPolygons });
  };

  // Eliminar un punto específico de un polígono existente
  const handleDeleteVertexFromPolygon = (polyId: string, pointIdx: number) => {
    const target = polygons.find((p) => p.id === polyId);
    if (!target) return;
    if (target.points.length <= 3) {
      alert("Un polígono debe tener al menos 3 puntos.");
      return;
    }
    const updatedPoints = target.points.filter((_, idx) => idx !== pointIdx);
    const updatedPolygons = polygons.map((p) =>
      p.id === polyId ? { ...p, points: updatedPoints } : p
    );
    setPolygons(updatedPolygons);
    if (polygonForm && polygonForm.id === polyId) {
      setPolygonForm({ ...polygonForm, points: updatedPoints });
    }
    onSaveMap({ enabled, sectors, spots, polygons: updatedPolygons });
  };

  // Presets de mesas y livings
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
      width: 90,
      height: 90,
      rotation: 0,
      shape: "circle",
      status: "DISPONIBLE",
    };
    const updatedSpots = [...spots, newSpot];
    setSpots(updatedSpots);
    handleSelectSpot(newSpot);
    onSaveMap({ enabled, sectors, spots: updatedSpots, polygons });
  };

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
      width: 130,
      height: 70,
      rotation: 0,
      shape: "rect",
      status: "DISPONIBLE",
    };
    const updatedSpots = [...spots, newSpot];
    setSpots(updatedSpots);
    handleSelectSpot(newSpot);
    onSaveMap({ enabled, sectors, spots: updatedSpots, polygons });
  };

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
      width: 140,
      height: 75,
      rotation: 0,
      shape: "rect",
      status: "DISPONIBLE",
    };
    const updatedSpots = [...spots, newSpot];
    setSpots(updatedSpots);
    handleSelectSpot(newSpot);
    onSaveMap({ enabled, sectors, spots: updatedSpots, polygons });
  };

  const handleAddSectorLabel = () => {
    const newSec: VenueSectorLabel = {
      id: `sec-${Date.now()}`,
      name: "NUEVO SECTOR",
      x: 50,
      y: 50,
      rotation: 0,
      color: "#ffb5d7",
    };
    const updatedSectors = [...sectors, newSec];
    setSectors(updatedSectors);
    handleSelectSector(newSec);
    onSaveMap({ enabled, sectors: updatedSectors, spots, polygons });
  };

  // Presets de polígonos: Escenario clásico y Pista
  const handleAddStagePreset = () => {
    const newPoly: VenuePolygon = {
      id: `poly-escenario-${Date.now()}`,
      name: "ESCENARIO / CABINA DJ",
      type: "ESCENARIO",
      points: [
        { x: 35, y: 5 },
        { x: 65, y: 5 },
        { x: 72, y: 16 },
        { x: 28, y: 16 },
      ],
      color: "#AF2C75",
      fillColor: "rgba(175, 44, 117, 0.28)",
      closed: true,
    };
    const updated = [...polygons, newPoly];
    setPolygons(updated);
    handleSelectPolygon(newPoly);
    onSaveMap({ enabled, sectors, spots, polygons: updated });
  };

  const handleAddBarraPolygonPreset = () => {
    const newPoly: VenuePolygon = {
      id: `poly-barra-${Date.now()}`,
      name: "BARRA PRINCIPAL",
      type: "BARRA",
      points: [
        { x: 38, y: 86 },
        { x: 62, y: 86 },
        { x: 62, y: 94 },
        { x: 38, y: 94 },
      ],
      color: "#8b5cf6",
      fillColor: "rgba(139, 92, 246, 0.25)",
      closed: true,
    };
    const updated = [...polygons, newPoly];
    setPolygons(updated);
    handleSelectPolygon(newPoly);
    onSaveMap({ enabled, sectors, spots, polygons: updated });
  };

  // Iniciar modo dibujo libre de polígono por puntos
  const handleStartDrawingPolygon = () => {
    handleDeselect();
    setIsDrawingPolygon(true);
    setDrawingPoints([]);
  };

  // Finalizar dibujo de polígono
  const handleFinishDrawingPolygon = () => {
    if (drawingPoints.length < 3) {
      alert("Haz clic en el plano para agregar al menos 3 puntos para armar el elemento.");
      return;
    }
    const newPoly: VenuePolygon = {
      id: `poly-custom-${Date.now()}`,
      name: drawingName.trim() || "ELEMENTO POR PUNTOS",
      type: "CUSTOM",
      points: drawingPoints,
      color: drawingColor,
      fillColor: `${drawingColor}33`,
      closed: true,
    };
    const updated = [...polygons, newPoly];
    setPolygons(updated);
    setIsDrawingPolygon(false);
    setDrawingPoints([]);
    handleSelectPolygon(newPoly);
    onSaveMap({ enabled, sectors, spots, polygons: updated });
  };

  // Cancelar dibujo
  const handleCancelDrawing = () => {
    setIsDrawingPolygon(false);
    setDrawingPoints([]);
  };

  // Clic en el canvas (para agregar puntos cuando isDrawingPolygon está activo)
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingPolygon || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(2, Math.min(98, Math.round(rawX)));
    const clampedY = Math.max(2, Math.min(98, Math.round(rawY)));

    setDrawingPoints((prev) => [...prev, { x: clampedX, y: clampedY }]);
  };

  // Movimiento del mouse en el canvas
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(2, Math.min(98, Math.round(rawX)));
    const clampedY = Math.max(2, Math.min(98, Math.round(rawY)));

    // 1. Arrastre de vértice de polígono
    if (draggingPolygonVertex) {
      setPolygons((prev) =>
        prev.map((poly) => {
          if (poly.id !== draggingPolygonVertex.polygonId) return poly;
          const updatedPoints = [...poly.points];
          updatedPoints[draggingPolygonVertex.pointIdx] = {
            x: clampedX,
            y: clampedY,
          };
          return { ...poly, points: updatedPoints };
        })
      );
      if (polygonForm && polygonForm.id === draggingPolygonVertex.polygonId) {
        setPolygonForm((prev) => {
          if (!prev) return null;
          const updatedPoints = [...prev.points];
          updatedPoints[draggingPolygonVertex.pointIdx] = {
            x: clampedX,
            y: clampedY,
          };
          return { ...prev, points: updatedPoints };
        });
      }
      return;
    }

    // 2. Arrastre de spot o etiqueta de sector
    if (!draggingItem) return;
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
          sec.id === draggingItem.id
            ? { ...sec, x: clampedX, y: clampedY }
            : sec
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
      onSaveMap({ enabled, sectors, spots, polygons });
    }
    if (draggingPolygonVertex) {
      setDraggingPolygonVertex(null);
      onSaveMap({ enabled, sectors, spots, polygons });
    }
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

  // Filtros de spots para la tabla
  const filteredSpots = spots.filter((s) => {
    if (filterStatus === "ALL") return true;
    return s.status === filterStatus;
  });

  // Estadísticas
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
                  Plano del Lugar, Escenarios & Mesas Reservables
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-[#AF2C75]/20 text-[#ffb5d7] border border-[#AF2C75]/40 font-mono">
                    {spots.length} mesas · {polygons.length} escenarios/zonas
                  </span>
                </h3>
                <p className="text-xs text-[#8a8a8a]">
                  Dibuja el escenario por puntos, ajusta el tamaño y rotación de cada mesa o living y organiza el croquis interactivo de {event.title}.
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
                  onSaveMap({ enabled: val, sectors, spots, polygons });
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

      {/* BOTONES DE ACCIÓN RÁPIDA (PRESETS Y DIBUJO POR PUNTOS) */}
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

        {/* ACCIONES DE POLÍGONOS POR PUNTOS */}
        <div className="h-6 w-[1px] bg-[#333] hidden sm:block mx-1" />

        <button
          type="button"
          onClick={handleAddStagePreset}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-[#291322] hover:bg-[#3d1832] text-[#ffb5d7] border border-[#AF2C75]/60 transition-all cursor-pointer"
        >
          <Pentagon className="w-3.5 h-3.5 text-[#AF2C75]" />
          <span>+ Escenario Poligonal</span>
        </button>

        <button
          type="button"
          onClick={handleAddBarraPolygonPreset}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#1a1528] hover:bg-[#261f3b] text-purple-300 border border-purple-800/60 transition-all cursor-pointer"
        >
          <Pentagon className="w-3.5 h-3.5 text-purple-400" />
          <span>+ Barra Poligonal</span>
        </button>

        <button
          type="button"
          onClick={isDrawingPolygon ? handleCancelDrawing : handleStartDrawingPolygon}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            isDrawingPolygon
              ? "bg-rose-950 text-rose-300 border border-rose-600 animate-pulse"
              : "bg-gradient-to-r from-[#AF2C75] to-[#8b5cf6] text-white hover:brightness-110 shadow-lg"
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>{isDrawingPolygon ? "✕ Cancelar Dibujo" : "📐 Dibujar Elemento con Puntos"}</span>
        </button>
      </div>

      {/* BANNER INFORMATIVO EN MODO DIBUJO ACTIVO */}
      {isDrawingPolygon && (
        <div className="rounded-xl bg-gradient-to-r from-[#291322] to-[#1a1528] border-2 border-[#AF2C75] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-[#AF2C75] text-white">
              <PenTool className="w-5 h-5 animate-bounce" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Modo Dibujo por Puntos Activo
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#AF2C75] text-white font-mono">
                  {drawingPoints.length} puntos marcados
                </span>
              </h4>
              <p className="text-xs text-white/70">
                Haz clic en cualquier parte del plano para agregar vértices. Mínimo 3 puntos para cerrar la forma.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={drawingName}
              onChange={(e) => setDrawingName(e.target.value)}
              placeholder="Nombre (ej: ESCENARIO PRINCIPAL)"
              className="bg-[#121212] border border-[#353535] rounded-lg px-2.5 py-1.5 text-xs text-white w-48 focus:outline-none focus:border-[#ffb5d7]"
            />
            {drawingPoints.length > 0 && (
              <button
                type="button"
                onClick={() => setDrawingPoints((prev) => prev.slice(0, -1))}
                className="px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#333] text-xs text-white border border-[#444] flex items-center gap-1 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" /> Deshacer punto
              </button>
            )}
            <button
              type="button"
              onClick={handleFinishDrawingPolygon}
              disabled={drawingPoints.length < 3}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-soft-pink text-[#1c1c1c] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md"
            >
              ✓ Finalizar y Guardar ({drawingPoints.length >= 3 ? "Listo" : "Mín. 3 pts"})
            </button>
          </div>
        </div>
      )}

      {/* PLANO INTERACTIVO Y PANEL DE EDICIÓN LATERAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CANVAS VISUAL */}
        <div
          className={`space-y-2 ${
            spotForm || sectorForm || polygonForm
              ? "lg:col-span-8"
              : "lg:col-span-12"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#8a8a8a] px-1">
            <span className="flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-[#ffb5d7]" />
              Arrastra mesas o sectores para posicionarlos. Haz clic sobre un elemento o escenario para editar su tamaño, rotación y puntos.
            </span>
            <span className="hidden sm:inline font-mono">
              Visualización 100% interactiva
            </span>
          </div>

          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className={`relative w-full aspect-[16/10] sm:aspect-[16/9] bg-[#0f0f0f] border-2 rounded-2xl overflow-hidden shadow-2xl select-none ${
              isDrawingPolygon
                ? "cursor-crosshair border-[#AF2C75] ring-2 ring-[#AF2C75]/40"
                : "border-[#2b2b2b]"
            }`}
            style={{
              backgroundImage: `
                radial-gradient(circle at 50% 15%, rgba(175, 44, 117, 0.22) 0%, transparent 60%),
                radial-gradient(circle at 85% 50%, rgba(234, 179, 8, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 15% 50%, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
                linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
              `,
              backgroundSize:
                "100% 100%, 100% 100%, 100% 100%, 40px 40px, 40px 40px",
            }}
          >
            {/* PISTA DANCEFLOOR CIRCULAR DE FONDO */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-80 h-64 sm:h-80 rounded-full border border-dashed border-white/10 pointer-events-none flex items-center justify-center">
              <span className="text-[11px] uppercase tracking-widest font-bold text-white/10">
                Pista Central
              </span>
            </div>

            {/* CAPA SVG PARA ELEMENTOS POLIGONALES (ESCENARIOS, PISTAS, BARRAS) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="glow-pink" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#ffb5d7" floodOpacity="0.8" />
                </filter>
                <filter id="glow-selected" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ffffff" floodOpacity="0.9" />
                </filter>
              </defs>

              {/* Polígonos guardados */}
              {polygons.map((poly) => {
                const isSelected = selectedPolygonId === poly.id;
                const strokeColor = poly.color || "#AF2C75";
                const fillColor = poly.fillColor || `${strokeColor}33`;
                const center = getPolygonCenter(poly.points);

                return (
                  <g key={poly.id} className="pointer-events-auto">
                    <polygon
                      points={getSvgPointsString(poly.points)}
                      fill={fillColor}
                      stroke={isSelected ? "#ffffff" : strokeColor}
                      strokeWidth={isSelected ? 0.8 : 0.5}
                      strokeDasharray={isSelected ? "1,0.5" : "none"}
                      filter={isSelected ? "url(#glow-selected)" : "none"}
                      className="cursor-pointer transition-all hover:opacity-90"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDrawingPolygon) handleSelectPolygon(poly);
                      }}
                    />

                    {/* Texto del polígono centrado */}
                    <text
                      x={center.x}
                      y={center.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize="2.2"
                      fontWeight="bold"
                      letterSpacing="0.08em"
                      className="pointer-events-none select-none drop-shadow"
                    >
                      {poly.name}
                    </text>
                  </g>
                );
              })}

              {/* Polígono en proceso de dibujo */}
              {isDrawingPolygon && drawingPoints.length > 0 && (
                <g className="pointer-events-none">
                  {drawingPoints.length > 1 && (
                    <polyline
                      points={getSvgPointsString(drawingPoints)}
                      fill="none"
                      stroke={drawingColor}
                      strokeWidth={0.6}
                      strokeDasharray="1,0.5"
                    />
                  )}
                  {drawingPoints.length >= 3 && (
                    <polygon
                      points={getSvgPointsString(drawingPoints)}
                      fill={`${drawingColor}22`}
                      stroke="none"
                    />
                  )}
                </g>
              )}
            </svg>

            {/* VÉRTICES INTERACTIVOS EN MODO DIBUJO O EN POLÍGONO SELECCIONADO */}
            {/* 1. Puntos durante el dibujo activo */}
            {isDrawingPolygon &&
              drawingPoints.map((pt, idx) => (
                <div
                  key={`draw-pt-${idx}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-soft-pink border-2 border-black flex items-center justify-center text-[8px] font-extrabold text-black shadow-lg pointer-events-none z-30 animate-scale"
                  style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                >
                  {idx + 1}
                </div>
              ))}

            {/* 2. Vértices arrastrables del polígono seleccionado */}
            {selectedPolygonId &&
              !isDrawingPolygon &&
              (() => {
                const poly = polygons.find((p) => p.id === selectedPolygonId);
                if (!poly) return null;
                return poly.points.map((pt, idx) => (
                  <div
                    key={`poly-vertex-${poly.id}-${idx}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingPolygonVertex({
                        polygonId: poly.id,
                        pointIdx: idx,
                      });
                    }}
                    title={`Vértice #${idx + 1} (arrastrar para moldear)`}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-[#AF2C75] flex items-center justify-center text-[9px] font-black text-[#AF2C75] shadow-2xl cursor-move z-30 hover:scale-125 transition-transform"
                    style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                  >
                    {idx + 1}
                  </div>
                ));
              })()}

            {/* ETIQUETAS DE SECTOR */}
            {sectors.map((sec) => {
              const isSelected = selectedSectorId === sec.id;
              const rot = sec.rotation || 0;
              return (
                <div
                  key={sec.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (!isDrawingPolygon) {
                      setDraggingItem({ type: "sector", id: sec.id });
                      handleSelectSector(sec);
                    }
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition-all z-20 select-none shadow-md ${
                    isSelected
                      ? "ring-2 ring-white scale-110 shadow-2xl"
                      : "hover:scale-105"
                  }`}
                  style={{
                    left: `${sec.x}%`,
                    top: `${sec.y}%`,
                    transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                    backgroundColor: `${sec.color || "#ffb5d7"}22`,
                    border: `1.5px dashed ${sec.color || "#ffb5d7"}`,
                    color: sec.color || "#ffb5d7",
                  }}
                >
                  {sec.name}
                </div>
              );
            })}

            {/* SPOTS / MESAS / SECTORES VIP (CON TAMAÑO Y ROTACIÓN PERSONALIZABLES) */}
            {spots.map((spot) => {
              const isSelected = selectedSpotId === spot.id;
              const isReserved = spot.status === "RESERVADO";
              const isSold = spot.status === "VENDIDO";
              const isBlocked = spot.status === "BLOQUEADO";

              let statusBg =
                "bg-emerald-950/80 border-emerald-500 text-emerald-200";
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

              const isRect =
                spot.shape === "rect" ||
                spot.type === "LIVING" ||
                spot.type === "SECTOR_VIP";

              // Tamaños por defecto o personalizados en píxeles
              const widthPx = spot.width || (isRect ? 128 : 92);
              const heightPx = spot.height || (isRect ? 68 : 92);
              const rotationDeg = spot.rotation || 0;

              return (
                <div
                  key={spot.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (!isDrawingPolygon) {
                      setDraggingItem({ type: "spot", id: spot.id });
                      handleSelectSpot(spot);
                    }
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center text-center transition-all z-20 shadow-xl ${
                    isRect ? "rounded-xl border-2 p-1.5" : "rounded-full border-2 p-1"
                  } ${statusBg} ${
                    isSelected
                      ? "ring-4 ring-[#ffb5d7] shadow-2xl z-30"
                      : "hover:brightness-110"
                  }`}
                  style={{
                    left: `${spot.x}%`,
                    top: `${spot.y}%`,
                    width: `${widthPx}px`,
                    height: `${heightPx}px`,
                    transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
                  }}
                >
                  <span className="text-[11px] font-bold truncate max-w-[92%] leading-tight text-white drop-shadow">
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
                    <span className="text-[8px] text-white/70 truncate max-w-[95%] mt-0.5 hidden sm:inline">
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
        {(spotForm || sectorForm || polygonForm) && (
          <div className="lg:col-span-4 rounded-xl bg-[#181818] border border-[#2e2e2e] p-5 space-y-4 shadow-2xl">
            {/* 1. EDICIÓN DE SPOT / MESA (TAMAÑO, ROTACIÓN, PRECIO, ETC.) */}
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

                  {/* SECCIÓN NUEVA: TAMAÑO Y DIMENSIONES */}
                  <div className="p-3 rounded-lg bg-[#121212] border border-[#2e2e2e] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#ffb5d7] uppercase tracking-wider flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Tamaño de la Mesa / Lugar (px)</span>
                      </label>
                      <span className="text-[10px] font-mono text-white/70">
                        {spotForm.width || (spotForm.shape === "rect" ? 128 : 92)} ×{" "}
                        {spotForm.height || (spotForm.shape === "rect" ? 68 : 92)} px
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-[#8a8a8a] block mb-0.5">
                          Ancho ({spotForm.width || (spotForm.shape === "rect" ? 128 : 92)}px)
                        </span>
                        <input
                          type="range"
                          min="50"
                          max="260"
                          step="5"
                          value={
                            spotForm.width || (spotForm.shape === "rect" ? 128 : 92)
                          }
                          onChange={(e) => {
                            const newW = parseInt(e.target.value);
                            // Si es circular, podemos mantener proporción uniforme
                            setSpotForm({
                              ...spotForm,
                              width: newW,
                              height:
                                spotForm.shape === "circle" ? newW : spotForm.height,
                            });
                          }}
                          className="w-full accent-[#ffb5d7] cursor-pointer"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-[#8a8a8a] block mb-0.5">
                          Alto ({spotForm.height || (spotForm.shape === "rect" ? 68 : 92)}px)
                        </span>
                        <input
                          type="range"
                          min="40"
                          max="260"
                          step="5"
                          value={
                            spotForm.height || (spotForm.shape === "rect" ? 68 : 92)
                          }
                          onChange={(e) => {
                            const newH = parseInt(e.target.value);
                            setSpotForm({
                              ...spotForm,
                              height: newH,
                              width:
                                spotForm.shape === "circle" ? newH : spotForm.width,
                            });
                          }}
                          className="w-full accent-[#ffb5d7] cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Presets rápidos de tamaño */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {[
                        { label: "S (Chica)", w: 70, h: 70 },
                        { label: "M (Normal)", w: 92, h: 92 },
                        { label: "L (Grande)", w: 125, h: 125 },
                        { label: "XL (Mega)", w: 160, h: 160 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            const isR = spotForm.shape === "rect";
                            setSpotForm({
                              ...spotForm,
                              width: isR ? Math.round(preset.w * 1.3) : preset.w,
                              height: isR ? Math.round(preset.h * 0.75) : preset.h,
                            });
                          }}
                          className="flex-1 py-1 rounded bg-[#222] hover:bg-[#333] text-[10px] text-white/80 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SECCIÓN NUEVA: ROTACIÓN DEL ELEMENTO */}
                  <div className="p-3 rounded-lg bg-[#121212] border border-[#2e2e2e] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#ffb5d7] uppercase tracking-wider flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5" />
                        <span>Rotación del Elemento</span>
                      </label>
                      <span className="text-[11px] font-mono font-bold text-white">
                        {spotForm.rotation || 0}°
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={spotForm.rotation || 0}
                      onChange={(e) =>
                        setSpotForm({
                          ...spotForm,
                          rotation: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full accent-[#ffb5d7] cursor-pointer"
                    />

                    {/* Botones de giro rápido */}
                    <div className="grid grid-cols-5 gap-1 pt-1">
                      {[
                        { label: "-45°", delta: -45 },
                        { label: "-15°", delta: -15 },
                        { label: "+15°", delta: 15 },
                        { label: "+45°", delta: 45 },
                        { label: "0° (Reset)", set: 0 },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={() => {
                            if (btn.set !== undefined) {
                              setSpotForm({ ...spotForm, rotation: btn.set });
                            } else {
                              const curr = spotForm.rotation || 0;
                              const next = (curr + (btn.delta || 0) + 360) % 360;
                              setSpotForm({ ...spotForm, rotation: next });
                            }
                          }}
                          className="py-1 rounded bg-[#222] hover:bg-[#333] text-[10px] font-mono text-white/90 transition-colors"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
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
                      <strong>Reservado por:</strong>{" "}
                      {spotForm.reservedByName || "Comprador"} (Orden:{" "}
                      {spotForm.reservedByOrderCode})
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

            {/* 2. EDICIÓN DE POLÍGONO / ESCENARIO CON PUNTOS */}
            {polygonForm && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
                  <div className="flex items-center gap-2">
                    <Pentagon className="w-4 h-4 text-[#ffb5d7]" />
                    <h4 className="text-sm font-bold text-white">
                      Editar Elemento / Escenario
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
                      Nombre del Elemento
                    </label>
                    <input
                      type="text"
                      value={polygonForm.name}
                      onChange={(e) =>
                        setPolygonForm({ ...polygonForm, name: e.target.value })
                      }
                      placeholder="Ej: ESCENARIO PRINCIPAL, CABINA DJ"
                      className="w-full bg-[#121212] border border-[#353535] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ffb5d7]"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-[#121212] border border-[#2e2e2e] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#ffb5d7] uppercase tracking-wider">
                        Vértices del Polígono ({polygonForm.points.length} puntos)
                      </span>
                      <span className="text-[10px] text-white/50">
                        Arrastra los números en el mapa
                      </span>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {polygonForm.points.map((pt, idx) => (
                        <div
                          key={`form-pt-${idx}`}
                          className="flex items-center justify-between gap-2 p-1.5 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-xs font-mono"
                        >
                          <span className="text-[#ffb5d7] font-bold">
                            #{idx + 1}:
                          </span>
                          <span className="text-white/80">
                            X: {pt.x}% · Y: {pt.y}%
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteVertexFromPolygon(polygonForm.id, idx)
                            }
                            disabled={polygonForm.points.length <= 3}
                            className="p-1 rounded text-rose-400 hover:text-white hover:bg-rose-950 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Eliminar este punto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider block mb-1">
                      Color del Elemento
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {SECTOR_COLOR_OPTIONS.map((col) => (
                        <button
                          key={col.value}
                          type="button"
                          onClick={() =>
                            setPolygonForm({
                              ...polygonForm,
                              color: col.value,
                              fillColor: `${col.value}33`,
                            })
                          }
                          className={`h-8 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center ${
                            polygonForm.color === col.value
                              ? "border-white scale-105"
                              : "border-transparent opacity-75 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: col.value }}
                          title={col.label}
                        >
                          {polygonForm.color === col.value && (
                            <Check className="w-4 h-4 text-white drop-shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSavePolygonForm}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-soft-pink text-[#1c1c1c] hover:bg-white transition-colors cursor-pointer"
                    >
                      Guardar Elemento
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePolygon(polygonForm.id)}
                      className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 transition-colors cursor-pointer"
                      title="Eliminar del plano"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. EDICIÓN DE SECTOR LABEL (CON ROTACIÓN) */}
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

                  {/* ROTACIÓN DE LA ETIQUETA */}
                  <div className="p-3 rounded-lg bg-[#121212] border border-[#2e2e2e] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#ffb5d7] uppercase tracking-wider flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Rotación de la Etiqueta</span>
                      </label>
                      <span className="text-[11px] font-mono font-bold text-white">
                        {sectorForm.rotation || 0}°
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={sectorForm.rotation || 0}
                      onChange={(e) =>
                        setSectorForm({
                          ...sectorForm,
                          rotation: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full accent-[#ffb5d7] cursor-pointer"
                    />

                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: "-45°", delta: -45 },
                        { label: "+45°", delta: 45 },
                        { label: "90°", set: 90 },
                        { label: "0° Reset", set: 0 },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={() => {
                            if (btn.set !== undefined) {
                              setSectorForm({ ...sectorForm, rotation: btn.set });
                            } else {
                              const curr = sectorForm.rotation || 0;
                              const next = (curr + (btn.delta || 0) + 360) % 360;
                              setSectorForm({ ...sectorForm, rotation: next });
                            }
                          }}
                          className="py-1 rounded bg-[#222] hover:bg-[#333] text-[10px] font-mono text-white/90"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
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

      {/* TABLA Y LISTADO DETALLADO DE MESAS Y LUGARES */}
      <div className="rounded-xl bg-[#181818] border border-[#2e2e2e] p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2a2a2a] pb-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#ffb5d7]" />
              Listado de Mesas y Lugares Destacados
            </h4>
            <p className="text-xs text-[#8a8a8a]">
              Gestión individual de precios, dimensiones, accesos emitidos y beneficios para este evento.
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
                  <th className="py-2.5 px-3">Dimensiones / Giro</th>
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
                    <td className="py-3 px-3 text-[#b0b0b0] font-mono text-[11px]">
                      {spot.width || (spot.shape === "rect" ? 128 : 92)}×
                      {spot.height || (spot.shape === "rect" ? 68 : 92)}px
                      {spot.rotation ? ` · ${spot.rotation}°` : ""}
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
