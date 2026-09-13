"use client";

import { Button } from "@/components/ui/button";

export function ConfirmSubmit({ message, children = "Eliminar", className }: { message: string; children?: React.ReactNode; className?: string }) {
  return <Button type="submit" className={className} variant="ghost" onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{children}</Button>;
}
