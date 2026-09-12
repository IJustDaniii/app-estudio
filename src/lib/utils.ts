import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: Date | string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", options ?? { day: "numeric", month: "short" }).format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
