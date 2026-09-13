"use client";

import { useActionState, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import type { PetActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";

type PetAction = (state: PetActionState, formData: FormData) => Promise<PetActionState>;

export function PetActionForm({ action, fields, children, className = "" }: { action: PetAction; fields: Record<string, string>; children: React.ReactNode; className?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className={className}>
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <Button type="submit" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />}{children}</Button>
    {state.error && <p className="mt-2 text-xs text-destructive" role="alert">{state.error}</p>}
    {state.success && <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400" role="status">{state.success}</p>}
  </form>;
}

export function PetPurchaseForm({ action, field, slug, priceCoins }: { action: PetAction; field: "eggTypeSlug" | "cosmeticSlug"; slug: string; priceCoins: number }) {
  const [state, formAction, pending] = useActionState(action, {});
  const requestId = useRef("");
  const requestInput = useRef<HTMLInputElement>(null);
  function prepareRequest() {
    if (!requestId.current || state.success) requestId.current = crypto.randomUUID();
    if (requestInput.current) requestInput.current.value = requestId.current;
  }
  return <form action={formAction} onSubmit={prepareRequest}>
    <input type="hidden" name={field} value={slug} />
    <input ref={requestInput} type="hidden" name="requestId" defaultValue="" />
    <Button type="submit" disabled={pending} className="w-full">{pending && <LoaderCircle className="size-4 animate-spin" />}Comprar · {priceCoins} monedas</Button>
    {state.error && <p className="mt-2 text-xs text-destructive" role="alert">{state.error}</p>}
    {state.success && <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400" role="status">{state.success}</p>}
  </form>;
}
