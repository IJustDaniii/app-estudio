# Aula 1B

## Materiales y archivos académicos

El módulo Materiales admite PDF, JPG/JPEG, PNG, GIF, WebP, DOC/DOCX y PPT/PPTX. Cada archivo está limitado a 50 MB; una petición puede contener como máximo 20 archivos y 200 MB en total (`MATERIALS_MAX_FILES` y `MATERIALS_MAX_BATCH_SIZE`). El servidor valida extensión, MIME declarado y firma/contenido básico antes de guardar.

Los metadatos viven en PostgreSQL y los bytes se guardan localmente fuera de `public/`, por defecto en `storage/materials` (o en `MATERIALS_STORAGE_DIR`). Las claves almacenadas en la base de datos son abstractas y todas las operaciones comprueban el usuario autenticado. El almacenamiento local pertenece únicamente a la máquina que ejecuta el servidor: no se sincroniza automáticamente con otros dispositivos.

Cada usuario solo puede tener una copia de un contenido por SHA-256. Los lotes informan por archivo de creaciones, duplicados y fallos; las escrituras limpian el archivo si falla la creación de metadatos y los borrados restauran el archivo si falla la eliminación de la fila (incluidos borrados repetidos). Si una compensación tampoco puede completarse, la API devuelve un fallo explícito para reconciliación operativa y no oculta el éxito parcial. Para copias de seguridad hay que respaldar PostgreSQL y `storage/materials` de forma coordinada; todavía no hay reconciliación automática.

La biblioteca muestra 50 materiales por página y limita a 100 las opciones de asignaturas, temas, tareas y Bosses cargadas en los selectores. Las respuestas de archivos son privadas y sin caché; solo una previsualización del mismo origen permite incrustar PDF o imágenes, mientras que el resto conserva la protección contra clickjacking.

Antes de interpretar el multipart, el servidor rechaza por `Content-Length` o mediante un stream limitado cualquier cuerpo superior al lote configurado más 2 MB de sobrecarga multipart; el límite de archivos y bytes del lote se sigue validando por separado.

`StorageProvider` es el punto de extensión para Cloudflare R2. La implementación actual es únicamente local; no se han añadido R2, OCR, embeddings ni ninguna función de IA.

PWA de organización académica gamificada para 1.º de Bachillerato. Esta primera versión implementa el núcleo funcional solicitado sin IA, funciones sociales ni mecánicas avanzadas.

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
npm audit
```

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

No se incluyen mascotas, tienda avanzada, cofres, rangos competitivos, temporadas, IA, Teams, funciones sociales, flashcards ni integraciones externas.
