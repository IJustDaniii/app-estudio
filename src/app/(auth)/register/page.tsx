import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  if (await auth()) redirect("/app");
  return <><div className="mb-7 text-center"><h1 className="text-3xl font-semibold tracking-tight">Prepara tu curso</h1><p className="mt-2 text-sm text-muted-foreground">Incluiremos las asignaturas demo solicitadas; podrás editarlas después.</p></div><AuthForm mode="register" /></>;
}
