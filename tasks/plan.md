# Plan de implementacion: integracion completa de IA

## Objetivo

Completar la IA de Aula 1B sin romper la arquitectura existente: contexto personal automatico, respuestas seguras, chat perezoso e idempotente, Internet opcional y herramientas de datos con confirmacion.

## Decisiones de arquitectura

- `AIProvider` mantiene el contrato independiente de Ollama y los Route Handlers controlan autenticacion, limites y streaming.
- `AcademicContextRepository` aplica usuario, permisos, zona horaria, rangos, filtros, limites y trazabilidad.
- El cliente no necesita elegir registros. El servidor interpreta la pregunta y calcula el contexto autorizado.
- Las propuestas de cambio se validan con los esquemas existentes y se ejecutan solo despues de una confirmacion explicita.
- Internet esta separado del repositorio personal: requiere dos permisos, solo consulta HTTPS publico, no recibe contexto personal y devuelve fuentes enlazables.
- No se exponen SQL, codigo arbitrario ni modificaciones de economia, estadisticas, recompensas o estados derivados.

## Entregado

- [x] Intenciones de horario semanal, recientes y busqueda textual de calendario.
- [x] Contexto automatico, permisos por categoria, limites y avisos de imagenes/materiales omitidos.
- [x] Resumen de contexto plano sin flecha ni desplegable vacio.
- [x] Nuevo chat local hasta el primer envio y mensajes idempotentes.
- [x] Busqueda web con consentimiento, fuentes, limites y bloqueo de SSRF/redes privadas.
- [x] Propuestas CRUD para asignaturas, temas, tareas, Bosses/examenes, notas, objetivos, horario, calendario y metadatos de materiales.
- [x] Confirmacion de un solo uso, caducidad, pertenencia, auditoria y reintentos seguros.
- [x] Rechazo de economia, recompensas, logros, estadisticas, sesiones y completado artificial de tareas.
- [x] Pruebas unitarias, de repositorio, interfaz, rutas y seguridad.
- [x] Documentacion actualizada y validaciones finales.

## Verificacion

Se ejecutaron `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npx prisma validate` y `npm audit --audit-level=high`. Despues se revisa el estado de Git, se hace commit en `main` y se publica en `origin/main`.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
| --- | --- |
| Ollama apagado o lento | Timeouts, abortos y errores recuperables. |
| Fuga entre usuarios | `userId` obligatorio en lecturas, propuestas y confirmaciones. |
| Instrucciones maliciosas en materiales | Materiales tratados como datos, nunca como instrucciones. |
| Archivos o respuestas grandes | Limites por cuerpo, archivo, lote, salida, tiempo y concurrencia. |
| SSRF en Internet u Ollama | URLs validas y redes privadas bloqueadas; sin redirecciones. |
| Doble clic o reintento | Restricciones unicas y estados atomicos de propuesta/mensaje. |
| Cambio destructivo inesperado | Resumen, token de confirmacion, caducidad y auditoria. |
