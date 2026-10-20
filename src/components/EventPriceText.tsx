import React from "react";
import { formatARS } from "@/lib/store";
import type { EventItem } from "@/lib/types";
import { fillEventTemplate, getMinPrice } from "@/lib/eventTexts";

/** Renderiza un texto configurable resaltando {precio} (precio mínimo del evento). */
export default function EventPriceText({
  event,
  text,
}: {
  event: EventItem;
  text: string;
}) {
  const filled = fillEventTemplate(text, event);
  const parts = filled.split(/\{precio\}/i);
  const price = formatARS(getMinPrice(event));
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <strong className="text-white font-medium">{price}</strong>
          )}
        </React.Fragment>
      ))}
    </>
  );
}
