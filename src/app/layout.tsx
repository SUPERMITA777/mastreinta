import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { readCloudState } from "@/lib/cloudState.server";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

// Los metadatos se regeneran al guardar desde el admin (revalidatePath) o cada 60s
export const revalidate = 60;

const DEFAULT_TITLE = "MAS30 | Eventos";
const DEFAULT_DESCRIPTION =
  "Eventos oficiales de MAS30. La fiesta más linda para mayores de 30 años. Entradas con acceso QR individual.";

export async function generateMetadata(): Promise<Metadata> {
  const state = await readCloudState();
  const settings = (state?.settings || {}) as {
    shareTitle?: string;
    shareDescription?: string;
    shareImageUrl?: string;
  };

  const title = settings.shareTitle?.trim() || DEFAULT_TITLE;
  const description = settings.shareDescription?.trim() || DEFAULT_DESCRIPTION;
  const image = settings.shareImageUrl?.trim();
  const images = image ? [{ url: image }] : undefined;

  return {
    metadataBase: new URL("https://mastreinta.vercel.app"),
    title,
    description,
    openGraph: {
      type: "website",
      url: "/",
      siteName: title,
      title,
      description,
      locale: "es_AR",
      images,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

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

        {/* Espacio para que la barra flotante inferior no tape el contenido */}
        <div className="h-24" aria-hidden="true" />

        {/* Barra flotante inferior + Menú pantalla completa estilo Bresh */}
        <Navbar />
      </body>
    </html>
  );
}
