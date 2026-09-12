import { ThemeToggle } from "@/components/theme-toggle";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <header className="flex flex-wrap items-start justify-between gap-4"><div>{eyebrow && <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-primary">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>{description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}</div><div className="flex items-center gap-2">{actions}<div className="lg:hidden"><ThemeToggle /></div></div></header>;
}
