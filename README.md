# Aula 1B

PWA de organizacion academica gamificada para 1.o de Bachillerato.

## IA

La seccion `/app/ai` usa Ollama a traves del backend de Next.js; Ollama nunca se expone directamente al navegador. Para iniciar el proveedor local:

```bash
ollama serve
ollama pull qwen3.5:9b
```

La URL y el modelo se pueden cambiar desde los ajustes de IA. Si Ollama esta apagado, el chat conserva un error recuperable y ofrece reintentar sin mostrar detalles internos.

El contexto personal autorizado se calcula automaticamente para cada pregunta. No es necesario escoger registros manualmente. El usuario puede desactivar el contexto personal de un mensaje, y cada categoria tiene su propio permiso: notas; tareas, Bosses y objetivos; sesiones y estadisticas; horario y calendario; materiales; y gamificacion. La respuesta indica que se uso, que quedo bloqueado, que se omitio por limites y que datos no estaban disponibles.

La deteccion entiende hoy, manana, semana, mes, proximos y recientes. `horario semanal` consulta unicamente horario y calendario. Las busquedas del calendario separan el texto de las fechas y filtran por titulo. Las fechas usan la zona horaria del perfil y los intervalos terminan de forma exclusiva.

Los materiales se leen desde el almacenamiento privado solo cuando la pregunta lo necesita. El procesamiento tiene limites por archivo, lote, tiempo, concurrencia, numero de imagenes y bytes de imagen. Si se supera un limite, se muestran los nombres de los elementos que no se analizaron. Las imagenes solo se envian cuando el modelo activo declara soporte de vision.

### Internet

La busqueda web se permite unicamente al marcar la casilla de la barra inferior del chat en ese mensaje. Devuelve resultados con titulo, dominio y enlace, diferenciados del contexto de la aplicacion. Tiene limite de consulta, tiempo, respuesta, frecuencia y dominios configurables mediante `AI_WEB_ALLOWED_DOMAINS`.

La busqueda solo usa HTTPS publico, rechaza localhost, redes privadas, rangos reservados, credenciales, puertos y redirecciones. No recibe contexto personal ni archivos de la aplicacion. Si no esta disponible, el asistente lo explica y continua con una respuesta basada en los datos de Aula 1B.

### Cambios sobre la aplicacion

La IA puede preparar propuestas para crear, consultar, modificar o eliminar asignaturas, temas, tareas, Bosses/examenes, notas, objetivos, horario, calendario derivado y metadatos de materiales. Cada propuesta se valida con los mismos esquemas que la aplicacion, comprueba usuario y pertenencia, se registra en auditoria y caduca. La interfaz muestra el resumen y exige una confirmacion explicita antes de modificar o borrar.

Las sesiones de estudio siguen gestionandose desde el temporizador porque registrarlas cambia estadisticas y recompensas. La IA tampoco puede tocar XP, monedas, nivel, racha, recompensas, logros, estadisticas ni marcar tareas como completadas. Las propuestas no reciben acceso a SQL, codigo arbitrario ni servicios sin autorizacion.

Los chats nuevos son borradores locales. Solo se crea el chat al enviar el primer mensaje; una clave de solicitud evita duplicados en dobles clics y reintentos.

## Materiales y archivos

Materiales admite PDF, JPG/JPEG, PNG, GIF, WebP, DOC/DOCX y PPT/PPTX. Cada archivo tiene un maximo de 50 MB, cada lote 20 archivos y 200 MB (`MATERIALS_MAX_FILES` y `MATERIALS_MAX_BATCH_SIZE`). El servidor valida extension, MIME y firma basica antes de guardar.

Los metadatos viven en PostgreSQL y los bytes se guardan fuera de `public/`, por defecto en `storage/materials` o en `MATERIALS_STORAGE_DIR`. Todas las operaciones comprueban el usuario autenticado. Las eliminaciones usan compensacion para no dejar el archivo y sus metadatos en estados distintos.

## Puesta en marcha

Requisitos: Node.js 24+, npm y PostgreSQL. El `compose.yaml` puede levantar PostgreSQL con Docker.

```bash
npm install
cp .env.example .env
npx auth secret
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Antes del seed, sustituye `DEMO_USER_EMAIL` y `DEMO_USER_PASSWORD` en `.env`. Tambien puedes crear una cuenta desde `/register`.

En Windows, puedes usar `iniciar-aula.bat` o `npm run start:local`.

## Comprobaciones

```bash
npm test
npm run lint
npm run typecheck
npm run build
npx prisma validate --schema prisma/schema.prisma
npx prisma format --schema prisma/schema.prisma --check
npm audit --audit-level=high
```

Las reglas activas de XP, monedas, niveles, rachas y misiones, junto con la protección de sesiones y recompensas repetidas, están documentadas en [docs/fase-0-integridad.md](docs/fase-0-integridad.md). Las decisiones importantes de esta fase están en [ADR-002](docs/decisions/ADR-002-integridad-progreso-y-estudio.md).

## Arquitectura

- Next.js App Router, React y TypeScript estricto.
- Server Components y Server Actions validadas con Zod.
- Auth.js Credentials con contrasenas protegidas con bcrypt.
- PostgreSQL mediante Prisma, con aislamiento por usuario.
- Tailwind CSS v4 y componentes shadcn/ui.
- Contratos de IA independientes del proveedor, con streaming y limites.
- Propuestas de IA persistentes, confirmables, de un solo uso y auditadas.

Las pautas siguen la documentacion oficial de [Next.js](https://nextjs.org/docs), [Ollama](https://docs.ollama.com/api/chat), [Auth.js](https://authjs.dev/), [Prisma](https://www.prisma.io/docs) y [Tailwind](https://tailwindcss.com/docs).

## Fuera del alcance de la Fase 0

- Las cifras de XP, niveles, monedas, racha y recompensas son las reglas actuales de esta fase; cualquier cambio futuro requerirá una fase posterior.
- Reglas para redistribuir actividades de estudio flexibles.
- Recuperación de contraseña, verificación de email y despliegue.
- Sincronización offline de datos.

Las mascotas, los huevos y la tienda básica pertenecen a la Fase 3 ya existente. No se incluyen tienda avanzada, temporadas, Teams, funciones sociales, flashcards ni integraciones externas adicionales.
