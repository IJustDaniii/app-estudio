export default function Loading() {
  return <div className="mx-auto max-w-6xl animate-pulse space-y-6 px-5 py-9" aria-busy="true" aria-label="Cargando"><div className="h-9 w-56 rounded-lg bg-muted" /><div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 rounded-xl bg-muted" />)}</div><div className="h-80 rounded-xl bg-muted" /></div>;
}
