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
      className={`inline-flex items-center justify-center rounded-[3px] bg-[#f5f4f0] overflow-hidden ${dims}`}
    >
      <img
        src="/logo-mas30.png"
        alt="MASTREINTA"
        className="h-full w-auto object-contain"
      />
    </div>
  );
}

export default function Navbar() {
  // Menú inferior eliminado a pedido del usuario para mantener limpia la pantalla principal y el panel admin.
  return null;
}
