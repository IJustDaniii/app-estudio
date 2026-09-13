# Notas del parche — Fase 0: Integridad y contratos

## Añadido

- Inicio de las sesiones firmado por el servidor, con identificador único por operación.
- Icono de la aplicación declarado para que la carga no genere un 404 del navegador.
- Reglas actuales de XP, monedas, niveles, rachas y misiones documentadas en un único lugar.
- Pruebas de misiones, sesiones, reintentos, errores y límites.

## Corregido

- Las misiones diarias ahora entregan tanto XP como monedas al completarse.
- La racha y el día de las misiones respetan la zona horaria del perfil.
- Las recompensas de tareas y sesiones se calculan desde las reglas centralizadas.

## Solucionado

- Un doble clic o reintento de una misión, tarea o sesión ya no duplica recompensas.
- Las sesiones con fechas futuras, duración imposible o más minutos de los medidos por el servidor se rechazan.
- Las peticiones que reutilizan una clave con cualquier dato diferente, incluidos los minutos, se rechazan.
- Se retiró la posibilidad de crear una tarea ya completada para saltarse el pago normal.

## Pruebas realizadas

- `npm test`: 30 archivos y 179 pruebas en verde.
- `npm run lint`: sin avisos.
- `npm run typecheck`: correcto con Prisma 6.12.0 y TypeScript.
- `npm run build`: compilación de producción.
- `npx prisma validate --schema prisma/schema.prisma` y `npx prisma format --schema prisma/schema.prisma --check`: correctos.
- `npm audit --audit-level=high`: 0 vulnerabilidades conocidas.
- Navegador: `/login` carga sin errores de consola, el icono responde y `/app/study` redirige correctamente sin autenticación. En un recorrido real autenticado se creó y completó una tarea; al volver al panel se mostraron inmediatamente 20 XP y 2 monedas, también sin errores de consola.
- Revisión final del diff, de los archivos añadidos y de los secretos antes del commit.

## Migración de la base de datos

- PostgreSQL estuvo disponible en `localhost:5432` y la migración `20260913200000_phase0_integrity` quedó registrada como aplicada.
- El primer despliegue detectó que la columna y el índice ya existían por una migración previa ajena a `main`; se comprobó que eran exactamente los cambios de Fase 0 y se recuperó el registro con `prisma migrate resolve --applied`.
- `prisma migrate status` confirmó el esquema al día y `prisma migrate deploy` confirmó que no quedaban cambios pendientes.
- La prueba real guardó dos sesiones, rechazó el duplicado con minutos diferentes y confirmó pagos únicos de misiones y tareas. El usuario temporal fue eliminado.

## Posibles limitaciones restantes

- El servidor puede comprobar el tiempo transcurrido, pero no puede saber si la persona estuvo concentrada cada segundo.
- Las cifras siguen siendo provisionales; cambiarán solo mediante una decisión documentada en una fase posterior.
- Las sesiones iniciadas antes de aplicar esta migración no tienen identificador de reintento, pero no se modifican ni se vuelven a pagar automáticamente.
