import { auth, requireUserId } from "@/auth";
import { logoutAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function AccountPage() {
  const userId = await requireUserId();
  const [session, user] = await Promise.all([
    auth(),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } }),
  ]);
  return <div className="mx-auto max-w-3xl space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-9"><PageHeader eyebrow="Cuenta" title={user.name} description="Datos mínimos utilizados para identificar tu cuenta y mantener la sesión." />
    <Card><CardHeader><CardTitle>Perfil</CardTitle></CardHeader><CardContent className="divide-y"><div className="flex justify-between gap-4 py-3 text-sm"><span className="text-muted-foreground">Email</span><span>{user.email}</span></div><div className="flex justify-between gap-4 py-3 text-sm"><span className="text-muted-foreground">Sesión</span><span>{session ? "Activa" : "No activa"}</span></div><div className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-muted-foreground">Tema</span><ThemeToggle /></div></CardContent></Card>
    <form action={logoutAction}><Button type="submit" variant="outline">Cerrar sesión</Button></form>
  </div>;
}
