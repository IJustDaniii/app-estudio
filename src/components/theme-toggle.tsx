"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  if (!mounted) return <span className="block size-9" aria-hidden />;

  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return <Button variant="ghost" size="icon" aria-label={`Tema: ${theme}. Cambiar a ${next}`} onClick={() => setTheme(next)}><Icon className="size-4" /></Button>;
}
