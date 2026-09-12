import { cn } from "@/lib/utils";

export function Progress({ value, className, label }: { value: number; className?: string; label?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(safe)} className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${safe}%` }} /></div>;
}
