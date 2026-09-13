# Especificación: Fase 0 — Integridad y contratos del sistema

## Objetivo

Hacer que las recompensas y las sesiones de estudio sean confiables: cada acción válida entrega sus recompensas una sola vez, y el servidor decide qué duración de estudio puede registrarse. Las reglas actuales quedan centralizadas y explicadas para que el comportamiento visible y el código no se contradigan.

## Alcance

- Corregir la entrega de XP y monedas de las misiones diarias.
- Mantener la recompensa de completar una tarea limitada a su primera finalización.
- Iniciar cada sesión con una marca de tiempo creada por el servidor.
- Rechazar fechas futuras, sesiones demasiado cortas o largas y minutos superiores al tiempo transcurrido en el servidor.
- Proteger reintentos con un identificador único y una transacción atómica.
- Usar la zona horaria de cada usuario para el día de las misiones y la racha.
- Documentar las reglas actuales de XP, monedas, niveles, rachas y misiones.
- Añadir pruebas de reglas, misiones, sesiones, reintentos, errores y límites.

## Fuera de alcance

No se añaden tienda avanzada, temporadas, funciones sociales, nuevas recompensas, nuevas mecánicas de juego ni sincronización offline.

## Contratos

- El usuario autenticado es la única identidad válida; el navegador no puede elegir el usuario que recibe recompensas.
- El servidor crea el inicio de la sesión y el identificador de reintento. El navegador solo comunica la intención de finalizar, la duración planificada y los datos académicos elegidos.
- `actualMinutes` debe ser un entero positivo, no puede superar la duración planificada ni los minutos transcurridos desde el inicio firmado por el servidor.
- Una misión se recompensa únicamente cuando una actualización atómica cambia `isComplete` de falso a verdadero.
- Una tarea se recompensa únicamente cuando una actualización atómica cambia su estado a completada.
- Un reintento de una sesión ya guardada no vuelve a sumar XP, monedas ni progreso de mascota; una petición con el mismo identificador y otros datos se rechaza.

## Comandos de comprobación

- Pruebas: `npm test`
- Lint: `npm run lint`
- Tipos: `npm run typecheck`
- Compilación: `npm run build`
- Prisma: `npx prisma validate`
- Dependencias: `npm audit --audit-level=high`

## Criterios de éxito

- Una misión completada suma exactamente sus valores configurados de XP y monedas, incluso si se actualiza dos veces a la vez.
- Un reintento de una sesión no vuelve a crearla ni a pagarla.
- Una sesión futura, con duración negativa, con minutos inventados o fuera de sus límites no se guarda.
- Las cifras mostradas y las reglas documentadas salen de la misma configuración central.
- Todas las pruebas, el lint, los tipos, la compilación, Prisma y la auditoría pasan sin avisos nuevos.
