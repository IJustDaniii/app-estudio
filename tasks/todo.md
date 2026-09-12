# Tareas

## Fase 1 — Base

- [x] Configurar Next.js, TypeScript, Tailwind, shadcn/ui, Vitest y PWA.
  - Aceptación: la shell compila y el manifest/service worker están disponibles.
  - Verificación: `npm test`, `npm run typecheck`, `npm run build`.

- [x] Definir Prisma y autenticación.
  - Aceptación: schema válido, registro/login protegidos y seed reproducible.
  - Verificación: `npm run db:generate`, pruebas de validación y build.

## Fase 2 — Núcleo académico

- [x] Implementar asignaturas y horario editables.
  - Aceptación: crear/eliminar asignaturas y franjas propias.
  - Verificación: validación, tipos y revisión manual.

- [x] Implementar tareas, calendario, Bosses, notas y objetivos.
  - Aceptación: CRUD básico persistente y separación fija/flexible.
  - Verificación: pruebas de dominio, tipos y revisión manual.

## Fase 3 — Estudio y progreso

- [x] Implementar temporizador y sesiones.
  - Aceptación: iniciar, pausar y finalizar registrando duración.
  - Verificación: pruebas, tipos y revisión manual.

- [x] Implementar progreso, misiones y estadísticas.
  - Aceptación: métricas visibles con reglas provisionales centralizadas.
  - Verificación: pruebas unitarias y build.

## Fase 4 — Dashboard y cierre

- [x] Implementar dashboard y “¿Qué hago ahora?”.
  - Aceptación: información de hoy completa y recomendación explicable.
  - Verificación: tests de heurística y revisión en navegador.

- [x] Verificación final y documentación.
  - Aceptación: test, lint, tipos, build, audit y navegador sin errores conocidos.
  - Verificación: ejecutar todos los comandos documentados.
