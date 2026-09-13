"use client";

import { useState } from "react";
import { calculateRequiredGrade } from "@/lib/domain/academic-rules";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type GradeSubject = { id: string; name: string; weightedSum: number; totalWeight: number };

export function GradeCalculator({ subjects }: { subjects: GradeSubject[] }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [target, setTarget] = useState("7");
  const [nextWeight, setNextWeight] = useState("1");
  const subject = subjects.find((item) => item.id === subjectId);
  const targetValue = Number(target);
  const weightValue = Number(nextWeight);
  const required = subject && Number.isFinite(targetValue) && Number.isFinite(weightValue)
    ? calculateRequiredGrade({ target: targetValue, currentWeightedSum: subject.weightedSum, currentWeight: subject.totalWeight, nextWeight: weightValue })
    : null;
  const message = required === null ? "Indica un peso válido." : required <= 0 ? "Ya alcanzas ese objetivo con las notas actuales." : required > 10 ? "No es posible alcanzar ese objetivo con una sola nota (supera 10)." : `Necesitas al menos un ${required.toFixed(2)}.`;

  return <section className="rounded-xl border bg-card p-5" aria-labelledby="grade-calculator-title"><h2 id="grade-calculator-title" className="text-sm font-semibold">Calculadora de nota necesaria</h2><p className="mt-1 text-xs text-muted-foreground">Calcula qué nota te haría falta en la próxima evaluación según el peso de la próxima nota.</p>{subjects.length ? <div className="mt-4 grid gap-4 sm:grid-cols-3"><div className="space-y-1.5"><Label htmlFor="calculator-subject">Asignatura</Label><Select id="calculator-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div><div className="space-y-1.5"><Label htmlFor="calculator-target">Media objetivo</Label><Input id="calculator-target" type="number" min={0} max={10} step="0.1" value={target} onChange={(event) => setTarget(event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="calculator-weight">Peso de la próxima nota</Label><Input id="calculator-weight" type="number" min="0.01" max={100} step="0.1" value={nextWeight} onChange={(event) => setNextWeight(event.target.value)} /></div></div> : <p className="mt-3 text-sm text-muted-foreground">Añade una nota para poder calcularla.</p>}<p role="status" className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm font-medium">{message}</p></section>;
}
