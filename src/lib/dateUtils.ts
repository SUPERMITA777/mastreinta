export const TIMEZONE_ARGENTINA = "America/Argentina/Buenos_Aires";

/**
 * Retorna la fecha en formato YYYY-MM-DD según la hora local de Buenos Aires, Argentina (UTC-3).
 * Evita el desfasaje de medianoche generado por toISOString() en UTC (a partir de las 21:00 hs en Argentina).
 */
export function getArgentinaDateKey(date: Date | string | number = new Date()): string {
  const d = typeof date === "object" ? date : new Date(date);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_ARGENTINA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Formatea una fecha YYYY-MM-DD o ISO a formato legible en español argentino (ej: "Mié 21/10/2026" o "21/10/2026").
 */
export function formatArgentinaDate(
  dateInput: string | Date,
  options: { includeWeekday?: boolean } = {}
): string {
  if (!dateInput) return "-";
  try {
    let d: Date;
    if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split("-").map(Number);
      d = new Date(year, month - 1, day, 12, 0, 0);
    } else {
      d = new Date(dateInput);
    }

    if (isNaN(d.getTime())) return String(dateInput);

    if (options.includeWeekday) {
      const formatted = d.toLocaleDateString("es-AR", {
        timeZone: TIMEZONE_ARGENTINA,
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }

    return d.toLocaleDateString("es-AR", {
      timeZone: TIMEZONE_ARGENTINA,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Formatea fecha y hora en zona horaria de Buenos Aires (ej: "21/10/2026, 19:45").
 */
export function formatArgentinaDateTime(isoStr?: string | Date): string {
  if (!isoStr) return "-";
  try {
    const d = typeof isoStr === "object" ? isoStr : new Date(isoStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("es-AR", {
      timeZone: TIMEZONE_ARGENTINA,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return String(isoStr);
  }
}
