import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  if (await auth()) redirect("/app");
  return <><div className="mb-7 text-center"><h1 className="text-3xl font-semibold tracking-tight">Vuelve a tu ritmo</h1><p className="mt-2 text-sm text-muted-foreground">Tu curso, prioridades y progreso en un solo lugar.</p></div><AuthForm mode="login" /></>;
}
