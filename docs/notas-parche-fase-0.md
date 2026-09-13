# Notas del parche — Fase 0: Integridad y contratos

## Añadido

- Inicio de las sesiones firmado por el servidor, con identificador único por operación.
- Reglas actuales de XP, monedas, niveles, rachas y misiones documentadas en un único lugar.
- Pruebas de misiones, sesiones, reintentos, errores y límites.

## Corregido

- Las misiones diarias ahora entregan tanto XP como monedas al completarse.
- La racha y el día de las misiones respetan la zona horaria del perfil.
- Las recompensas de tareas y sesiones se calculan desde las reglas centralizadas.

## Solucionado

- Un doble clic o reintento de una misión, tarea o sesión ya no duplica recompensas.
- Las sesiones con fechas futuras, duración imposible o más minutos de los medidos por el servidor se rechazan.
- Las peticiones que reutilizan una clave con datos diferentes se rechazan.
- Se retiró la posibilidad de crear una tarea ya completada para saltarse el pago normal.

## Pruebas realizadas

- `npm test`: 26 archivos y 168 pruebas en verde.
- `npm run lint`: sin avisos.
- `npm run typecheck`: correcto con Prisma 6.12.0 y TypeScript.
- `npm run build`: compilación de producción.
- `npx prisma validate` y `npx prisma format --check`: correctos.
- `npm audit --audit-level=high`: 0 vulnerabilidades conocidas.
- Revisión final del diff, de los archivos añadidos y de los secretos antes del commit.

## Posibles limitaciones restantes

- El servidor puede comprobar el tiempo transcurrido, pero no puede saber si la persona estuvo concentrada cada segundo.
- Las cifras siguen siendo provisionales; cambiarán solo mediante una decisión documentada en una fase posterior.
- Las sesiones iniciadas antes de aplicar esta migración no tienen identificador de reintento, pero no se modifican ni se vuelven a pagar automáticamente.
