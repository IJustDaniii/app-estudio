# Tareas — infraestructura inicial de IA

## Fundación

- [x] Contratos `AIProvider`, errores y esquemas Zod.
  - Aceptación: contrato agnóstico, errores normalizados y límites validados.
  - Verificación: pruebas unitarias enfocadas y typecheck.
- [x] Persistencia Prisma por usuario.
  - Aceptación: configuración, chats y mensajes con cascadas e índices.
  - Verificación: `prisma generate` y migración SQL revisada.

## Proveedor y contexto

- [x] `OllamaProvider` con conexión, capacidades, streaming y timeouts.
  - Aceptación: NDJSON fragmentado funciona y los fallos se clasifican.
  - Verificación: pruebas con transporte falso, sin Ollama real.
- [x] Constructor de contexto y materiales.
  - Aceptación: sólo IDs propios seleccionados, límite estricto y soporte de texto/imágenes compatibles.
  - Verificación: pruebas de inclusión, recorte, aislamiento y errores de extracción.
- [x] Herramientas de lectura y capa de propuestas.
  - Aceptación: tareas, Bosses, notas y asignaturas son consultables; ninguna escritura puede ejecutarse.
  - Verificación: pruebas del registro y permisos.

## Producto

- [x] APIs autenticadas de ajustes, chats y mensajes.
  - Aceptación: CRUD, streaming persistente, validación y errores consistentes.
  - Verificación: typecheck y pruebas de servicios/orquestación.
- [x] Interfaz principal IA responsive y accesible.
  - Aceptación: nuevo chat, cambio, renombrado, borrado, streaming, selector de contexto, materiales y ajustes.
  - Verificación: navegador en escritorio y móvil, sin errores de consola.

## Cierre

- [x] Documentación y controles finales.
  - Verificación: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npx prisma validate`, `npm audit`.
- [x] Commit en `main` y push a `origin/main`.

## Endurecimiento revisado

- [x] Contexto desactivado y capacidades del modelo respetadas en cliente y servidor.
  - Verificación: pruebas de selección efectiva, tools desactivadas y proveedor sin capacidades opcionales.
- [x] Paginación progresiva de conversaciones/mensajes y apertura de chats antiguos por URL.
  - Verificación: typecheck, build y revisión de rutas autenticadas con aislamiento por `userId`.
- [x] URL de Ollama, rate limiting, cuerpos y salida acotados.
  - Verificación: pruebas de validación, rate limiter, errores del proveedor y `npm audit` sin vulnerabilidades.
- [x] Comprobaciones finales repetidas tras los cambios.
  - Verificación: `npm test` (58 pruebas), `npm run lint`, `npm run typecheck`, `npm run build`, `npx prisma validate` y `npm audit` sin vulnerabilidades.

## Extensión: contexto académico adaptativo

- [x] Contrato de política y selección por intención.
  - Aceptación: clasifica hoy/planificación, asignatura/materiales, rendimiento, horario y gamificación; deduplica selecciones y aplica límites configurables.
  - Verificación: pruebas unitarias de intención, límites y ausencia de datos cuando el modo personal está apagado.
- [x] Repositorio central de lecturas académicas y migración de permisos.
  - Aceptación: consulta temas, calendario, estadísticas y gamificación además de las entidades existentes; todas las lecturas filtran por usuario y categoría.
  - Verificación: pruebas de aislamiento y permisos, `prisma validate` y `prisma generate`.
- [x] Herramientas de lectura y chat gobernados por permisos.
  - Aceptación: las herramientas disponibles coinciden con las categorías autorizadas; categorías desactivadas no se consultan ni llegan al proveedor; IA desactivada bloquea sólo el chat.
  - Verificación: pruebas de herramientas, ruta de mensajes y comportamiento sin contexto personal.
- [x] Ajustes de usuario y trazabilidad visible.
  - Aceptación: interruptores independientes, selector filtrado, opción por mensaje sin contexto y resumen de contexto usado por respuesta.
  - Verificación: pruebas de render, typecheck, lint y comprobación responsive del chat.

## Checkpoint: extensión completa

- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] `npx prisma validate`
- [x] `npm audit --audit-level=high`
- [x] Commit y push a `origin/main`

## Corrección de integración IA

- [x] Separar búsqueda textual y rango temporal; corregir hoy, mañana, semana, mes, próximos y recientes.
- [x] Corregir detector de intención y fallback personal.
- [x] Evitar consultas duplicadas y carga innecesaria sin romper permisos ni estados de contexto.
- [x] Ampliar ayuda interna verificable y declarar límites de lectura/web.
- [x] Robustecer parser de materiales con cancelación, presupuesto global, concurrencia y fallos recuperables.
- [x] Mantener chat nuevo perezoso, añadir idempotencia y conservar el resumen sin desplegable de contexto.
- [x] Ejecutar pruebas, lint, typecheck, build, Prisma y Ollama; comittear en `main` y publicar.
