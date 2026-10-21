"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Globe,
  Instagram,
  MessageCircle,
  Search,
  Share2,
} from "lucide-react";
import {
  createInquiry,
  getBankSettings,
  getPublicEvents,
  INITIAL_EVENTS,
  INITIAL_SETTINGS,
  trackVisit,
} from "@/lib/store";
import { BankSettings, EventItem } from "@/lib/types";
import BreshPosterArt from "@/components/BreshPosterArt";
import BreshEventModal from "@/components/BreshEventModal";

export default function HomePage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [bank, setBank] = useState<BankSettings>(INITIAL_SETTINGS);
  const [sharedEventId, setSharedEventId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [topTab, setTopTab] = useState<"TODOS" | "CERCA" | "FIESTAS">("TODOS");
  const [categoryFilter, setCategoryFilter] = useState<
    "TODOS" | "Fiestas" | "Festivales"
  >("TODOS");
  const [cityFilter, setCityFilter] = useState<string>("Filtrar");
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModalEvent, setSelectedModalEvent] =
    useState<EventItem | null>(null);

  // Contacto rápido en el bloque inferior
  const [contactOpen, setContactOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cMessage, setCMessage] = useState("");
  const [cSent, setCSent] = useState(false);
  const [qrLookupCode, setQrLookupCode] = useState("");

  useEffect(() => {
    const sync = () => {
      setEvents(getPublicEvents());
      setBank(getBankSettings());
    };
    sync();
    trackVisit("site");
    // Re-verifica cada 15s por si un evento programado alcanza su fecha/hora de lanzamiento automático
    const launchTimer = setInterval(sync, 15000);
    window.addEventListener("mas30-store-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(launchTimer);
      window.removeEventListener("mas30-store-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Autoplay del carrusel Coverflow (cada 3.5s igual que Bresh)
  useEffect(() => {
    if (events.length <= 1 || selectedModalEvent) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % events.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [events.length, selectedModalEvent]);

  const cities = useMemo(() => {
    const unique = Array.from(new Set(events.map((e) => e.venueCity)));
    return ["Filtrar", ...unique];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchCat =
        categoryFilter === "TODOS" || ev.category === categoryFilter;
      const matchCity =
        cityFilter === "Filtrar" || ev.venueCity === cityFilter;
      const q = searchQuery
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      const matchSearch =
        !q ||
        normalize(ev.title).includes(q) ||
        normalize(ev.venueName).includes(q) ||
        normalize(ev.venueCity).includes(q) ||
        normalize(ev.subtitle).includes(q);
      return matchCat && matchCity && matchSearch;
    });
  }, [events, categoryFilter, cityFilter, searchQuery]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim() || !cMessage.trim()) return;
    await createInquiry({
      type: "CONTACTO_GENERAL",
      name: cName,
      email: cEmail,
      phone: cPhone,
      subject: "Contacto Web MAS30",
      message: cMessage,
    });
    setCSent(true);
    setCName("");
    setCEmail("");
    setCPhone("");
    setCMessage("");
  };

  return (
    <main className="bg-dark-background text-white">
      {/* 1. CABECERA "Eventos" + PESTAÑAS RECTANGULARES (IDÉNTICO A BRESH.COM/EVENTS) */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 container py-12">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl md:text-5xl font-normal tracking-tight">
            Eventos
          </h1>
        </div>

        <nav className="flex gap-3 overflow-x-auto scrollbar-hide whitespace-nowrap -mx-4 px-4 md:mx-0 md:px-0">
          <button
            type="button"
            onClick={() => {
              setTopTab("TODOS");
              setCategoryFilter("TODOS");
            }}
            className={`text-lg lg:text-sm transition-colors px-4 py-2 rounded-sm block cursor-pointer ${
              topTab === "TODOS"
                ? "bg-white text-black"
                : "bg-[#3F3F3F] text-white/40 hover:text-white/70"
            }`}
          >
            Todos
          </button>
          <a
            href="#nearYou"
            onClick={() => setTopTab("CERCA")}
            className={`text-lg lg:text-sm transition-colors px-4 py-2 rounded-sm block ${
              topTab === "CERCA"
                ? "bg-white text-black"
                : "bg-[#3F3F3F] text-white/40 hover:text-white/70"
            }`}
          >
            Eventos cerca de ti
          </a>
          <button
            type="button"
            onClick={() => {
              setTopTab("FIESTAS");
              setCategoryFilter("Fiestas");
              document
                .getElementById("listado")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`text-lg lg:text-sm transition-colors px-4 py-2 rounded-sm block cursor-pointer ${
              topTab === "FIESTAS"
                ? "bg-white text-black"
                : "bg-[#3F3F3F] text-white/40 hover:text-white/70"
            }`}
          >
            Fiestas
          </button>
        </nav>
      </section>

      {/* 2. CARRUSEL COVERFLOW 3D DE EVENTOS DESTACADOS (#nearYou) */}
      <div className="md:container !max-w-[1284px] mx-auto" id="nearYou">
        <div className="relative w-full h-[560px] md:h-[680px] flex flex-col items-center justify-center overflow-hidden">
          <div className="relative w-full h-[500px] md:h-[610px] flex items-center justify-center">
            {events.map((event, index) => {
              const total = events.length;
              let offset = index - activeIndex;
              if (offset > total / 2) offset -= total;
              if (offset < -total / 2) offset += total;

              const absOffset = Math.abs(offset);
              if (absOffset > 2) return null;

              const isActive = offset === 0;
              const translateX = offset * 270;
              const scale = isActive ? 1 : absOffset === 1 ? 0.86 : 0.74;
              const zIndex = 30 - absOffset * 10;
              const opacity = isActive ? 1 : absOffset === 1 ? 0.85 : 0.5;

              return (
                <div
                  key={event.id}
                  onClick={() => {
                    if (isActive) {
                      setSelectedModalEvent(event);
                    } else {
                      setActiveIndex(index);
                    }
                  }}
                  style={{
                    transform: `translateX(${translateX}px) scale(${scale})`,
                    zIndex,
                    opacity,
                  }}
                  className={`${
                    isActive ? "bg-[#353535]" : "bg-[#1C1C1C]"
                  } w-[90vw] max-w-[443px] h-[496px] md:h-[603px] rounded-lg overflow-hidden absolute transition-all duration-700 ease-out p-[20px] md:p-[30px] flex flex-col cursor-pointer group shadow-[0_25px_60px_rgba(0,0,0,0.75)]`}
                >
                  <div className="relative aspect-square w-full overflow-hidden">
                    <BreshPosterArt event={event} variant="square" />
                  </div>

                  <div className="py-4 flex flex-col justify-between gap-2 flex-1">
                    <div className="space-y-1.5">
                      <h3 className="text-2xl md:text-3xl truncate font-normal text-white">
                        {event.title}
                      </h3>
                      <p className="text-sm md:text-base text-[#eee]">
                        {event.dateLabel}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedModalEvent(event);
                      }}
                      className="cursor-pointer hover:brightness-90 transition-all bg-soft-pink text-[#1c1c1c] h-[46px] min-w-[126px] w-fit px-4 rounded-[3px] font-medium mt-2 inline-block"
                    >
                      Tickets
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginación de puntos estilo Swiper Bresh */}
          <div className="flex items-center justify-center gap-2.5 mt-4 z-30">
            {events.map((ev, idx) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Ir a slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === activeIndex
                    ? "w-6 bg-[#ffb5d7]"
                    : "w-2 bg-white/30 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 3. LISTADO "Eventos de MAS30" + BARRA DE FILTROS + GRILLA DE 3 COLUMNAS */}
      <div
        id="listado"
        className="min-h-screen bg-dark-background text-white container py-12"
      >
        <div className="flex flex-col md:flex-row gap-4 md:gap-12 justify-between items-center py-4">
          <h2 className="text-2xl font-medium self-start md:self-auto">
            Eventos de MAS30
          </h2>

          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            {/* Buscador exacto a Bresh (bg-gray-100/20 rounded-md) */}
            <div className="relative p-2 bg-gray-100/20 text-white rounded-md w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Encuentra tu fiesta"
                className="flex h-7 w-full md:w-52 rounded-md bg-transparent pl-8 pr-2 py-1 text-sm outline-none placeholder:text-[#A1A199] text-white"
              />
            </div>

            {/* Botones Fiestas / Festivales */}
            <button
              type="button"
              onClick={() =>
                setCategoryFilter(
                  categoryFilter === "Fiestas" ? "TODOS" : "Fiestas"
                )
              }
              className={`text-lg lg:text-sm transition-colors px-4 py-2 rounded-sm block cursor-pointer ${
                categoryFilter === "Fiestas" || categoryFilter === "TODOS"
                  ? "bg-white text-black"
                  : "bg-[#3F3F3F] text-white/40"
              }`}
            >
              Fiestas
            </button>

            <button
              type="button"
              onClick={() =>
                setCategoryFilter(
                  categoryFilter === "Festivales" ? "TODOS" : "Festivales"
                )
              }
              className={`text-lg lg:text-sm transition-colors px-4 py-2 rounded-sm block cursor-pointer ${
                categoryFilter === "Festivales"
                  ? "bg-white text-black"
                  : "bg-[#3F3F3F] text-white/40"
              }`}
            >
              Festivales
            </button>

            {/* Dropdown Filtrar por Ciudad (border-[#353535]) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                className="flex items-center gap-2 bg-transparent text-white px-3 py-2 rounded-md border border-[#353535] hover:bg-[#252525] transition-colors text-sm cursor-pointer"
              >
                <Globe className="w-4 h-4 text-white/80" />
                {cityFilter}
                <ChevronDown className="w-4 h-4" />
              </button>

              {cityDropdownOpen && (
                <div className="absolute right-0 mt-1 bg-[#252525] border border-[#353535] text-white rounded-md min-w-[180px] z-40 shadow-xl py-1">
                  {cities.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCityFilter(c);
                        setCityDropdownOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#353535] cursor-pointer"
                    >
                      {c === "Filtrar" ? "Todas las ciudades" : c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GRILLA DE 3 COLUMNAS DE TARJETAS #1c1c1c (ALTURA 580PX EN DESKTOP) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 py-4">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => setSelectedModalEvent(event)}
              className="bg-[#1c1c1c] rounded-lg overflow-hidden lg:h-[580px] flex flex-col cursor-pointer group hover:bg-[#232323] transition-colors"
            >
              <div className="relative w-full h-[280px] lg:h-[377px] overflow-hidden">
                <BreshPosterArt event={event} variant="square" />
              </div>

              <div className="p-[30px] flex flex-col justify-between flex-1">
                <div className="space-y-2 mb-4 lg:mb-0">
                  <h3 className="font-normal text-2xl text-white">
                    {event.title}
                  </h3>
                  <p className="text-base text-[#8a8a8a]">{event.dateLabel}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedModalEvent(event);
                    }}
                    className="bg-soft-pink hover:brightness-90 transition-all text-[#1c1c1c] py-2 px-4 rounded-[3px] w-fit font-medium cursor-pointer"
                  >
                    Tickets
                  </button>

                  {/* Botones de Acción Rápida: WhatsApp Organizador, Redes Sociales y Compartir */}
                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={`https://wa.me/${(
                        event.organizerWhatsapp || bank.whatsappSupport
                      ).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                        `¡Hola MAS30! Quiero consultar o comprar tickets para el evento *${event.title}* (${event.dateLabel}).`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => trackVisit("whatsapp_click", event.id)}
                      title="WhatsApp del Organizador (Consultas y compra de tickets)"
                      className="p-2 rounded-[3px] bg-[#2a2a2a] hover:bg-[#353535] text-[#ffb5d7] transition-colors flex items-center gap-1 text-xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>

                    <a
                      href={
                        event.instagramUrl ||
                        "https://instagram.com/mas30.eventos"
                      }
                      target="_blank"
                      rel="noreferrer"
                      title="Redes Sociales del Evento"
                      className="p-2 rounded-[3px] bg-[#2a2a2a] hover:bg-[#353535] text-white/80 hover:text-white transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={async () => {
                        const shareUrl = `${window.location.origin}/eventos/${event.slug}`;
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: `MAS30 · ${event.title}`,
                              text: `${event.title} (${event.dateLabel}) en MAS30`,
                              url: shareUrl,
                            });
                            return;
                          } catch {
                            // fallback copy
                          }
                        }
                        navigator.clipboard.writeText(shareUrl);
                        setSharedEventId(event.id);
                        setTimeout(() => setSharedEventId(null), 2000);
                      }}
                      title="Compartir Evento"
                      className="p-2 rounded-[3px] bg-[#2a2a2a] hover:bg-[#353535] text-white/80 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                    >
                      <Share2 className="w-4 h-4" />
                      {sharedEventId === event.id && (
                        <span className="text-[11px] text-[#ffb5d7]">
                          ¡Copiado!
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. SECCIÓN CTA CON FONDO DE FIESTA (ESTILO "UNIRME A BRESH CLUB" + BUSCADOR QR Y CONTACTO) */}
      <section
        id="contacto"
        className="flex flex-col relative py-20 overflow-hidden"
      >
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=2000&q=80"
            alt="MAS30 Crowd"
            className="w-full h-full object-cover brightness-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#121212] via-transparent to-[#121212]" />
        </div>

        <div className="container relative z-10 flex-1 flex flex-col items-center justify-center text-center space-y-6">
          {/* Emblema Central MAS30 */}
          <div className="w-64 sm:w-80 h-36 sm:h-44 rounded-md bg-[#f6f3ec] shadow-2xl flex items-center justify-center overflow-hidden">
            <img
              src="/logo-mas30.png"
              alt="MAS30 Club"
              className="w-full h-full object-contain scale-125"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setContactOpen(!contactOpen)}
              className="bg-bresh text-white rounded-[3px] font-medium py-[13px] px-[26px] min-w-[217px] h-[46px] cursor-pointer hover:brightness-90 transition-all text-sm"
            >
              {contactOpen
                ? "Cerrar Formulario"
                : "Cumpleaños VIP & Contacto"}
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (qrLookupCode.trim()) {
                  router.push(
                    `/mi-entrada/${qrLookupCode.trim().toUpperCase()}`
                  );
                }
              }}
              className="flex items-center bg-[#151616]/95 p-1 rounded-[3px] border border-white/15 h-[46px]"
            >
              <input
                type="text"
                value={qrLookupCode}
                onChange={(e) => setQrLookupCode(e.target.value)}
                placeholder="Código de orden (MAS30-8492)"
                className="bg-transparent px-3 text-sm text-white placeholder:text-white/50 focus:outline-none w-52"
              />
              <button
                type="submit"
                className="bg-soft-pink text-[#1c1c1c] font-medium text-xs px-3.5 h-full rounded-[2px] cursor-pointer"
              >
                Mis QR
              </button>
            </form>
          </div>

          {/* Formulario de Contacto Desplegable Estilo Bresh */}
          {contactOpen && (
            <div className="w-full max-w-xl bg-[#1c1c1c] p-6 sm:p-8 rounded-lg border border-[#353535] text-left space-y-4 mt-4">
              <h3 className="text-xl font-medium text-white">
                Escribinos a MAS30
              </h3>
              {cSent ? (
                <div className="p-4 rounded bg-[#252525] text-sm text-[#ffb5d7]">
                  ✓ Tu mensaje fue recibido en el Panel de Administración.
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder="Nombre y Apellido *"
                      className="px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white"
                    />
                    <input
                      type="text"
                      required
                      value={cPhone}
                      onChange={(e) => setCPhone(e.target.value)}
                      placeholder="WhatsApp *"
                      className="px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white"
                    />
                  </div>
                  <input
                    type="email"
                    required
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    placeholder="Email *"
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white"
                  />
                  <textarea
                    rows={3}
                    required
                    value={cMessage}
                    onChange={(e) => setCMessage(e.target.value)}
                    placeholder="Consulta por mesas VIP, festejos de cumpleaños +30 o eventos..."
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#121212] border border-[#353535] text-sm text-white"
                  />
                  <button
                    type="submit"
                    className="bg-soft-pink text-[#1c1c1c] font-medium px-6 py-2.5 rounded-[3px] text-sm cursor-pointer"
                  >
                    Enviar Mensaje
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </section>

      {/* MODAL DE EVENTO ESTILO BRESH AL HACER CLIC EN CUALQUIER TARJETA */}
      <BreshEventModal
        event={selectedModalEvent}
        onClose={() => setSelectedModalEvent(null)}
      />
    </main>
  );
}
