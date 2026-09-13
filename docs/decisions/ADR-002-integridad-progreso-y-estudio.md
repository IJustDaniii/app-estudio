# ADR-002: Hacer idempotentes las recompensas y validar el estudio en el servidor

## Estado

Aceptada

## Fecha

2026-09-13

## Contexto

Las misiones diarias cambiaban a completadas y daban progreso a la mascota, pero no sumaban XP ni monedas al usuario. Además, la sesión de estudio confiaba en fechas y minutos enviados desde el navegador. Un reintento o una petición manipulada podía producir un resultado incorrecto.

## Decisión

- El servidor crea una marca firmada para cada inicio de sesión. La marca une la cuenta, el identificador de la operación, la hora de inicio y la duración planificada.
- El servidor calcula la hora final y comprueba los minutos enviados contra el tiempo transcurrido en el servidor.
- `StudySession` tiene una clave única por usuario y petición. La creación de la sesión y el pago de XP/monedas viven en la misma transacción.
- Las misiones se actualizan con la condición `isComplete=false`; solo la transacción que logra cambiarla puede pagar la recompensa.
- Los choques de concurrencia se reintentan hasta tres veces. Los demás errores no se ocultan.

## Alternativas consideradas

### Confiar en las fechas y minutos del navegador

Se descarta porque permite elegir una fecha futura, una duración inexistente o más minutos de los que han pasado.

### Consultar primero si existe la operación y después crearla

Se descarta porque dos peticiones pueden leer “no existe” antes de que ninguna cree el registro. La restricción única de la base de datos debe ser la que decida quién gana.

### Crear una nueva recompensa aparte de la misión

Se descarta en esta fase para no duplicar modelos ni añadir un sistema de contabilidad que no necesita el alcance actual. La transición atómica de la propia misión ya representa el pago único que existe hoy.

## Consecuencias

- Un reintento no duplica sesiones ni recompensas.
- La hora local de cada usuario es la referencia para misiones y rachas.
- El secreto de Auth.js también protege el inicio de las sesiones; no se añade otra clave ni otra dependencia.
- El sistema demuestra tiempo transcurrido, no la atención real de la persona. Los minutos pausados se pueden informar por debajo del límite del servidor, pero nunca por encima.
