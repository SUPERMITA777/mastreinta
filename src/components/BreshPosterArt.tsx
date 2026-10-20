"use client";

import React from "react";
import { EventItem } from "@/lib/types";
import { formatARS } from "@/lib/store";

interface BreshPosterArtProps {
  event: EventItem;
  variant?: "square" | "wide";
}

function getGeneralTicketPrice(event: EventItem): number | null {
  const tiers = event.ticketTiers || [];
  if (tiers.length === 0) return null;
  const generalTier = tiers.find((t) =>
    /general/i.test(t.name || "")
  );
  return (generalTier || tiers[0]).price;
}

export default function BreshPosterArt({
  event,
  variant = "square",
}: BreshPosterArtProps) {
  const generalPrice = getGeneralTicketPrice(event);

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{ backgroundColor: event.flyerGradient || "#AF2C75" }}
    >
      {/* Arte ilustrado del Flyer a pantalla completa */}
      <img
        src={event.flyerUrl}
        alt={`MAS30 ${event.title}`}
        className={`w-full h-full ${
          variant === "wide" ? "object-cover object-top" : "object-cover object-center"
        } transition-transform duration-500 group-hover:scale-105`}
      />

      {/* Etiqueta sutil de valor de entrada en esquina superior derecha */}
      {generalPrice !== null && (
        <div className="absolute top-3 right-3 pointer-events-none">
          <span className="bg-[#ffb5d7] text-[#121212] font-semibold text-xs px-2.5 py-1 rounded-[2px] shadow-md">
            {formatARS(generalPrice)}
          </span>
        </div>
      )}
    </div>
  );
}
