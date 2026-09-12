"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="grid min-h-[70vh] place-items-center px-5 text-center"><div><h1 className="text-xl font-semibold">No hemos podido cargar esta sección</h1><p className="mt-2 text-sm text-muted-foreground">Comprueba la conexión e inténtalo de nuevo.</p><Button className="mt-5" onClick={reset}>Reintentar</Button></div></div>;
}
