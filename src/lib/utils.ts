import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEFAULT_TIME_ZONE, normalizeTimeZone } from "@/lib/domain/dates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: Date | string | null, options?: Intl.DateTimeFormatOptions, timeZone = DEFAULT_TIME_ZONE) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", { ...(options ?? { day: "numeric", month: "short" }), timeZone: normalizeTimeZone(timeZone) }).format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export function formatDateOnly(value: Date | string | null, options?: Intl.DateTimeFormatOptions) {
  return formatDate(value, options, "UTC");
}

export function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
