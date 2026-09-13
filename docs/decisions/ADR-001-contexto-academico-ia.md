# ADR-001: contexto académico adaptativo y gobernado por permisos

Estado: aceptada
Fecha: 2026-09-13

## Decisión

La IA usa una capa central `AcademicContextRepository` y una política determinista de selección por intención. La capa no conoce Ollama ni otro proveedor: recibe una pregunta, una selección opcional y los permisos del usuario, y devuelve contexto estructurado, texto compacto, materiales compatibles y una instantánea de trazabilidad.

Las lecturas se ejecutan siempre con el `userId` autenticado, límites de filas y campos explícitos. Las herramientas del modelo reciben un repositorio de solo lectura acotado por la misma selección, permisos, zona horaria y alcance de asignatura; nunca reciben Prisma. El selector determinista reconoce necesidades frecuentes en español y ofrece únicamente las herramientas necesarias dentro de cada categoría: por ejemplo, objetivos no habilita tareas ni Bosses, y una duda de asignatura no habilita planificación si no se solicita. Las categorías de notas, planificación, sesiones/estadísticas, horario/calendario, materiales y gamificación se pueden revocar de forma independiente. Asignaturas y temas sirven como base para resolver el alcance.

La IA y el contexto académico están desactivados de forma independiente desde los ajustes. Cada mensaje puede omitir el contexto personal. El contexto usado, bloqueado, omitido y los avisos producidos durante el streaming quedan registrados en `contextSnapshot` y se muestran en la conversación. Las fechas relativas usan la zona horaria del perfil, incluyendo el rango completo del día local actual. Los materiales se limitan a metadatos salvo petición de análisis o selección explícita; el procesamiento de contenido tiene límites de tamaño y tiempo. No se implementan todavía escrituras, flashcards ni acciones asistidas.

## Motivos

- Reduce exposición de datos y evita enviar la base de datos completa en cada turno.
- Permite mantener Ollama y futuros proveedores detrás del contrato `AIProvider`.
- Hace verificables el aislamiento por usuario, los permisos y la ausencia de consultas cuando el modo personal está apagado.
- Deja un punto estable para añadir propuestas de escritura con confirmación en una fase posterior.

## Consecuencias

El clasificador actual es intencionadamente compacto y determinista; no sustituye un sistema RAG ni embeddings. Las respuestas pueden necesitar una selección manual si la pregunta no identifica una asignatura o necesidad concreta. Los valores por defecto mantienen la compatibilidad con la integración existente, pero el usuario conserva el control granular desde Ajustes.
