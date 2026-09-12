# Aula 1B

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
