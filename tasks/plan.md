# Plan de implementación: infraestructura inicial de IA

## Objetivo

Añadir chat de IA local mediante Ollama sin acoplar el resto de la aplicación al proveedor, con persistencia por usuario, streaming, contexto académico explícito y acotado, materiales existentes y herramientas iniciales de solo lectura.

## Decisiones de arquitectura

- `AIProvider` define el contrato independiente del proveedor; `OllamaProvider` implementa la API REST local y transforma NDJSON en eventos internos.
- Todas las llamadas a Ollama pasan por Route Handlers de Node. La URL configurable se valida como HTTP de loopback para impedir SSRF.
- La configuración, chats y mensajes pertenecen a un usuario. Todas las consultas vuelven a comprobar `userId` en el servidor.
- El contexto sólo contiene IDs seleccionados explícitamente. El backend recupera campos permitidos, aplica límites y registra una instantánea mínima en el mensaje.
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
