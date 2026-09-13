# Plan de implementacion: Fase 1 — Nucleo academico

## Objetivo

Completar el nucleo academico de Aula 1B sobre la base cerrada de Fase 0: datos completos de asignaturas, temas, tareas, materiales, Bosses, notas, objetivos, horario y calendario. Toda lectura y todo cambio seguira limitado a la cuenta autenticada.

## Alcance

Incluye edicion y eliminacion con confirmacion, detalle de asignatura, obligaciones fijas y estudio flexible, proteccion de entregas vencidas, asociaciones entre materiales y entidades academicas, ciclo de Bosses, notas ponderadas y evolucion, calculo de nota necesaria, objetivos academicos/personales, cambios puntuales de horario, vista de manana, calendario diario/semanal/mensual y zona horaria visible.

No incluye planner inteligente, temporadas, rangos, logros, cofres, mejoras avanzadas de mascotas, flashcards, repeticion espaciada, tests con IA ni integraciones externas. Las funciones posteriores que ya existan en el repositorio quedan fuera de esta ronda y no se modifican.

## Decisiones importantes

- Las asignaturas guardan un icono de un catalogo cerrado, profesor, aula, dificultad, notas y color. El catalogo evita que una cadena introducida por el usuario se convierta en una imagen o codigo.
- Una tarea fija conserva su fecha vencida: se pueden corregir sus datos, pero no cambiar ni quitar la fecha una vez vencida. El estudio flexible puede cambiar o quitar su fecha orientativa.
- Un Boss tiene estado explicito: proximo, preparado o realizado. Al marcarlo realizado se conserva la nota esperada y se puede guardar la nota real para compararlas.
- Cada nota tiene un peso relativo positivo. Las medias y la nota necesaria se calculan con esos pesos; la evolucion muestra la media acumulada despues de cada nota.
- Los eventos puntuales de horario se guardan separados del horario semanal, con fecha concreta, para no alterar todas las semanas futuras.
- El navegador solo pide borrar; la confirmacion ocurre antes del envio y el servidor vuelve a comprobar autenticacion y pertenencia.

## Dependencias

```text
Prisma y validacion
    → acciones protegidas
        → formularios y detalle
            → calendario, mañana y comprobacion navegador
```

## Tareas

### Bloque 1: modelo y reglas

1. Modelo ampliado de asignaturas, objetivos, notas, Bosses y eventos puntuales; migracion segura.
2. Validaciones y dominio puro para vencimientos, Bosses, medias ponderadas y nota necesaria.
3. Acciones autenticadas de edicion/eliminacion para asignaturas, temas, tareas, Bosses, notas y objetivos.

### Bloque 2: recorridos academicos

4. Formularios de asignaturas y detalle de asignatura con todas sus relaciones.
5. Edicion completa de tareas y proteccion de obligaciones fijas vencidas.
6. Ciclo de Bosses, comparacion esperada/real y asociaciones de materiales.
7. Notas ponderadas, evolucion y calculadora de nota necesaria.
8. Objetivos clasificados y cambios puntuales de horario.

### Bloque 3: tiempo y cierre

9. Vistas diaria y semanal del calendario, vista de mañana y zona horaria visible/configurable.
10. Confirmaciones de borrado, aislamiento entre cuentas, documentacion y notas del parche.

## Comprobaciones por tarea

- Cada tarea empieza con pruebas de reglas o de contrato que fallen antes del cambio.
- Tras cada bloque se ejecutan las pruebas completas, lint, tipos y compilacion.
- Al final se comprueban Prisma, migraciones, auditoria de dependencias, recorrido principal de navegador en escritorio y movil, permisos y ausencia de datos de otra cuenta.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
| --- | --- |
| Una fecha se mueve por conversion de zona horaria | Claves y rangos de fecha se calculan con la zona guardada del usuario. |
| Una entrega vencida se reprograma por peticion directa | La accion carga primero la tarea propietaria y aplica una regla de dominio en servidor. |
| Una cuenta lee o cambia datos ajenos | Cada consulta y mutacion lleva `userId`; las relaciones cruzadas se comprueban antes de guardar. |
| Un borrado accidental elimina informacion | Confirmacion en interfaz y eliminacion acotada en servidor. |
| La nota necesaria resulta imposible | Se informa si supera 10 o si ya se alcanza el objetivo, sin ocultar el calculo. |

## Estado

El estado vivo de las tareas esta en `tasks/todo-fase-1.md`. El plan de Fase 3 de `tasks/plan.md` se conserva sin cambios porque pertenece a otro trabajo ya cerrado.
