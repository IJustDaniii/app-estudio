"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, BookOpen, CalendarDays, ChartNoAxesCombined, ClipboardCheck, Clock3, Goal, GraduationCap, LayoutDashboard, LibraryBig, LogOut, PawPrint, Swords } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/app", label: "Hoy", icon: LayoutDashboard },
  { href: "/app/ai", label: "IA", icon: Bot },
  { href: "/app/pets", label: "Mascotas", icon: PawPrint },
  { href: "/app/tasks", label: "Tareas", icon: ClipboardCheck },
  { href: "/app/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/app/timetable", label: "Horario", icon: Clock3 },
  { href: "/app/bosses", label: "Bosses", icon: Swords },
  { href: "/app/grades", label: "Notas", icon: GraduationCap },
  { href: "/app/goals", label: "Objetivos", icon: Goal },
  { href: "/app/study", label: "Estudiar", icon: BookOpen },
  { href: "/app/materials", label: "Materiales", icon: LibraryBig },
  { href: "/app/statistics", label: "Estadísticas", icon: ChartNoAxesCombined },
  { href: "/app/subjects", label: "Asignaturas", icon: LibraryBig },
] as const;

function NavLink({ href, label, icon: Icon, mobile = false }: (typeof nav)[number] & { mobile?: boolean }) {
  const pathname = usePathname();
  const active = href === "/app" ? pathname === href : pathname.startsWith(href);
  return <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground", mobile ? "min-w-16 flex-col gap-1 px-2 py-2 text-[10px]" : "px-3 py-2", active && "bg-muted text-foreground")}><Icon className={mobile ? "size-5" : "size-4"} />{label}</Link>;
}

export function AppShell({ children, userName }: { children: React.ReactNode; userName: string }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r bg-card/90 p-4 backdrop-blur lg:flex">
        <Link href="/app" className="mb-7 flex items-center gap-2 px-2 text-sm font-semibold"><span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><BookOpen className="size-4" /></span>Aula 1B</Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Principal">{nav.map((item) => <NavLink key={item.href} {...item} />)}</nav>
        <div className="flex items-center justify-between border-t pt-3"><Link href="/app/account" className="max-w-32 truncate rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground">{userName}</Link><div className="flex"><ThemeToggle /><form action={logoutAction}><Button variant="ghost" size="icon" aria-label="Cerrar sesión"><LogOut className="size-4" /></Button></form></div></div>
      </aside>
      <main className="min-w-0 pb-24 lg:col-start-2 lg:pb-0">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Principal móvil">{nav.map((item) => <NavLink key={item.href} {...item} mobile />)}</nav>
    </div>
  );
}
