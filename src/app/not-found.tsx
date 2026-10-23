import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
      <h1 className="text-4xl font-black text-soft-pink">404</h1>
      <h2 className="text-xl font-semibold">Página no encontrada</h2>
      <p className="text-sm text-white/60 max-w-sm">
        El enlace que intentás abrir no existe o el evento ya no está disponible.
      </p>
      <Link
        href="/"
        className="mt-4 px-6 py-2.5 rounded-lg bg-soft-pink text-[#1c1c1c] font-semibold text-sm hover:brightness-95 transition-all"
      >
        Volver al Inicio
      </Link>
    </div>
  );
}
