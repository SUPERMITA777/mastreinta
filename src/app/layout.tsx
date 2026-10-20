import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Navbar from "@/components/Navbar";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MAS30 | Eventos",
  description:
    "Eventos oficiales de MAS30. La fiesta más linda para mayores de 30 años. Entradas con acceso QR individual.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${poppins.className} min-h-screen flex flex-col bg-dark-background text-white antialiased selection:bg-[#da0078] selection:text-white`}
      >
        <main className="flex-1">{children}</main>

        {/* FOOTER IDÉNTICO AL DE BRESH.COM/EVENTS */}
        <footer className="relative flex flex-col lg:pt-36 pt-48 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=2200&q=80"
              alt="Concert background"
              className="w-full h-full object-cover brightness-[0.35]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-[#121212]" />
          </div>

          <div className="relative z-10 flex flex-col justify-between min-h-[70vh]">
            <nav className="-mt-28 lg:-mt-16 pb-8 flex flex-col lg:flex-row justify-between container flex-1 lg:flex-none gap-10">
              <div className="grid grid-cols-2 lg:gap-x-24 text-white">
                <div className="space-y-4">
                  <Link
                    href="/"
                    className="block text-lg hover:opacity-80 transition-opacity"
                  >
                    Eventos
                  </Link>
                  <Link
                    href="/mi-entrada/MAS30-8492"
                    className="block text-lg hover:opacity-80 transition-opacity"
                  >
                    Mis Entradas QR
                  </Link>
                  <Link
                    href="/admin/scanner"
                    className="block text-lg hover:opacity-80 transition-opacity"
                  >
                    Lector QR Puerta
                  </Link>
                </div>

                <div className="space-y-4">
                  <Link
                    href="/admin"
                    className="block text-lg hover:opacity-80 transition-opacity"
                  >
                    Administración
                  </Link>
                  <Link
                    href="/#contacto"
                    className="block text-lg hover:opacity-80 transition-opacity"
                  >
                    Contacto
                  </Link>
                  <Link
                    href="/mi-entrada/MAS30-9104"
                    className="block text-lg hover:opacity-80 transition-opacity"
                  >
                    Estado de Transferencia
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 text-white text-sm mt-auto self-center lg:self-auto">
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  INSTAGRAM
                </a>
                <a
                  href="https://www.tiktok.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  TIKTOK
                </a>
                <a
                  href="https://open.spotify.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  SPOTIFY
                </a>
                <a
                  href="https://x.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  X
                </a>
                <a
                  href="https://www.youtube.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  YOUTUBE
                </a>
              </div>
            </nav>

            <nav className="py-8 text-white text-sm border-t border-white/20">
              <div className="container flex justify-between">
                <div className="grid grid-cols-2 text-center lg:text-left items-center justify-center gap-8 lg:flex lg:gap-24 w-full">
                  <p className="lg:flex-1">
                    ©FIESTA MAS30, {new Date().getFullYear()}
                  </p>
                  <Link
                    href="/#contacto"
                    className="hover:opacity-80 transition-opacity uppercase"
                  >
                    Política legal
                  </Link>
                  <Link
                    href="/#contacto"
                    className="hover:opacity-80 transition-opacity uppercase"
                  >
                    Política de cookies
                  </Link>
                  <Link
                    href="/#contacto"
                    className="hover:opacity-80 transition-opacity uppercase"
                  >
                    Política de privacidad
                  </Link>
                </div>
              </div>
            </nav>
          </div>
        </footer>

        {/* Barra flotante inferior + Menú pantalla completa estilo Bresh */}
        <Navbar />
      </body>
    </html>
  );
}
