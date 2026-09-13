"use client";

import { FormEvent, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomPetForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/pets/custom", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.error === "INVALID_CUSTOM_PET" ? "Usa un nombre y una imagen JPG, PNG o WebP de hasta 5 MB." : "No se pudo guardar la mascota.");
      return;
    }
    event.currentTarget.reset();
    setMessage("Mascota personalizada añadida a tu colección.");
    router.refresh();
  }

  return <form onSubmit={submit} className="space-y-4">
    <div className="space-y-1.5"><Label htmlFor="custom-pet-name">Nombre</Label><Input id="custom-pet-name" name="name" maxLength={80} required placeholder="Un nombre para tu mascota" /></div>
    <div className="space-y-1.5"><Label htmlFor="custom-pet-image">Imagen</Label><Input id="custom-pet-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required /><p className="text-xs text-muted-foreground">JPG, PNG o WebP · máximo 5 MB.</p></div>
    <Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}Añadir mascota</Button>
    {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
  </form>;
}
