---
name: plan-feature
description: Planifica un nuevo desarrollo, una corrección de código (bug) o un refactor antes de implementarlo. Genera un plan con objetivo, tareas pequeñas (5-10 min cada una) y criterios de aceptación, siguiendo template.md. La tarea está descrita en una issue de GitHub (el usuario indica el número), de la que se lee el contexto y en la que se publica el plan como comentario. Úsala cuando el usuario pida "planificar", "preparar un plan" o "diseñar los pasos" de una feature, fix o refactor, o invoque /plan-feature.
argument-hint: <número de issue de GitHub>
---

# plan-feature

Genera un plan de implementación para la issue de GitHub: $ARGUMENTS

La tarea a planificar vive en una issue de GitHub. Esta skill **solo planifica**: no modifica código del proyecto ni ejecuta la implementación. Lo único que escribe fuera de `docs/plans/` es el comentario con el plan en la issue.

## Instrucciones

1. **Obtén la issue.** El usuario debe indicar el número de issue en `$ARGUMENTS`. Si no lo ha indicado, pídeselo con `AskUserQuestion` antes de seguir. Descárgala con `gh issue view <número> --comments` (usa `--json title,body,labels,comments` si necesitas estructurarla) y lee título, descripción, etiquetas y comentarios previos: ahí está la descripción real de la tarea. Si la issue no existe o `gh` falla, informa al usuario y detente.
2. **Entiende la petición.** Clasifica el trabajo como `feature`, `fix` o `refactor`. Si la issue es ambigua o falta información que cambie el plan de forma sustancial (alcance, comportamiento esperado, decisiones de diseño), usa `AskUserQuestion` antes de seguir. No preguntes lo que puedas resolver leyendo el código.
3. **Explora el código afectado.** Lee `CLAUDE.md` y los archivos relevantes de `src/` para conocer el estado real. Respeta la arquitectura por capas (`routes → controllers → services → repositories → models`), las convenciones (clases con métodos en `snake_case`, `HttpError`, SQLite con `node:sqlite`) y la regla de no añadir dependencias si existe solución nativa. Si la tarea implica paginación, lee antes `docs/api/api-pagination.md`.
4. **Lee `template.md`** (en el mismo directorio que este archivo) y rellénalo respetando su estructura y orden de secciones.
5. **Redacta el plan** con estas reglas:
   - **Objetivo**: qué se quiere conseguir y por qué, en pocas líneas. Indica el tipo (feature / fix / refactor).
   - **Tareas**: lista numerada y ordenada por dependencias. Cada tarea debe poder completarse en **5-10 minutos**; si una es mayor, divídela. Cada tarea indica el archivo o capa afectada y el resultado concreto. Agrupa por capa solo si ayuda a la lectura. Incluye una tarea de tests cuando aplique (`node:test`).
   - **Criterios de aceptación**: condiciones verificables y concretas (comportamiento, códigos de estado HTTP, casos de error, tests que pasan). Evita frases vagas como "funciona bien".
   - Rellena también las secciones de alcance, riesgos y fuera de alcance si la plantilla las incluye; no inventes contenido para rellenar: si no aplica, escribe "N/A".
6. **Crea el plan** y guárdalo en `docs/plans/<slug-kebab-case>.md`.
7. **Avisa por Slack.** Una vez guardado el plan, publica un mensaje en el canal `revisar-plan` con la herramienta `mcp__slack__slack_post_message` (cárgala antes con `ToolSearch` si no está disponible; si necesitas el ID del canal, búscalo con `mcp__slack__slack_list_channels`). El mensaje debe indicar que el plan está listo para revisarse e incluir el título y la ruta `docs/plans/<slug>.md`. Si el canal no existe o el envío falla, no abandones: informa del fallo al usuario en el paso siguiente.
8. **Publica el plan en la issue.** Una vez guardado el plan, publícalo como comentario de la issue con `gh issue comment <número> --body-file docs/plans/<slug>.md`. El comentario debe contener el plan completo (no solo un enlace). Si el comando falla, no abandones: informa del fallo al usuario en el paso siguiente.
9. **Termina** preguntando si quiere ajustar algo o empezar a implementarlo. No empieces a implementar sin su confirmación.
