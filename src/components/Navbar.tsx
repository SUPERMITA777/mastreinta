"use client";

import React from "react";

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
  // Menú inferior eliminado a pedido del usuario para mantener limpia la pantalla principal y el panel admin.
  return null;
}
