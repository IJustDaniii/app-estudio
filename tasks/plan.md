# Plan de implementación: Fase 3 — mascotas, huevos y tienda básica

## Objetivo

Añadir una primera capa de gamificación de mascotas integrada con el XP académico existente, con catálogo oficial, huevos incubables, evoluciones configurables, inventario normalizado, tienda básica, bestiario y mascotas personalizadas.

## Decisiones de arquitectura

- Las reglas de rareza, precios, probabilidades, XP de incubación, fragmentos y hitos viven en `src/lib/pets/config.ts`; Prisma conserva el catálogo normalizado y el seed lo materializa.
- El servidor obtiene siempre `userId` desde Auth.js. Las mutaciones vuelven a comprobar pertenencia y usan transacciones con restricciones únicas para compras repetibles y mascota activa.
- El XP de mascota solo se aplica a la mascota activa y solo desde recompensas académicas ya validadas: sesiones de estudio, tareas completadas y misiones completadas por el flujo existente. No se añade control manual de XP.
- Las especies oficiales (`PetSpecies`) y mascotas personalizadas (`UserPet` con `source=CUSTOM`) son caminos separados; las personalizadas no tienen rareza competitiva ni entran en el bestiario oficial.
- Los assets iniciales son SVG placeholder estáticos por especie y huevo, preparados para sustituirse por ilustraciones definitivas sin cambiar modelos ni componentes.

## Task List

### Fase 1: Fundación

- [x] Contrato de dominio, configuración centralizada, probabilidades y progresión.
- [x] Modelos Prisma normalizados, índices de aislamiento e idempotencia, migración y seed.

### Checkpoint: Fundación

- [x] Tests de dominio en rojo y después en verde.
- [x] `prisma validate` y generación del cliente correctas.

### Fase 2: Ciclo de juego

- [x] Comprar huevos, iniciar incubación, aplicar XP académico y eclosionar con duplicados en fragmentos.
- [x] Mascota activa única, nivelación, felicidad básica y evoluciones en hitos.
- [x] Tienda e inventario de huevos, fragmentos y cosméticos.

### Checkpoint: Ciclo de juego

- [x] Tests de compra, eclosión, duplicados, mascota activa, progresión y aislamiento por usuario.
- [x] No hay operación de compra o inventario vulnerable a doble envío.

### Fase 3: Experiencia

- [x] Bestiario con descubiertas y siluetas no descubiertas.
- [x] Mascota activa discreta en dashboard/perfil y feedback visual de acciones.
- [x] Mascotas personalizadas con nombre e imagen validada y almacenada de forma segura.

### Checkpoint: Entrega

- [x] `npm test`, `npm run lint`, `npm run typecheck` y `npm run build` pasan.
- [x] Revisión responsive/accesible en escritorio y móvil.
- [x] Commit y push a GitHub completados.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Doble compra por reintento | Alto | `requestId` único por usuario, restricción única y transacción atómica de monedas/huevo. |
| Fuga entre usuarios | Alto | `userId` en todos los modelos de posesión y en cada `where` de mutación/lectura. |
| Dos mascotas activas | Medio | Actualización transaccional, índice único parcial PostgreSQL y test de aislamiento. |
| XP artificial desde el cliente | Alto | Las acciones de mascotas no aceptan XP; el servicio recibe recompensas calculadas por acciones server-side. |
| Upload inseguro | Medio | MIME allowlist, límite de tamaño, nombre de almacenamiento generado y validación de nombre. |

## Fuera de esta entrega

Buffs complejos, eventos de temporada, intercambios, funciones sociales, cofres avanzados, recompensas reales, mascotas exclusivas de rango y castigos severos por abandono.
