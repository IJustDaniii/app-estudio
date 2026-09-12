"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import type { AuthFormState } from "@/app/actions";
import { loginAction, registerAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "register" && <div className="space-y-1.5"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" autoComplete="name" required minLength={2} /></div>}
      <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
      <div className="space-y-1.5"><Label htmlFor="password">Contraseña</Label><Input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={72} /></div>
      {mode === "register" && <p className="text-xs leading-5 text-muted-foreground">Mínimo 8 caracteres con letra, número y símbolo.</p>}
      {state?.error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" size="lg" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <>{mode === "login" ? "Entrar" : "Crear cuenta"}<ArrowRight className="size-4" /></>}</Button>
      <p className="text-center text-sm text-muted-foreground">{mode === "login" ? "¿Aún no tienes cuenta?" : "¿Ya tienes cuenta?"} <Link className="font-medium text-foreground underline-offset-4 hover:underline" href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Crear cuenta" : "Iniciar sesión"}</Link></p>
    </form>
  );
}
