# ADR-001: contexto academico adaptativo y gobernado por permisos

Estado: aceptada
Fecha: 2026-09-13

## Decision

La IA usa una capa central `AcademicContextRepository` y una politica determinista de seleccion por intencion. La capa no conoce Ollama ni otro proveedor: recibe la pregunta, los permisos y una seleccion opcional, y devuelve contexto estructurado, texto compacto, materiales compatibles y una instantanea de trazabilidad.

Las lecturas siempre incluyen el `userId` autenticado, limites de filas y campos explicitos. La seleccion manual ya no es necesaria: el servidor calcula automaticamente las categorias autorizadas que necesita cada pregunta. El usuario puede omitir el contexto personal en un mensaje y puede revocar categorias desde Ajustes.

Las intenciones de horario semanal se limitan a horario y calendario. El texto de busqueda y el rango temporal son parametros separados; `recientes` usa un intervalo pasado y el calendario filtra por texto. Las fechas usan la zona horaria del perfil.

Los materiales se limitan a metadatos salvo que la pregunta solicite analisis. El procesamiento tiene limites por archivo, lote, tiempo, concurrencia, imagenes y bytes, y registra los elementos que no se analizaron. Los datos de materiales se tratan como referencias no confiables y no pueden cambiar las instrucciones del sistema.

Las herramientas de lectura y la busqueda web reciben repositorios acotados, nunca Prisma. Internet requiere permiso global y consentimiento por mensaje; solo recibe una consulta textual, usa HTTPS publico y devuelve enlaces saneados. No recibe contexto personal ni archivos.

Las acciones de escritura se representan como propuestas persistentes. Se validan con los esquemas existentes, comprueban pertenencia, se auditan y requieren un token de confirmacion de un solo uso. No se permiten cambios de XP, monedas, nivel, racha, recompensas, logros, estadisticas ni finalizaciones artificiales. Las sesiones se mantienen en el temporizador porque sus escrituras activan estadisticas y recompensas.

## Motivos

- Reduce la exposicion de datos y evita enviar la base de datos completa.
- Mantiene el proveedor de IA detras de un contrato estable.
- Hace verificables aislamiento, permisos, limites, confirmaciones e idempotencia.
- Permite ofrecer Internet actualizado sin mezclarlo con los datos personales.

## Consecuencias

Las respuestas generales no necesitan contexto personal. Las preguntas personales usan solo las categorias relevantes y autorizadas, y una pregunta amplia puede solicitar todas las categorias autorizadas. Cada respuesta guarda modo, intencion, categorias usadas, bloqueos, omisiones y avisos en `contextSnapshot`.

Los chats nuevos se crean de forma perezosa y los mensajes usan una clave idempotente. Las mutaciones de la IA son propuestas, no cambios silenciosos: la interfaz muestra el resumen y espera confirmacion.
