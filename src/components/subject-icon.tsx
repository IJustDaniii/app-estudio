import { BookOpen, Calculator, Dumbbell, FlaskConical, Globe2, Laptop, Landmark, Languages, Music, Palette, type LucideProps } from "lucide-react";

const icons = { "book-open": BookOpen, calculator: Calculator, "flask-conical": FlaskConical, "globe-2": Globe2, languages: Languages, landmark: Landmark, palette: Palette, dumbbell: Dumbbell, music: Music, laptop: Laptop } as const;

export type SubjectIconName = keyof typeof icons;

export function SubjectIcon({ icon, label, ...props }: LucideProps & { icon: string; label?: string }) {
  const Icon = icons[icon as SubjectIconName] ?? BookOpen;
  return <Icon aria-label={label} aria-hidden={label ? undefined : true} {...props} />;
}
