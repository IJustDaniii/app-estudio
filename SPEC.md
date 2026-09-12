# Especificación: Aula 1B v0.1

## Objetivo

PWA instalable de organización académica gamificada para un estudiante de 1.º de Bachillerato. La experiencia es de escritorio primero, responsive, accesible, seria y con un modo de estudio sin distracciones.

## Alcance funcional

- Cuenta local con contraseña segura y sesión persistente mediante Auth.js.
- Gestión básica de asignaturas, horario, tareas, Bosses, notas y objetivos; el horario permite modificar sus franjas.
- Calendario mensual derivado de tareas, Bosses y objetivos con fecha.
- Temporizador de estudio con registro de sesiones.
- Dashboard centrado en hoy y planificador “¿Qué hago ahora?” basado en una heurística visible.
- XP, nivel, monedas, racha, misiones diarias y estadísticas básicas.
- PWA instalable con shell y pantalla offline disponibles sin red.

Fuera de alcance: mascotas, tienda avanzada, cofres, rangos competitivos, temporadas, IA, Teams, funciones sociales, flashcards e integraciones externas.

## Stack

Next.js App Router + TypeScript + React + Tailwind CSS + componentes shadcn/ui + PostgreSQL/Prisma + Auth.js.

## Comandos

- Desarrollo: `npm run dev`
- Tipos: `npm run typecheck`
- Lint: `npm run lint`
- Tests: `npm test`
- Build: `npm run build`
- Prisma: `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`

## Estructura

- `src/app`: rutas, layouts y acciones de servidor.
- `src/components`: interfaz y componentes shadcn/ui.
- `src/lib`: acceso a datos, validación y reglas de dominio.
- `prisma`: esquema, migraciones y datos demo.
- `public`: service worker y recursos instalables.
- `tests`: pruebas de lógica pura.

## Convenciones

TypeScript estricto; componentes de servidor por defecto; componentes cliente solo para interacción; entradas externas validadas con Zod; acceso a datos siempre limitado por `userId`; nombres de dominio en inglés y copy visible en español.

## Pruebas

Vitest para reglas de planificación y progreso. El cierre exige test, lint, typecheck, build y revisión en navegador de escritorio y móvil.

## Límites

- Siempre: validar entradas, comprobar propiedad de recursos, usar Prisma parametrizado y mantener reglas provisionales centralizadas.
- Pendiente de definición conjunta: fórmulas definitivas, redistribución de estudio, catálogo de recompensas y mecánicas excluidas.
- Nunca: reprogramar entregas vencidas, tratar obligaciones como flexibles, usar IA o añadir integraciones externas.

## Criterios de éxito

- Todas las áreas del alcance tienen una vista funcional y persistente.
- El dashboard muestra tareas, progreso diario, próximo Boss, nivel, XP, monedas, racha y tiempo estudiado.
- El planificador explica cada recomendación usando fecha, prioridad, dificultad, Boss próximo y duración.
- Las entregas vencidas permanecen vencidas; las actividades flexibles están identificadas para una futura redistribución.
- La app expone manifest, service worker, tema claro/oscuro/sistema y una experiencia de estudio enfocada.

## Preguntas abiertas deliberadas

- Fórmulas definitivas de XP, nivel, monedas, racha y recompensas.
- Reglas de redistribución automática para estudio flexible.
- Catálogo definitivo de tipos, prioridades y dificultad.
- Política de despliegue, recuperación de contraseña y verificación de email.
