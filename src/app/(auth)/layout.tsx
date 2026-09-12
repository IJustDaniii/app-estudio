import { BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-12">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center justify-center gap-2 text-sm font-semibold"><span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><BookOpen className="size-4" /></span>Aula 1B</div>
        {children}
      </div>
    </main>
  );
}
