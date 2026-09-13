# ADR-001: contexto académico adaptativo y gobernado por permisos

Estado: aceptada
Fecha: 2026-09-13

## Decisión

La IA usa una capa central `AcademicContextRepository` y una política determinista de selección por intención. La capa no conoce Ollama ni otro proveedor: recibe una pregunta, una selección opcional y los permisos del usuario, y devuelve contexto estructurado, texto compacto, materiales compatibles y una instantánea de trazabilidad.

Las lecturas se ejecutan siempre con el `userId` autenticado, límites de filas y campos explícitos. Cuando la pregunta requiere datos personales, se consultan solo las categorías autorizadas necesarias para la intención; una petición explícita y amplia de información personal activa un resumen de todas las categorías autorizadas. La selección manual sólo prioriza registros concretos. Las herramientas del modelo reciben un repositorio de solo lectura acotado por los mismos permisos, zona horaria, rango temporal y alcance de asignatura; nunca reciben Prisma. Las categorías de notas, planificación, sesiones/estadísticas, horario/calendario, materiales y gamificación se pueden revocar de forma independiente. Asignaturas y temas sirven como base para resolver el alcance.

La IA y el contexto académico están desactivados de forma independiente desde los ajustes. Cada mensaje puede omitir el contexto personal. El contexto usado, bloqueado, omitido y los avisos producidos durante el streaming quedan registrados en `contextSnapshot` y se muestran en la conversación. Las fechas relativas usan la zona horaria del perfil: el texto de búsqueda y el rango temporal son parámetros independientes; notas y sesiones respetan `from/to`, el horario filtra un día solo en peticiones diarias y una petición semanal conserva todos los días. Los materiales se limitan a metadatos salvo petición de análisis o selección explícita; el procesamiento de contenido tiene límites por archivo y globales, concurrencia acotada y cancelación propagada al parser PDF/Office. La creación de chats nuevos es perezosa y las solicitudes llevan una clave idempotente. No se implementan todavía escrituras, flashcards ni acciones asistidas.

## Motivos

- Reduce exposición de datos y evita enviar la base de datos completa en cada turno.
- Permite mantener Ollama y futuros proveedores detrás del contrato `AIProvider`.
- Hace verificables el aislamiento por usuario, los permisos y la ausencia de consultas cuando el modo personal está apagado.
- Deja un punto estable para añadir propuestas de escritura con confirmación en una fase posterior.

## Consecuencias

El clasificador actual es intencionadamente compacto y determinista; no sustituye un sistema RAG ni embeddings. Las respuestas generales no requieren contexto personal y las preguntas personales usan únicamente las categorías autorizadas relevantes aunque no haya selección manual; una pregunta amplia es la excepción documentada. Los valores por defecto mantienen la compatibilidad con la integración existente, pero el usuario conserva el control granular desde Ajustes.
