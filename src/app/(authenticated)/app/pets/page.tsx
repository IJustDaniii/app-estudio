import Image from "next/image";
import { Egg, LockKeyhole, PawPrint, Sparkles, Star, Store, Trophy } from "lucide-react";
import { requireUserId } from "@/auth";
import { hatchEggAction, purchaseCosmeticAction, purchaseEggAction, setActivePetAction, startEggIncubationAction } from "@/app/actions";
import { PetActionForm, PetPurchaseForm } from "@/components/pets/pet-action-form";
import { CustomPetForm } from "@/components/pets/custom-pet-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PET_RARITY_CONFIG, PET_RULES } from "@/lib/pets/config";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

function rarityBadge(rarity: keyof typeof PET_RARITY_CONFIG) {
  return <Badge className={PET_RARITY_CONFIG[rarity].color}>{PET_RARITY_CONFIG[rarity].label}</Badge>;
}

export default async function PetsPage() {
  const userId = await requireUserId();
  const [user, eggTypes, cosmetics, eggs, pets, species, fragments, userCosmetics] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { coins: true } }),
    prisma.eggType.findMany({ where: { isAvailable: true }, include: { probabilities: { orderBy: { rarity: "asc" } } }, orderBy: { priceCoins: "asc" } }),
    prisma.cosmetic.findMany({ where: { isAvailable: true }, orderBy: { priceCoins: "asc" } }),
    prisma.userEgg.findMany({ where: { userId, status: { not: "HATCHED" } }, include: { eggType: true }, orderBy: { createdAt: "desc" } }),
    prisma.userPet.findMany({ where: { userId, status: "PRESENT" }, include: { species: true, evolution: true }, orderBy: [{ isActive: "desc" }, { obtainedAt: "desc" }] }),
    prisma.petSpecies.findMany({ where: { isOfficial: true }, orderBy: [{ rarity: "asc" }, { name: "asc" }] }),
    prisma.speciesFragment.findMany({ where: { userId, quantity: { gt: 0 } }, include: { species: true }, orderBy: { updatedAt: "desc" } }),
    prisma.userCosmetic.findMany({ where: { userId }, include: { cosmetic: true }, orderBy: { acquiredAt: "desc" } }),
  ]);

  return <div className="mx-auto max-w-[1500px] space-y-8 px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
    <PageHeader eyebrow="Gamificación · Fase 3" title="Mascotas" description="Descubre criaturas que crecen con tu progreso académico. El XP llega de estudiar, completar tareas y avanzar en misiones." />

    <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumen de mascotas">
      <Card><CardContent className="flex items-center gap-3 pt-5"><span className="grid size-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600"><Store className="size-4" /></span><div><p className="text-xs text-muted-foreground">Monedas disponibles</p><p className="text-lg font-semibold">{user.coins}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 pt-5"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><PawPrint className="size-4" /></span><div><p className="text-xs text-muted-foreground">Mascotas oficiales</p><p className="text-lg font-semibold">{pets.filter((pet) => pet.source === "OFFICIAL").length} / {species.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 pt-5"><span className="grid size-9 place-items-center rounded-lg bg-violet-500/10 text-violet-600"><Egg className="size-4" /></span><div><p className="text-xs text-muted-foreground">Huevos en inventario</p><p className="text-lg font-semibold">{eggs.length}</p></div></CardContent></Card>
    </section>

    <section className="space-y-4" aria-labelledby="shop-heading">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Tienda</p><h2 id="shop-heading" className="text-xl font-semibold">Huevos y detalles</h2><p className="mt-1 text-sm text-muted-foreground">Las probabilidades se muestran por rareza y se resuelven al eclosionar.</p></div><Store className="size-5 text-muted-foreground" /></div>
      <div className="grid gap-4 md:grid-cols-2">
        {eggTypes.map((egg) => <Card key={egg.id}><CardHeader><div className="flex items-start gap-3"><Image src={egg.imagePath} alt="" width={64} height={64} className="size-16 rounded-xl" /><div className="min-w-0 flex-1"><CardTitle className="text-base">{egg.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{egg.description}</p><p className="mt-1 text-xs text-muted-foreground">Necesita {egg.incubationXp} XP académico para eclosionar.</p></div></div></CardHeader><CardContent><div className="mb-4 flex flex-wrap gap-1.5">{egg.probabilities.map((probability) => <span key={probability.rarity} className="text-xs text-muted-foreground">{PET_RARITY_CONFIG[probability.rarity].label}: {probability.weight / 100}%</span>)}</div><PetPurchaseForm action={purchaseEggAction} field="eggTypeSlug" slug={egg.slug} priceCoins={egg.priceCoins} /></CardContent></Card>)}
        {cosmetics.map((cosmetic) => <Card key={cosmetic.id}><CardHeader><div className="flex items-start gap-3"><Image src={cosmetic.imagePath} alt="" width={64} height={64} className="size-16 rounded-xl" /><div className="min-w-0 flex-1"><CardTitle className="text-base">{cosmetic.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{cosmetic.description}</p><p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{cosmetic.type === "FRAME" ? "Marco" : "Insignia"}</p></div></div></CardHeader><CardContent><PetPurchaseForm action={purchaseCosmeticAction} field="cosmeticSlug" slug={cosmetic.slug} priceCoins={cosmetic.priceCoins} /></CardContent></Card>)}
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" aria-label="Inventario y colección">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Egg className="size-4 text-primary" />Inventario de huevos</CardTitle></CardHeader><CardContent>{eggs.length ? <div className="space-y-3">{eggs.map((egg) => { const percent = Math.min(100, Math.round((egg.incubationXp / egg.incubationRequiredXp) * 100)); return <div key={egg.id} className="rounded-lg border p-3"><div className="flex items-center gap-3"><Image src={egg.eggType.imagePath} alt="" width={48} height={48} className="size-12 rounded-lg" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{egg.eggType.name}</p><Badge>{egg.status === "AVAILABLE" ? "En inventario" : "Incubando"}</Badge></div>{egg.status === "INCUBATING" && <><div className="mt-3 mb-1 flex justify-between text-xs text-muted-foreground"><span>XP de incubación</span><span>{egg.incubationXp}/{egg.incubationRequiredXp}</span></div><Progress value={percent} label={"Incubación de " + egg.eggType.name} /></>}</div></div><div className="mt-3">{egg.status === "AVAILABLE" ? <PetActionForm action={startEggIncubationAction} fields={{ eggId: egg.id }}>Empezar incubación</PetActionForm> : percent >= 100 ? <PetActionForm action={hatchEggAction} fields={{ eggId: egg.id }}>Eclosionar huevo</PetActionForm> : <p className="text-xs text-muted-foreground">Sigue estudiando o completando tareas para incubarlo.</p>}</div></div>; })}</div> : <EmptyState title="No tienes huevos todavía" description="Compra uno en la tienda y empieza a incubarlo con XP académico." />}</CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><PawPrint className="size-4 text-primary" />Tus mascotas</CardTitle></CardHeader><CardContent>{pets.length ? <div className="grid gap-3 sm:grid-cols-2">{pets.map((pet) => { const imagePath = pet.source === "CUSTOM" ? "/api/pets/custom/" + pet.id : pet.evolution?.imagePath ?? pet.species?.imagePath ?? "/pets/cat.svg"; const progress = pet.xp % PET_RULES.xpPerLevel; return <article key={pet.id} className={pet.isActive ? "rounded-lg border border-primary/50 bg-primary/5 p-3" : "rounded-lg border p-3"}><div className="flex items-start gap-3"><Image src={imagePath} alt="" width={64} height={64} unoptimized={pet.source === "CUSTOM"} className="size-16 rounded-xl object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="truncate font-semibold">{pet.name}</p><p className="text-xs text-muted-foreground">{pet.source === "CUSTOM" ? "Personalizada" : pet.species?.name}</p></div>{pet.isActive && <Badge className="text-primary">Activa</Badge>}</div>{pet.rarity && <div className="mt-2">{rarityBadge(pet.rarity)}</div>}</div></div><div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>Nivel {pet.level} · {pet.evolution?.name ?? "Base"}</span><span>Felicidad {pet.happiness}%</span></div><p className="mt-1 text-xs text-muted-foreground">Obtenida el {formatDate(pet.obtainedAt)}</p><Progress value={progress} label={"XP de " + pet.name} className="mt-2" /><div className="mt-3">{!pet.isActive && <PetActionForm action={setActivePetAction} fields={{ petId: pet.id }}>Hacer activa</PetActionForm>}{pet.isActive && <p className="text-xs text-primary">Gana XP con tus acciones académicas validadas.</p>}</div></article>; })}</div> : <EmptyState title="Tu colección está esperando" description="Eclosiona tu primer huevo para descubrir una mascota." />}</CardContent></Card>
    </section>

    <section className="space-y-4" aria-labelledby="bestiary-heading">
      <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Colección oficial</p><h2 id="bestiary-heading" className="text-xl font-semibold">Bestiario</h2><p className="mt-1 text-sm text-muted-foreground">Las siluetas marcan las especies que aún no has descubierto.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{species.map((item) => { const discovered = pets.some((pet) => pet.source === "OFFICIAL" && pet.speciesId === item.id); return <article key={item.id} className={discovered ? "rounded-xl border bg-card p-3" : "rounded-xl border bg-card p-3 opacity-75"}><div className="relative mx-auto aspect-square max-w-32 overflow-hidden rounded-lg bg-muted">{discovered ? <Image src={item.imagePath} alt={item.name} fill sizes="128px" className="object-cover" /> : <><Image src={item.imagePath} alt="" fill sizes="128px" className="object-cover grayscale brightness-0" /><span className="absolute inset-0 grid place-items-center text-card/80"><LockKeyhole className="size-6" /></span></>}</div><div className="mt-3 flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{discovered ? item.name : "Sin descubrir"}</p><p className="mt-0.5 text-xs text-muted-foreground">{discovered ? item.description : "Eclosiona un huevo para revelar esta especie."}</p></div><Star className={discovered ? "mt-0.5 size-4 shrink-0 fill-amber-400 text-amber-400" : "mt-0.5 size-4 shrink-0 text-muted-foreground"} aria-hidden /></div><div className="mt-2">{rarityBadge(item.rarity)}</div></article>; })}</div>
    </section>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><PawPrint className="size-4 text-primary" />Mascota personalizada</CardTitle></CardHeader><CardContent className="max-w-xl"><p className="mb-4 text-sm text-muted-foreground">Sube una imagen y ponle nombre. Se guarda separada de la colección oficial y no tiene rareza competitiva.</p><CustomPetForm /></CardContent></Card>

    <section className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" />Fragmentos</CardTitle></CardHeader><CardContent>{fragments.length ? <ul className="space-y-2">{fragments.map((fragment) => <li key={fragment.id} className="flex items-center justify-between rounded-lg border p-3"><span className="flex items-center gap-2"><Image src={fragment.species.imagePath} alt="" width={32} height={32} className="size-8 rounded-md" />{fragment.species.name}</span><Badge>{fragment.quantity} fragmento{fragment.quantity === 1 ? "" : "s"}</Badge></li>)}</ul> : <p className="text-sm text-muted-foreground">Los duplicados de especie aparecerán aquí como fragmentos.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="size-4 text-primary" />Cosméticos en inventario</CardTitle></CardHeader><CardContent>{userCosmetics.length ? <ul className="space-y-2">{userCosmetics.map((item) => <li key={item.id} className="flex items-center justify-between rounded-lg border p-3"><span className="flex items-center gap-2"><Image src={item.cosmetic.imagePath} alt="" width={32} height={32} className="size-8 rounded-md" />{item.cosmetic.name}</span><Badge>x{item.quantity}</Badge></li>)}</ul> : <p className="text-sm text-muted-foreground">Aquí se guardarán los cosméticos que compres.</p>}</CardContent></Card>
    </section>
  </div>;
}
