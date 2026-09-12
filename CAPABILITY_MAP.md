# Capability map: Aula 1B

| Módulo | Responsabilidad | Depende de |
| --- | --- | --- |
| foundation | Next.js, diseño, PWA, configuración y calidad | — |
| identity | Cuenta, Auth.js y sesión persistente | foundation |
| academics | Asignaturas, horario, tareas, calendario, Bosses, notas y objetivos | identity |
| study | Temporizador y sesiones de estudio sin distracciones | identity, academics |
| progress | XP, nivel, monedas, racha, misiones y estadísticas básicas | identity, study, academics |
| dashboard | Prioridad de hoy y planificador transparente | academics, study, progress |

Orden: `foundation → identity → academics → study → progress → dashboard`.

