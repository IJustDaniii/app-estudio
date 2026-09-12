export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div role="status" className="grid min-h-40 place-items-center rounded-xl border border-dashed text-center"><div className="max-w-sm px-6"><p className="text-sm font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></div>;
}
