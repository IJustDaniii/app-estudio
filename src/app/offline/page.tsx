import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return <main className="grid min-h-screen place-items-center px-5 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-xl bg-muted"><WifiOff className="size-5" /></span><h1 className="mt-5 text-2xl font-semibold tracking-tight">Estás sin conexión</h1><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">La app está instalada y su pantalla básica funciona offline. Los datos académicos necesitan conexión en esta versión.</p><Button asChild className="mt-6"><Link href="/app">Reintentar</Link></Button></div></main>;
}
