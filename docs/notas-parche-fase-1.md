# Notas del parche — Fase 1: Núcleo académico

Fecha de cierre: 13 de septiembre de 2026.

## Añadido

- Asignaturas completas con icono, profesor, aula, dificultad, notas y página de detalle.
- Edición y eliminación de asignaturas y temas, con confirmación antes de borrar.
- Tareas editables de principio a fin, distinguiendo obligación fija y estudio flexible.
- Protección de servidor y de interfaz para no mover ni convertir en flexible una obligación fija vencida.
- Bosses con estados próximo, preparado y realizado, preparación, nota esperada, nota real y comparación.
- Materiales asociados a asignaturas, temas, tareas y Bosses, con comprobación de pertenencia y coherencia.
- Notas con peso, media ponderada por asignatura, evolución y cálculo de nota necesaria.
- Objetivos académicos o personales con edición, eliminación, fecha, asignatura opcional y progreso.
- Cambios puntuales del horario sin alterar el horario semanal.
- Calendario diario, semanal y mensual, respetando la zona horaria del perfil.
- Zona horaria visible y configurable desde Cuenta.
- Vista de mañana con clases, tareas pendientes y materiales necesarios.

## Corregido

- Las relaciones de los materiales ya no pueden mezclar asignaturas, tareas, temas o Bosses incompatibles.
- Las ediciones actualizan también el detalle de la asignatura relacionada.
- Las vistas de calendario dejan de depender de la fecha UTC del servidor para decidir el día que ve la persona.
- La edición de una tarea fija vencida no puede esquivar la protección cambiando su modalidad.

## Solucionado

- Se completaron las acciones de edición y borrado que faltaban en el núcleo académico.
- Se añadieron confirmaciones visibles para las eliminaciones principales.
- Se mantuvo el aislamiento por cuenta en páginas, acciones, API de materiales y asociaciones.
- Se añadió el despliegue reproducible de migraciones mediante `npm run db:deploy`.

## Pruebas realizadas

- 35 grupos de pruebas y 202 pruebas automáticas: todas correctas.
- Lint sin avisos, revisión de tipos correcta y compilación de producción correcta.
- Prisma: esquema válido, formato correcto, migraciones desplegadas y sin migraciones pendientes.
- Auditoría de dependencias: 0 vulnerabilidades con `npm audit --audit-level=high`.
- Recorrido de navegador con datos de prueba: inicio, mañana, asignaturas, detalle de asignatura, tareas, Bosses, notas, objetivos, horario, materiales, calendario diario/semanal/mensual y Cuenta.
- La pestaña final de comprobación no mostró errores ni avisos del navegador.
- Revisión final de permisos: las lecturas y modificaciones académicas usan la cuenta autenticada; las asociaciones también comprueban la cuenta propietaria.

## Cambios en la base de datos

- Migración `20260913210000_phase1_academic_core`: campos académicos ampliados, estados, pesos y cambios puntuales de horario.
- Migración `20260913211000_phase1_goal_subject`: asociación opcional de objetivos a asignaturas.
- `prisma migrate deploy` confirmó que las 14 migraciones del repositorio están aplicadas y que no quedan cambios pendientes.

## Limitaciones restantes

- No queda ninguna tarea pendiente dentro del alcance de la Fase 1.
- Permanecen fuera de esta fase, por decisión de alcance: planner inteligente, temporadas, rangos, logros, cofres, mejoras avanzadas de mascotas, flashcards, repetición espaciada, tests con IA e integraciones externas.
