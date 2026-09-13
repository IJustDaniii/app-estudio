"use client";

import { Button } from "@/components/ui/button";

export function ConfirmSubmit({ message, children = "Eliminar", className, ariaLabel }: { message: string; children?: React.ReactNode; className?: string; ariaLabel?: string }) {
  return <Button type="submit" className={className} variant="ghost" aria-label={ariaLabel} onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{children}</Button>;
}
