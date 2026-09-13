# ADR-003 — Núcleo académico de la Fase 1

## Estado

Aceptada y aplicada.

## Contexto

La Fase 0 dejó protegida la sesión y las reglas de progreso. La Fase 1 necesita convertir esa base en un núcleo académico útil sin mezclar todavía las funciones de planificación inteligente, temporadas, logros, flashcards, pruebas con IA ni integraciones externas.

## Decisiones

- Cada lectura y cada cambio se limita a la cuenta autenticada. Las acciones comprueban la pertenencia de cada registro y de cada asociación antes de guardar.
- Las obligaciones fijas representan una fecha real. Una vez vencidas se pueden corregir sus datos, pero no se pueden mover ni convertir en estudio flexible. El estudio flexible sí puede cambiar de fecha o quedarse sin fecha.
- Las asignaturas guardan icono, profesor, aula, dificultad y notas. Los materiales pueden relacionarse con asignatura, tema, tarea y Boss, siempre dentro de la misma cuenta.
- Los Bosses tienen los estados próximo, preparado y realizado. La nota esperada se mantiene separada de la nota real para poder comparar ambas.
- Las notas usan pesos positivos. La aplicación muestra la media ponderada, la evolución acumulada y la nota necesaria para alcanzar un objetivo.
- Los cambios puntuales del horario son eventos separados del horario semanal. Sustituyen o cancelan una clase concreta y no alteran las semanas posteriores.
- El calendario y la vista de mañana calculan las fechas con la zona horaria guardada en el perfil. La zona se muestra y se puede cambiar desde Cuenta.
- Las eliminaciones requieren confirmación en la interfaz y vuelven a comprobar autenticación y pertenencia en el servidor.

## Consecuencias

El modelo conserva la diferencia entre planificación real y estudio orientativo, evita que una obligación vencida desaparezca por una edición y permite consultar el contexto académico desde la asignatura, el calendario y la agenda de mañana. Los cambios de esta fase no activan ni amplían funcionalidades posteriores.

## Comprobación

Las reglas tienen pruebas unitarias; las pantallas principales tienen pruebas de componentes y un recorrido comprobado en navegador con datos de prueba. La lista completa de comprobaciones está en [la auditoría de la Fase 1](../auditoria-fase-1.md).
