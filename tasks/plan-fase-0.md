# Plan de implementación: Fase 0 — Integridad y contratos

El repositorio ya contiene un plan completado para la Fase 3 en `tasks/plan.md`; este plan separado evita sobrescribir su historial.

## Mapa de capacidades

| Módulo | Responsabilidad | Depende de |
| --- | --- | --- |
| reglas-progreso | Reglas centralizadas de XP, monedas, niveles, racha y misiones | — |
| sesiones-seguras | Inicio firmado por servidor, validación de duración e idempotencia | reglas-progreso, identidad |
| recompensas-idempotentes | Actualizaciones atómicas de misiones y tareas | reglas-progreso, base de datos |
| documentación-pruebas | Contratos, decisiones, pruebas y notas del parche | todos |

Orden: `reglas-progreso` → `sesiones-seguras` → `recompensas-idempotentes` → `documentación-pruebas`.

## Tareas

### 1. Reglas y contratos de dominio

- [ ] Extraer las decisiones de validación de sesiones y el resultado atómico de misiones a funciones pequeñas.
- [ ] Escribir pruebas que fallen para los límites y los reintentos.
- [ ] Verificar reglas existentes y centralizar sus nombres.

### 2. Sesiones seguras

- [ ] Añadir una marca de inicio firmada por el servidor.
- [ ] Derivar y comprobar los límites desde la marca de inicio y el reloj del servidor.
- [ ] Añadir una clave única por usuario y una transacción que guarde y pague una vez.
- [ ] Adaptar el temporizador para usar el contrato nuevo y mostrar errores comprensibles.

### 3. Recompensas idempotentes

- [ ] Pagar XP y monedas al reclamar una misión únicamente en el cambio atómico a completada.
- [ ] Mantener la protección de primera finalización de tareas y su transacción.
- [ ] Usar la zona horaria del usuario para misiones y rachas.

### 4. Documentación y cierre

- [ ] Actualizar README y SPEC para retirar contradicciones sobre las reglas actuales.
- [ ] Registrar la decisión importante en un ADR y añadir notas del parche.
- [ ] Ejecutar todas las comprobaciones y revisar el diff final.

## Puntos de control

- Después de las tareas 1 y 2: pruebas y tipos en verde.
- Después de la tarea 3: pruebas, lint, Prisma y build en verde.
- Cierre: auditoría de dependencias, revisión de calidad, commit limpio en `main` y push confirmado.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Dos peticiones completan una misión al mismo tiempo | Alto | Actualización condicionada por `isComplete=false` dentro de transacción serializable. |
| El navegador falsea el inicio o la duración | Alto | Marca firmada por servidor y comprobación contra su reloj; el servidor no usa fechas de finalización del navegador. |
| Un reintento vuelve a pagar la sesión | Alto | Índice único por usuario y `requestId`, creación y recompensa en la misma transacción. |
| Confusión entre hora local y UTC | Medio | Día y racha calculados con la zona horaria guardada del usuario. |
