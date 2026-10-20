"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, X } from "lucide-react";

export function Mas30LogoBadge({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims =
    size === "sm"
      ? "h-9 px-2.5"
      : size === "lg"
      ? "h-16 px-4"
      : "h-11 px-3";

  return (
    <div
      className={`inline-flex items-center justify-center rounded-[3px] bg-[#f6f3ec] overflow-hidden ${dims}`}
    >
      <img
        src="/logo-mas30.png"
        alt="MAS30"
        className="h-full w-auto object-contain scale-150"
      />
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const nearBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 160;
      setIsFooterVisible(nearBottom);
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const menuLinks = [
    { id: 1, text: "EVENTOS", url: "/" },
    { id: 2, text: "MIS ENTRADAS QR", url: "/mi-entrada/MAS30-8492" },
    { id: 3, text: "LECTOR QR PUERTA", url: "/admin/scanner" },
    { id: 4, text: "PANEL ADMIN", url: "/admin" },
    { id: 5, text: "CONTACTO", url: "/#contacto" },
  ];

  const handleDockSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    if (q.toUpperCase().startsWith("MAS30-") || q.toUpperCase().startsWith("M30-")) {
      router.push(`/mi-entrada/${q.toUpperCase()}`);
    } else {
      router.push(`/?search=${encodeURIComponent(q)}#listado`);
    }
    setSearchOpen(false);
  };

  return (
    <>
      {/* FULLSCREEN OVERLAY MENU ESTILO BRESH */}
      {menuOpen && (
        <div className="fixed inset-0 bg-[#da0078] z-[70] overflow-y-auto flex flex-col animate-in fade-in duration-300">
          <div className="flex-1 flex flex-col relative min-h-screen">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="absolute left-1/2 -translate-x-1/2 mx-auto top-10"
            >
              <div className="w-36 h-14 bg-[#f6f3ec] rounded-[3px] flex items-center justify-center overflow-hidden shadow-md">
                <img
                  src="/logo-mas30.png"
                  alt="MAS30"
                  className="h-full w-auto object-contain scale-150"
                />
              </div>
            </Link>

            <div className="flex-1 flex flex-col items-center justify-center pt-32 pb-20 space-y-2 lg:-space-y-3 px-4">
              {menuLinks.map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  onClick={() => setMenuOpen(false)}
                  className="text-white text-4xl sm:text-6xl leading-tight lg:text-[7.5vw] font-normal uppercase text-center opacity-75 hover:opacity-100 transition duration-300"
                >
                  {item.text}
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="fixed top-10 right-6 bg-[#1e1e1e] p-3 rounded-full cursor-pointer hover:brightness-110"
              aria-label="Cerrar menú"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* BARRA FLOTANTE INFERIOR (EXACTA A BRESH.COM) */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-full md:max-w-[560px] max-w-[95vw] h-[66px] bg-[#151616] flex items-center justify-between p-2.5 rounded-[5px] z-50 shadow-[0_10px_35px_rgba(0,0,0,0.85)] border border-white/5 transition-all duration-300 ${
          isFooterVisible
            ? "opacity-0 pointer-events-none translate-y-6"
            : "opacity-100 translate-y-0"
        }`}
      >
        <div className="flex items-center gap-2 w-full justify-between">
          {/* Logo en esquina izquierda del dock */}
          <Link
            href="/"
            className="hidden sm:flex w-16 h-[46px] bg-[#f6f3ec] rounded-[3px] items-center justify-center overflow-hidden shrink-0"
          >
            <img
              src="/logo-mas30.png"
              alt="MAS30"
              className="w-full h-full object-contain scale-150"
            />
          </Link>

          {!searchOpen && (
            <>
              <Link
                href="/admin"
                className="text-white/55 hover:text-white text-sm hidden md:flex px-2.5 h-[46px] items-center justify-center transition-colors"
              >
                Admin
              </Link>

              <Link
                href="/admin/scanner"
                className="text-white/55 hover:text-white text-sm hidden md:flex px-2.5 h-[46px] items-center justify-center transition-colors whitespace-nowrap"
              >
                Lector QR
              </Link>

              <Link
                href="/mi-entrada/MAS30-8492"
                className="whitespace-nowrap bg-[#1e1e1e] text-sm text-[#ffffff] px-3.5 h-[46px] rounded-[3px] border border-[#da0078] flex justify-center items-center hover:bg-[#252525] transition-colors"
              >
                Mis QR
              </Link>
            </>
          )}

          {searchOpen ? (
            <form onSubmit={handleDockSearch} className="flex-1 flex">
              <div className="bg-gray-100/20 rounded-sm flex-1 flex items-center px-3 h-[46px]">
                <Search className="w-4 h-4 text-white mr-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Buscar fiesta o código MAS30-8492..."
                  className="bg-transparent text-white text-sm w-full py-2 focus:outline-none placeholder:text-white/60"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => setSearchValue("")}
                    className="p-1"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            </form>
          ) : (
            <Link
              href="/#listado"
              className="whitespace-nowrap bg-[#da0078] hover:bg-[#da0078]/90 text-[#ffffff] flex-1 md:flex-none md:w-[116px] h-[46px] p-[15px] rounded-[3px] text-center flex items-center justify-center text-sm font-medium transition-colors"
            >
              Eventos
            </Link>
          )}

          {/* Botón Lupa */}
          <button
            type="button"
            onClick={() => {
              setSearchOpen(!searchOpen);
              if (searchOpen) setSearchValue("");
            }}
            className="bg-[#1e1e1e] hover:bg-[#282828] p-3 rounded-[3px] h-[46px] w-[46px] flex justify-center items-center cursor-pointer shrink-0 transition-colors"
            aria-label="Buscar"
          >
            {searchOpen ? (
              <X className="w-4 h-4 text-white" />
            ) : (
              <Search className="w-4 h-4 text-white" />
            )}
          </button>

          {/* Botón Menú Hamburguesa */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="bg-[#1e1e1e] hover:bg-[#282828] p-3 rounded-[3px] cursor-pointer h-[46px] w-[46px] flex justify-center items-center shrink-0 transition-colors"
            aria-label="Menú"
          >
            <Menu className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </>
  );
}
