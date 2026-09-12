# Plan de implementación

## Arquitectura

- App Router con Server Components y Server Actions para reducir superficie de API.
- PostgreSQL con Prisma; cada entidad académica pertenece a un usuario.
- Auth.js Credentials con JWT persistente y contraseñas bcrypt.
- Reglas provisionales puras en `src/lib/config` y `src/lib/domain`.
- Service worker mínimo: shell estático y fallback offline, sin prometer datos mutables offline.

## Orden

1. Base del proyecto, diseño, PWA y controles de calidad.
2. Modelo Prisma, autenticación y seed.
3. Áreas académicas y calendario.
4. Temporizador, progreso y estadísticas.
5. Dashboard y heurística.
6. Verificación integral y documentación.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| PostgreSQL no disponible en la máquina | Verificar schema/build sin conexión y documentar `DATABASE_URL`; probar UI pública localmente. |
| Alcance amplio | Mantener CRUD compacto, sin automatizaciones o reglas no pedidas. |
| Offline con datos autenticados | Cachear solo shell/recursos seguros; dejar sincronización de mutaciones fuera de alcance. |
| Reglas de juego sin definir | Centralizar constantes provisionales y cubrirlas con pruebas. |

