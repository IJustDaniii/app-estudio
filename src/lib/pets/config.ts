export const PET_RARITIES = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"] as const;
export type PetRarity = (typeof PET_RARITIES)[number];

export const PET_RARITY_CONFIG: Record<PetRarity, { label: string; color: string; order: number }> = {
  COMMON: { label: "Común", color: "text-slate-600 dark:text-slate-300", order: 1 },
  UNCOMMON: { label: "Poco común", color: "text-emerald-600 dark:text-emerald-400", order: 2 },
  RARE: { label: "Rara", color: "text-sky-600 dark:text-sky-400", order: 3 },
  EPIC: { label: "Épica", color: "text-violet-600 dark:text-violet-400", order: 4 },
  LEGENDARY: { label: "Legendaria", color: "text-amber-600 dark:text-amber-400", order: 5 },
  MYTHIC: { label: "Mítica", color: "text-rose-600 dark:text-rose-400", order: 6 },
};

export const PET_RULES = {
  xpPerLevel: 100,
  duplicateFragments: 1,
  defaultHappiness: 80,
  happinessGainPerAcademicAction: 1,
  evolutionLevels: [1, 10, 25, 50, 100] as const,
} as const;

export const PET_SPECIES_CONFIG = [
  { slug: "cat", name: "Gato", description: "Observador, sereno y siempre cerca cuando toca concentrarse.", rarity: "COMMON", imagePath: "/pets/cat.svg" },
  { slug: "slime", name: "Slime", description: "Una pequeña forma de energía suave que se adapta a cualquier materia.", rarity: "COMMON", imagePath: "/pets/slime.svg" },
  { slug: "penguin", name: "Pingüino", description: "Constante y elegante, avanza paso a paso sin perder el ritmo.", rarity: "COMMON", imagePath: "/pets/penguin.svg" },
  { slug: "fox", name: "Zorro", description: "Ingenioso y rápido para encontrar conexiones entre ideas.", rarity: "UNCOMMON", imagePath: "/pets/fox.svg" },
  { slug: "owl", name: "Búho", description: "Una mirada tranquila para las sesiones de estudio más exigentes.", rarity: "UNCOMMON", imagePath: "/pets/owl.svg" },
  { slug: "robot", name: "Robot", description: "Precisión modular para convertir objetivos en progreso.", rarity: "RARE", imagePath: "/pets/robot.svg" },
  { slug: "axolotl", name: "Ajolote", description: "Curioso, luminoso y experto en recuperarse de los errores.", rarity: "RARE", imagePath: "/pets/axolotl.svg" },
  { slug: "ghost", name: "Fantasmita", description: "Una presencia ligera para acompañar cada repaso.", rarity: "EPIC", imagePath: "/pets/ghost.svg" },
  { slug: "dragon", name: "Mini dragón", description: "Pequeño en tamaño, enorme en energía para los grandes retos.", rarity: "LEGENDARY", imagePath: "/pets/dragon.svg" },
  { slug: "living-book", name: "Libro viviente", description: "Páginas inquietas que convierten la curiosidad en descubrimientos.", rarity: "LEGENDARY", imagePath: "/pets/living-book.svg" },
  { slug: "pixel-pet", name: "Pixel pet", description: "Una criatura digital de otro plano, precisa y difícil de olvidar.", rarity: "MYTHIC", imagePath: "/pets/pixel-pet.svg" },
] as const satisfies readonly { slug: string; name: string; description: string; rarity: PetRarity; imagePath: string }[];

export const PET_SHOP_CONFIG = {
  eggTypes: [
    {
      slug: "study-egg",
      name: "Huevo de estudio",
      description: "Un huevo equilibrado para empezar a descubrir la colección.",
      priceCoins: 40,
      incubationXp: 100,
      imagePath: "/pets/egg-study.svg",
      probabilities: { COMMON: 5500, UNCOMMON: 2500, RARE: 1200, EPIC: 500, LEGENDARY: 200, MYTHIC: 100 },
    },
    {
      slug: "focus-egg",
      name: "Huevo de enfoque",
      description: "Más costoso y con mejores opciones de rarezas altas.",
      priceCoins: 120,
      incubationXp: 250,
      imagePath: "/pets/egg-focus.svg",
      probabilities: { COMMON: 2500, UNCOMMON: 2500, RARE: 2200, EPIC: 1500, LEGENDARY: 900, MYTHIC: 400 },
    },
  ] as const,
  cosmetics: [
    { slug: "soft-frame", name: "Marco Soft", description: "Un marco limpio para destacar tu mascota activa.", type: "FRAME", priceCoins: 30, imagePath: "/pets/cosmetic-frame.svg" },
    { slug: "study-badge", name: "Insignia Study", description: "Un detalle discreto para tu colección.", type: "BADGE", priceCoins: 50, imagePath: "/pets/cosmetic-badge.svg" },
  ] as const,
} as const;
