# Plan de implementación: infraestructura inicial de IA

## Objetivo

Añadir chat de IA local mediante Ollama sin acoplar el resto de la aplicación al proveedor, con persistencia por usuario, streaming, contexto académico automático y acotado, materiales existentes y herramientas iniciales de solo lectura.

## Decisiones de arquitectura

- `AIProvider` define el contrato independiente del proveedor; `OllamaProvider` implementa la API REST local y transforma NDJSON en eventos internos.
- Todas las llamadas a Ollama pasan por Route Handlers de Node. La URL configurable se valida como HTTP de loopback para impedir SSRF.
- La configuración, chats y mensajes pertenecen a un usuario. Todas las consultas vuelven a comprobar `userId` en el servidor.
- El contexto consulta automáticamente las categorías autorizadas cuando procede; el backend recupera campos permitidos, aplica límites y la selección manual sólo prioriza IDs concretos. Registra una instantánea mínima en el mensaje.
- Los materiales se leen desde `StorageProvider`; el texto se extrae con límites de bytes/caracteres y las imágenes sólo se envían tras confirmar capacidad `vision` del modelo.
- Las herramientas iniciales consultan asignaturas, tareas, Bosses y notas. El contrato de futuras escrituras exige propuesta y confirmación, sin ejecutar mutaciones en esta fase.
- Los errores de Ollama son estados recuperables del chat y no afectan a ninguna otra ruta de la aplicación.

## Tareas

1. Definir contratos, errores, validación y modelos Prisma de IA.
2. Implementar y probar `OllamaProvider`, streaming, timeouts y detección de capacidades.
3. Implementar y probar construcción de contexto, extracción de texto/materiales y herramientas de lectura.
4. Implementar APIs autenticadas para configuración, chats, mensajes y streaming persistente.
5. Construir la sección principal IA, selector explícito de contexto y ajustes integrados en el diseño actual.
6. Actualizar documentación y ejecutar pruebas, lint, typecheck, build, audit y verificación de navegador.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Ollama apagado, lento o sin modelo | Timeouts, abortos, códigos de error estables y UI reintentable. |
| Fuga entre usuarios | Filtros `userId` obligatorios y pruebas de contexto con IDs ajenos. |
| Prompt injection en materiales | Los materiales se etiquetan como datos no confiables y las herramientas sólo permiten lectura. |
| Archivos grandes o malformados | Tipos permitidos, límites de bytes/caracteres y fallos aislados por material. |
| URL configurable usada como SSRF | Sólo `http://localhost`, `127.0.0.1` o `[::1]`, sin credenciales ni rutas arbitrarias. |
| Respuesta interrumpida | Mensaje asistente con estado de error y conversación reutilizable. |

## Fuera de alcance

Embeddings, búsqueda semántica, RAG, flashcards, repetición espaciada, tests automáticos, análisis de exámenes, Teams y cualquier escritura automática o destructiva sobre datos académicos.

## Extensión: contexto adaptativo y privacidad por categoría

- `AcademicContextPolicy` decide la intención de una pregunta y las categorías mínimas necesarias sin depender de Ollama ni de otro proveedor.
- Las consultas se ejecutan en `AcademicContextRepository`, que aplica siempre `userId`, permisos, límites de filas y selección de campos. Las herramientas reciben el mismo alcance y nunca Prisma.
- Las categorías de configuración son notas; planificación (tareas, Bosses y objetivos); sesiones/estadísticas; horario/calendario; materiales; y gamificación (XP, nivel, monedas, misiones y racha). Asignaturas y temas forman la base académica no sensible.
- Cada respuesta guarda un resumen serializable del modo, intención, categorías usadas, elementos incluidos/omitidos y avisos. La UI lo muestra de forma compacta.

## Corrección de integración IA: búsquedas, intención y robustez

Esta ampliación corrige regresiones detectadas sobre la infraestructura anterior sin cambiar el contrato de lectura ni permitir escrituras automáticas.

### Fase 1: rango temporal y herramientas

- [x] Separar texto de búsqueda y rango temporal en contexto y herramientas.
- [x] Aplicar rangos explícitos a tareas, sesiones, calendario y notas; mantener búsquedas textuales sin rango implícito.
- [x] Filtrar el horario por día solo para consultas diarias y conservar la semana completa cuando se solicite.

### Fase 2: intención y contexto autorizado

- [x] Reconocer progreso, organización semanal y próximamente en español natural.
- [x] Añadir fallback seguro para preguntas personales ambiguas y resumen completo para preguntas amplias.
- [x] Evitar consultas duplicadas y categorías no relevantes, preservando aislamiento, permisos, límites, avisos y estados vacíos.

### Fase 3: ayuda interna verificable

- [x] Actualizar la ayuda que recibe el proveedor con pantallas, funciones, ajustes, límites y flujos presentes en la aplicación.
- [x] Declarar de forma explícita que la IA solo lee y no tiene acceso web.

### Fase 4: materiales y creación perezosa de chats

- [x] Añadir presupuesto global, concurrencia limitada y errores aislados por material.
- [x] Propagar cancelación a los parsers PDF/Office y al almacenamiento.
- [x] Mantener “Nuevo chat” perezoso y hacer idempotentes los envíos simultáneos.

### Checkpoint de corrección

- [x] Pruebas de regresión para búsquedas, fechas, intención, permisos, materiales y chats.
- [x] `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` y `npx prisma validate`.
- [x] Comprobación real contra Ollama documentada con resultado verificable: `POST http://127.0.0.1:11434/api/chat` con `qwen3.5:9b` y `think=false` devolvió `OLLAMA_DONE=True` y `OK-AULA1B`.
