"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function FormSubmit({ children = "Guardar", className }: { children?: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <Button className={className} type="submit" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />}{children}</Button>;
}
