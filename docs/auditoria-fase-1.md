# Auditoría de cierre — Fase 1

Fecha: 13 de septiembre de 2026.

## Alcance revisado

Se revisó que el núcleo académico permite crear, editar, consultar y borrar asignaturas, temas, tareas, Bosses, notas, objetivos, materiales y eventos puntuales de horario. También se revisaron las vistas diaria, semanal y mensual del calendario, la agenda de mañana y la configuración de zona horaria. No se añadieron funcionalidades de fases posteriores.

## Comprobaciones técnicas

Ejecutadas desde el árbol limpio basado en `main`:

- `npm test`: 35 grupos, 202 pruebas correctas.
- `npm run lint`: correcto, sin avisos.
- `npm run typecheck`: correcto.
- `npm run build`: compilación de producción correcta y 28 rutas generadas.
- `npx prisma validate --schema prisma/schema.prisma`: esquema válido.
- `npx prisma format --schema prisma/schema.prisma --check`: formato correcto.
- `npx prisma migrate deploy`: sin migraciones pendientes.
- `npx prisma migrate status`: base de datos al día.
- `npm audit --audit-level=high`: 0 vulnerabilidades.
- `git diff --check`: sin errores de espacios.

## Base de datos

La base de datos contiene las columnas de asignaturas, objetivos, notas, Bosses y cambios de horario esperadas por el esquema. Las dos migraciones de Fase 1 registradas son:

- `20260913210000_phase1_academic_core`
- `20260913211000_phase1_goal_subject`

La cuenta temporal utilizada para el recorrido del navegador se eliminó al terminar y se verificó que su correo ya no existe.

## Recorrido desde navegador

Con una cuenta de prueba se visualizaron correctamente:

- Inicio y la tarjeta de mañana con clases, tareas pendientes y materiales.
- Lista y detalle de asignaturas.
- Tareas con edición completa; una obligación fija vencida aparece como bloqueada para cambiar de modalidad.
- Bosses con ciclo y comparación de nota esperada/real.
- Notas, medias ponderadas, evolución y nota necesaria.
- Objetivos académicos y personales.
- Horario semanal y cambios puntuales.
- Materiales y sus selectores de asignatura, tema, tarea y Boss.
- Calendario día, semana y mes.
- Cuenta con zona horaria visible y seleccionable.

La pestaña final no registró errores ni avisos del navegador.

## Seguridad y permisos

- Las páginas académicas obtienen el identificador de la cuenta mediante la sesión autenticada.
- Las lecturas filtran por ese identificador.
- Las ediciones y eliminaciones vuelven a filtrar por ese identificador.
- Las asociaciones comprueban que cada asignatura, tema, tarea y Boss pertenece a la misma cuenta.
- El detalle de asignatura devuelve página inexistente cuando el registro no pertenece a la cuenta.
- Los materiales usan el mismo filtro de pertenencia en listado, consulta, edición, subida y borrado.
- Las pruebas existentes de aislamiento y las nuevas pruebas de la Fase 1 pasaron correctamente.

## Resultado

La Fase 1 queda cerrada dentro de su alcance. No se detectaron errores, pruebas pendientes, migraciones pendientes ni soluciones provisionales sin documentar.
