import Image from "next/image";
import Link from "next/link";
import { auth, requireUserId } from "@/auth";
import { logoutAction, updateTimeZone } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmit } from "@/components/form-submit";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TIME_ZONE_OPTIONS } from "@/lib/domain/dates";
import { prisma } from "@/lib/prisma";

export default async function AccountPage() {
  const userId = await requireUserId();
  const [session, user, activePet] = await Promise.all([
    auth(),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, timezone: true } }),
    prisma.userPet.findFirst({ where: { userId, isActive: true, status: "PRESENT" }, include: { species: true, evolution: true } }),
  ]);
  const imagePath = activePet ? activePet.source === "CUSTOM" ? "/api/pets/custom/" + activePet.id : activePet.evolution?.imagePath ?? activePet.species?.imagePath ?? "/pets/cat.svg" : null;
  return <div className="mx-auto max-w-3xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
    <PageHeader eyebrow="Cuenta" title={user.name} description="Datos mínimos utilizados para identificar tu cuenta y mantener la sesión." />
    <Card><CardHeader><CardTitle>Perfil</CardTitle></CardHeader><CardContent className="divide-y"><div className="flex justify-between gap-4 py-3 text-sm"><span className="text-muted-foreground">Email</span><span>{user.email}</span></div><div className="flex justify-between gap-4 py-3 text-sm"><span className="text-muted-foreground">Sesión</span><span>{session ? "Activa" : "No activa"}</span></div><div className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-muted-foreground">Tema</span><ThemeToggle /></div></CardContent></Card>
    <Card><CardHeader><CardTitle>Zona horaria</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Se usa para mostrar correctamente días, clases y fechas.</p><form action={updateTimeZone} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><div className="w-full space-y-1.5"><Label htmlFor="account-time-zone">Zona horaria visible</Label><Select id="account-time-zone" name="timeZone" defaultValue={user.timezone} required>{TIME_ZONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></div><FormSubmit>Guardar</FormSubmit></form><p className="mt-3 text-xs text-muted-foreground">Actual: {user.timezone}</p></CardContent></Card>
    <Card><CardHeader><CardTitle>Mascota activa</CardTitle></CardHeader><CardContent>{activePet && imagePath ? <div className="flex items-center gap-3"><Image src={imagePath} alt="" width={56} height={56} unoptimized={activePet.source === "CUSTOM"} className="size-14 rounded-xl object-cover" /><div><p className="font-semibold">{activePet.name}</p><p className="text-sm text-muted-foreground">Nivel {activePet.level} · Felicidad {activePet.happiness}%</p></div></div> : <p className="text-sm text-muted-foreground">Todavía no tienes una mascota activa.</p>}<Link href="/app/pets" className="mt-4 inline-block text-sm text-primary underline-offset-2 hover:underline">Gestionar mascotas</Link></CardContent></Card>
    <form action={logoutAction}><Button type="submit" variant="outline">Cerrar sesión</Button></form>
  </div>;
}
