# Aula 1B

## IA local (Fase 2)

La sección **IA** usa Ollama a través del backend de Next.js; Ollama nunca se expone directamente al navegador. Para arrancar el proveedor local con el modelo predeterminado:

```bash
ollama serve
ollama pull qwen3.5:9b
```

La URL y el modelo activo se pueden cambiar desde `/app/ai` sin tocar código. La aplicación sigue funcionando si Ollama está apagado o si el modelo aún no está instalado: el chat conserva el mensaje pendiente como error recuperable y muestra el diagnóstico.

El contexto académico se construye en una capa central independiente de Ollama. Las preguntas personales consultan automáticamente solo las categorías autorizadas que necesita la intención; una pregunta amplia como «¿Qué sabes de mí?» sí solicita un resumen de todas las categorías autorizadas. Las preguntas generales siguen respondiéndose sin contexto personal. Un rango temporal común en zona horaria del usuario interpreta hoy, mañana, esta semana, este mes, próximos y recientes, con intervalos de final exclusivo; una búsqueda textual como «matemáticas» no crea por sí sola un rango. El horario filtra el día local cuando se pide hoy o mañana y conserva la semana completa cuando se pide la vista semanal; las tareas/Bosses próximos excluyen registros pasados. Se aplican límites por categoría y de caracteres, sin enviar toda la base de datos. Un fallo de categoría o de material se conserva como aviso y no impide usar el resto del contexto; la respuesta distingue entre ausencia de registros, permiso desactivado, material no disponible y fallo de Ollama/proveedor. Los materiales solo se leen desde almacenamiento al pedir su análisis; cada solicitud tiene presupuesto total, cancelación real y concurrencia limitada. Las imágenes se incluyen únicamente cuando el modelo activo declara soporte de visión. No hay embeddings ni búsqueda semántica.

En `/app/ai`, cada usuario puede activar/desactivar la IA y el contexto académico, y controlar por separado el acceso a notas; tareas, Bosses y objetivos; sesiones y estadísticas; horario y calendario; materiales; y gamificación (XP, nivel, monedas, misiones y racha). Las categorías desactivadas no se consultan ni se publican al modelo. Las respuestas muestran qué contexto se utilizó, qué categorías quedaron bloqueadas u omitidas y los avisos generados durante la respuesta. Las opciones del selector se actualizan al guardar los ajustes, sin recargar la página. Las herramientas disponibles para el modelo son exclusivamente de solo lectura, se ofrecen solo para la necesidad detectada y siempre están limitadas al usuario autenticado. La capa de propuestas para futuras acciones de escritura exige confirmación y no ejecuta cambios en esta fase.

Las respuestas del asistente se muestran con Markdown seguro: negrita, cursiva, títulos, listas, tablas, bloques de código, enlaces y fórmulas matemáticas/químicas como `$CO_2$`. El HTML crudo se omite.

Referencias del proveedor: [API de chat de Ollama](https://docs.ollama.com/api/chat), [streaming](https://docs.ollama.com/capabilities/streaming), [visión](https://docs.ollama.com/capabilities/vision) y [detalles de modelos](https://docs.ollama.com/api-reference/show-model-details).

## Materiales y archivos académicos

El módulo Materiales admite PDF, JPG/JPEG, PNG, GIF, WebP, DOC/DOCX y PPT/PPTX. Cada archivo está limitado a 50 MB; una petición puede contener como máximo 20 archivos y 200 MB en total (`MATERIALS_MAX_FILES` y `MATERIALS_MAX_BATCH_SIZE`). El servidor valida extensión, MIME declarado y firma/contenido básico antes de guardar.

Los metadatos viven en PostgreSQL y los bytes se guardan localmente fuera de `public/`, por defecto en `storage/materials` (o en `MATERIALS_STORAGE_DIR`). Las claves almacenadas en la base de datos son abstractas y todas las operaciones comprueban el usuario autenticado. El almacenamiento local pertenece únicamente a la máquina que ejecuta el servidor: no se sincroniza automáticamente con otros dispositivos.

Cada usuario solo puede tener una copia de un contenido por SHA-256. Los lotes informan por archivo de creaciones, duplicados y fallos; las escrituras limpian el archivo si falla la creación de metadatos y los borrados restauran el archivo si falla la eliminación de la fila (incluidos borrados repetidos). Si una compensación tampoco puede completarse, la API devuelve un fallo explícito para reconciliación operativa y no oculta el éxito parcial. Para copias de seguridad hay que respaldar PostgreSQL y `storage/materials` de forma coordinada; todavía no hay reconciliación automática.

La biblioteca muestra 50 materiales por página y limita a 100 las opciones de asignaturas, temas, tareas y Bosses cargadas en los selectores. Las respuestas de archivos son privadas y sin caché; solo una previsualización del mismo origen permite incrustar PDF o imágenes, mientras que el resto conserva la protección contra clickjacking.

Antes de interpretar el multipart, el servidor rechaza por `Content-Length` o mediante un stream limitado cualquier cuerpo superior al lote configurado más 2 MB de sobrecarga multipart; el límite de archivos y bytes del lote se sigue validando por separado.

Las conversaciones se cargan por páginas de 50 elementos y los mensajes antiguos se incorporan bajo demanda; una URL `/app/ai?chat=<id>` también abre un chat que no esté en la primera página, siempre que pertenezca al usuario autenticado. «Nuevo» sólo limpia y prepara la vista: el chat y sus dos primeros mensajes se crean juntos, en una única transacción, al enviar el primer texto; el cliente y una clave de solicitud única del servidor evitan duplicados incluso con envíos simultáneos. El selector de contexto se vacía y el backend ignora cualquier selección cuando se desactiva el contexto académico o el modo personal del mensaje. Antes de cada respuesta se consultan las capacidades del modelo: las herramientas se envían solo con soporte `tools` y las imágenes solo con soporte `vision`; si la comprobación falla, el chat continúa sin esos extras. El resumen de contexto de cada respuesta es estático y muestra sólo los datos útiles.

Las rutas de IA requieren sesión, aplican límites de solicitudes por usuario (rate limiting en memoria del proceso), cuerpos JSON de 64 KiB leídos por streaming con corte temprano, selecciones de contexto acotadas y un máximo de 4.096 tokens de salida. Las fechas relativas se calculan con la zona horaria guardada en el perfil. Ollama solo acepta `http://localhost`, `127.0.0.1` o `[::1]` (con cualquier puerto local) y las peticiones rechazan redirecciones. Los materiales e imágenes mantienen además sus límites de tamaño, tiempo de procesamiento y cantidad descritos abajo.

`StorageProvider` es el punto de extensión para Cloudflare R2. La implementación actual es únicamente local; no se han añadido R2, OCR ni embeddings.

PWA de organización académica gamificada para 1.º de Bachillerato. La infraestructura inicial de IA local se encuentra en la sección IA; siguen fuera de alcance las funciones sociales y las mecánicas avanzadas.

## Puesta en marcha

Requisitos: Node.js 24+, npm y PostgreSQL. El `compose.yaml` incluido puede levantar PostgreSQL si tienes Docker.

```bash
npm install
cp .env.example .env
npx auth secret
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Antes de ejecutar el seed, sustituye `DEMO_USER_EMAIL` y `DEMO_USER_PASSWORD` en `.env`. También puedes crear una cuenta desde `/register`; recibirá automáticamente las diez asignaturas demo solicitadas.

`AUTH_TRUST_HOST=true` permite a Auth.js confiar en el host servido por Next.js. En producción, mantén esta opción únicamente detrás de un proxy que valide el encabezado `Host`.

### Arranque sencillo en Windows

Con Docker Desktop instalado y `.env` configurado, haz doble clic en `iniciar-aula.bat` desde la carpeta del proyecto. El script prepara el `PATH`, abre Docker Desktop si está cerrado, espera a PostgreSQL, ejecuta Prisma y deja Next.js ejecutándose. Desde PowerShell también puedes usar `npm run start:local`.

## Comprobaciones

```bash
npm test
npm run lint
npm run typecheck
npm run build
npx prisma validate
npm audit
```

Las comprobaciones anteriores se ejecutaron con los scripts del proyecto y finalizaron correctamente.

## Arquitectura

- Next.js App Router, React y TypeScript estricto.
- Server Components para lectura y Server Actions validadas con Zod para mutaciones.
- Auth.js Credentials con cookie de sesión JWT persistente; contraseñas con bcrypt (12 rondas).
- PostgreSQL mediante Prisma; todas las consultas y mutaciones académicas se limitan por usuario.
- Tailwind CSS v4 y componentes shadcn/ui en el repositorio.
- Manifest nativo de Next.js y service worker pequeño. El shell offline es funcional; los datos autenticados siguen requiriendo red.
- Fórmulas provisionales reunidas en `src/lib/config/game.ts`.

Las pautas de implementación siguen la documentación oficial de [PWA en Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps), [formularios y Server Actions](https://nextjs.org/docs/app/guides/forms), [Credentials en Auth.js](https://authjs.dev/getting-started/authentication/credentials), [Prisma con PostgreSQL](https://www.prisma.io/docs/orm/v6/overview/databases/postgresql), [Tailwind con Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs) y [shadcn/ui para Next.js](https://ui.shadcn.com/docs/installation/next).

## Decisiones pendientes

- Fórmulas definitivas de XP, niveles, monedas, racha, dificultad y recompensas.
- Reglas para redistribuir actividades de estudio flexibles.
- Tipos y escalas definitivos de tareas y Bosses.
- Recuperación de contraseña, verificación de email y despliegue.
- Sincronización de datos y mutaciones offline.

No se incluyen mascotas, tienda avanzada, cofres, rangos competitivos, temporadas, Teams, funciones sociales, flashcards ni integraciones externas.
