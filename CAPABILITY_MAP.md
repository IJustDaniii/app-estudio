# Capability map: Aula 1B

El módulo `materials` cubre archivos privados, temas/unidades, asociaciones con asignaturas, tareas y Bosses, búsqueda y almacenamiento local.

| Módulo | Responsabilidad | Depende de |
| --- | --- | --- |
| foundation | Next.js, diseño, PWA, configuración y calidad | — |
| identity | Cuenta, Auth.js y sesión persistente | foundation |
| academics | Asignaturas, horario, tareas, calendario, Bosses, notas y objetivos | identity |
| materials | Materiales privados, temas/unidades, relaciones académicas, búsqueda y almacenamiento local | identity, academics |
| study | Temporizador y sesiones de estudio sin distracciones | identity, academics |
| progress | XP, nivel, monedas, racha, misiones y estadísticas básicas | identity, study, academics |
| dashboard | Prioridad de hoy y planificador transparente | academics, study, progress |
| ai | Chat local con Ollama, contexto académico adaptativo y gobernado por permisos, materiales y herramientas de solo lectura | identity, academics, materials, study, progress |

Orden: `foundation → identity → academics → materials → study → progress → dashboard → ai`.

