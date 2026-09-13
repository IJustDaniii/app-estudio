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

Fuera de alcance: tienda avanzada, cofres, rangos competitivos, temporadas, Teams, funciones sociales, flashcards e integraciones externas. La Fase 3 inicial incluye mascotas, huevos, tienda básica y cosméticos simples; no incluye las funciones avanzadas listadas fuera de alcance. La IA local inicial queda incluida en la sección siguiente.

### IA local inicial

- Chat persistente por usuario con Ollama en el backend, streaming, ajustes de URL/modelo y estado recuperable cuando el proveedor no está disponible.
- Capa central de contexto académico desacoplada de `AIProvider`: toda categoría autorizada se consulta automáticamente cuando la pregunta necesita datos personales; la selección manual sólo prioriza registros y los límites configurables evitan enviar la base de datos completa.
- Controles por usuario para activar la IA, activar el contexto, permitir por separado notas, planificación (tareas/Bosses/objetivos), sesiones/estadísticas, horario/calendario, materiales y gamificación. Cada mensaje puede enviarse sin contexto personal.
- El asistente sólo recibe lecturas del usuario autenticado, mediante contexto estructurado o herramientas de lectura acotadas. Las futuras escrituras quedan representadas como propuestas que exigirán confirmación, pero no se ejecutan en esta versión.
- Extracción segura de texto de PDF/DOCX/PPTX, adjuntos de imagen para modelos con visión y selección de materiales existentes.
- Herramientas iniciales de solo lectura y propuestas futuras de escritura que requieren confirmación.

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
- Nunca: reprogramar entregas vencidas, tratar obligaciones como flexibles, permitir que el modelo escriba directamente en la base de datos o añadir integraciones externas.

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
