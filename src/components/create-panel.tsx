import { Plus } from "lucide-react";

export function CreatePanel({ label, children }: { label: string; children: React.ReactNode }) {
  return <details className="group rounded-xl border bg-card"><summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium marker:hidden"><Plus className="size-4 text-primary transition-transform group-open:rotate-45" />{label}</summary><div className="border-t p-4 sm:p-5">{children}</div></details>;
}
