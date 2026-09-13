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
  - Verificación: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm audit`.
- [x] Commit en `main` y push a `origin/main`.
