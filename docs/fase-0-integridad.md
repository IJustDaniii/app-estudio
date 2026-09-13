# Fase 0 — Integridad y contratos del sistema

Este documento describe el comportamiento que está activo ahora mismo. Las cifras de gamificación siguen siendo provisionales, pero son las únicas reglas válidas hasta que una fase posterior las cambie de forma explícita.

## Reglas actuales

| Regla | Comportamiento actual |
| --- | --- |
| XP de estudio | 1 XP por cada minuto válido guardado por el servidor. |
| Monedas de estudio | 1 moneda por cada bloque completo de 10 minutos; los minutos sobrantes no cuentan para monedas. |
| Recompensa de tarea | 20 XP y 2 monedas al completar una tarea por primera vez. Repetir el envío no vuelve a pagar. |
| Nivel | Se empieza en el nivel 1. Cada 100 XP acumulados sube un nivel; el progreso mostrado es el resto dentro del bloque de 100 XP. |
| Objetivo diario | El objetivo visual es de 60 minutos. Alcanzarlo no añade una recompensa distinta. |
| Misión de estudio | 30 minutos en el día local del usuario: 20 XP y 3 monedas, una sola vez. |
| Misión de tareas | 2 tareas completadas en el día local del usuario: 20 XP y 3 monedas, una sola vez. |
| Racha | Cuenta días locales consecutivos con al menos una sesión. Si hoy aún no hay sesión, se comprueba desde ayer. No hay premio automático adicional por la racha. |

Las cifras anteriores viven en `src/lib/config/game.ts`. El servidor toma de ahí los pagos de tareas y misiones, y `src/lib/domain/progress.ts` calcula los pagos por estudio y los niveles.

## Cómo se protege el estudio

1. Al pulsar “Empezar”, el servidor crea la hora de inicio, un identificador único y una marca firmada con `AUTH_SECRET`.
2. Al pulsar “Finalizar y guardar”, el servidor comprueba que la marca pertenece a la cuenta, que no ha sido modificada y que la duración planificada no cambió.
3. El servidor no acepta la fecha de finalización del navegador. Usa su propia hora.
4. Los minutos enviados no pueden superar el tiempo que ha pasado desde el inicio medido por el servidor ni el plan elegido.
5. La base de datos impide guardar dos sesiones con el mismo identificador para una misma cuenta.
6. Guardar la sesión y pagar XP/monedas ocurre en una sola operación. Si la operación se repite, se devuelve el resultado anterior sin volver a pagar.

El servidor puede demostrar cuánto tiempo ha pasado, pero no puede saber si una persona estuvo concentrada durante cada segundo. Esa es la limitación normal de un temporizador y no permite registrar minutos por encima del tiempo medido.

## Cómo se protegen las recompensas

- La primera finalización de una tarea se reclama con una actualización que solo encuentra tareas que todavía no están completadas.
- Una misión solo se paga cuando una actualización atómica cambia `isComplete` de `false` a `true`.
- Las dos protecciones se ejecutan con transacciones seguras y reintentan únicamente los choques de concurrencia de la base de datos.
- El día de una misión, el objetivo diario y la racha usan la zona horaria guardada en el perfil; no la zona horaria del ordenador que hace la petición.

## Cómo comprobar esta fase

Desde la raíz del proyecto:

```text
npm test
npm run lint
npm run typecheck
npm run build
npx prisma validate
npm audit --audit-level=high
```

Las comprobaciones de Prisma necesitan `DATABASE_URL`. El archivo `.env` local no se sube al repositorio; usa tu configuración local o la de `.env.example`.

Las pruebas específicas están en `tests/missions.test.ts`, `tests/study-session.test.ts`, `tests/progress.test.ts` y `tests/validation.test.ts`.
