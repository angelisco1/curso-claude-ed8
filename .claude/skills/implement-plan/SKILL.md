---
name: implement-plan
description: Implementa el plan de una issue de GitHub (generado con plan-feature) en un git worktree aislado, tarea a tarea y con TDD estricto. El usuario indica el número de issue y la skill la busca en GitHub. Tras cada tarea y sus tests hace un commit y marca la tarea como hecha en el plan, hasta completar todas y cumplir los criterios de aceptación. Al terminar deja la PR creada y envía por Slack el enlace directo a la PR. Úsala cuando el usuario pida "implementar el plan", "ejecutar el plan", "implementar la issue" o invoque /implement-plan.
argument-hint: <número de issue de GitHub>
---

# implement-plan

Implementa el plan de la issue de GitHub: $ARGUMENTS

## Instrucciones

### 1. Localiza y valida el plan

- El usuario indica en `$ARGUMENTS` el número de la issue a implementar. Si no lo ha indicado, pídeselo con `AskUserQuestion`. Búscala en GitHub con `gh issue view <número> --comments` (o `--json title,body,labels,comments`). Si la issue no existe o `gh` falla, díselo al usuario y para.
- El plan es el comentario de la issue publicado por `plan-feature` (el más reciente si hay varios). Resuélvelo a su archivo de `docs/plans/` (por título o slug). Si el archivo no existe en el repo, créalo con el contenido del comentario en `docs/plans/<slug-kebab-case>.md`. Si la issue no tiene ningún plan, díselo al usuario, sugiere ejecutar `/plan-feature <número>` y para.
- Lee la issue, el plan completo y `CLAUDE.md`. Respeta la arquitectura por capas, las convenciones (clases con métodos en `snake_case`, `HttpError`, SQLite con `node:sqlite`) y la regla de no añadir dependencias si existe solución nativa. Si alguna tarea implica paginación, lee antes `docs/api/api-pagination.md`.
- Si hay tareas ya marcadas `[x]`, trátalas como hechas y continúa por la primera pendiente.
- Si el plan tiene decisiones pendientes o ambigüedades que cambien la implementación, resuélvelas con `AskUserQuestion` antes de empezar. No preguntes lo que puedas resolver leyendo el código.

### 2. Crea el git worktree

Todo el trabajo se hace en un worktree, nunca en el directorio principal.

1. Comprueba que estás en un repo git. Si el worktree de este plan ya existe (reanudación), reutilízalo en vez de crear otro.
2. Crea la rama y el worktree dentro de `.claude/worktrees/`, partiendo de la rama actual:
   `git worktree add .claude/worktrees/<slug> -b <tipo>/<slug>`
   donde `<slug>` es el nombre del plan (sin versionar o creado desde la issue, según el caso) y `<tipo>` es `feat`, `fix` o `refactor` según el campo **Tipo** del plan. (Alternativa equivalente: la tool `EnterWorktree`.) Comprueba que `.claude/worktrees/` está en `.gitignore`; si no, avisa al usuario en vez de modificarlo por tu cuenta.
3. Trabaja desde el worktree a partir de aquí (usa rutas absolutas dentro de él).
4. Prepara el entorno: copia el `.env` del directorio principal si existe (está en `.gitignore`) y ejecuta `npm install`.
5. Si el plan está sin versionar (`git status` lo muestra como `??`), cópialo al mismo path dentro del worktree; entrará en el primer commit. A partir de ahora **la copia del worktree es la única que se edita**.
6. Ejecuta `npm test` para conocer la línea base. Si ya falla antes de tocar nada, anótalo para no confundirlo con fallos propios y avisa al usuario en el resumen final.

### 3. Implementa las tareas, una a una y en orden

Para cada tarea pendiente, aplica **TDD estricto**:

1. **Red:** escribe primero el test (`node:test` + `node:assert`, en `test/`) que describe el comportamiento de la tarea. Ejecútalo (`node --test <archivo>`) y **comprueba que falla** por la razón esperada (no por un error de sintaxis o de import). Si pasa sin código nuevo, el test no sirve: revísalo.
2. **Green:** escribe el código mínimo para que ese test pase. Nada más.
3. **Refactor:** limpia el código y los tests con todo en verde, respetando las convenciones del proyecto.
4. Ejecuta **toda la suite** (`npm test`). Debe quedar en verde antes de seguir.
5. **Marca la tarea como hecha** en el plan del worktree: cambia su `[ ]` por `[x]`. No modifiques nada más del plan.
6. **Haz un commit** con el código, los tests y el plan actualizado (ver formato abajo). Un commit por tarea.
7. Pasa a la siguiente tarea.

Reglas:

- Nunca escribas código de producción sin un test rojo previo que lo exija. No hagas commit con tests en rojo.
- Si una tarea no es testeable de forma automática (p. ej. solo actualiza `CLAUDE.md` o documentación, o es una verificación manual), no inventes un test artificial: hazla, y en el commit indica que no aplica TDD. Una tarea de verificación se ejecuta de verdad y se marca solo si pasa.
- No hagas nada fuera del alcance del plan. Si descubres trabajo necesario no previsto, para y pregúntale al usuario si lo añade al plan o lo deja fuera.
- Si una tarea es mucho mayor de lo previsto o el plan resulta incorrecto, para y consulta con `AskUserQuestion` antes de desviarte. No marques una tarea como hecha si no lo está.
- Si te atascas (el mismo test falla tras varios intentos razonables), para e informa del bloqueo con lo que has probado. No debilites ni borres tests para forzar el verde.

### 4. Formato de los commits

No uses la skill `commit` (pide confirmación en cada commit y aquí el flujo es continuo). Sigue su mismo formato Conventional Commits:

```
<tipo>(<ámbito opcional>): <descripción>

[cuerpo opcional]
```

- Escribe el mensaje **en inglés** (instrucción global del usuario), en imperativo, minúscula inicial, sin punto final, ~72 caracteres como máximo.
- Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`... según lo que haga la tarea. Ámbito: capa o módulo afectado.
- Haz `git add` solo de los archivos de la tarea (nunca `.env` ni secretos).
- Termina el mensaje con la línea de atribución indicada en las instrucciones de la sesión, si la hay. Usa un HEREDOC.
- No hagas `--amend` ni `--no-verify`. El único `git push` permitido es el del paso 6, para crear la PR.

### 5. Verifica los criterios de aceptación

Cuando todas las tareas estén en `[x]`:

1. Ejecuta `npm test` completo y revisa **uno por uno** los criterios de aceptación del plan, comprobando cada uno con evidencia real (un test que lo cubre, una ejecución de la API, una lectura del código). Si algún criterio es de comportamiento HTTP, arráncala (`npm start`) y pruébalo.
2. Marca `[x]` cada criterio cumplido. Si alguno no se cumple, corrígelo siguiendo el mismo ciclo TDD (nuevo test rojo → código → commit) y vuelve a verificar. No marques un criterio sin haberlo comprobado.
3. Haz un último commit con el plan actualizado (`docs(plans): mark acceptance criteria as met`) si quedaron cambios sin commitear.

### 6. Crea la PR

Cuando todas las tareas estén en `[x]` y los criterios de aceptación verificados:

1. Comprueba que el árbol del worktree está limpio y que `npm test` pasa.
2. Sube la rama: `git push -u origin <tipo>/<slug>`.
3. Crea la PR con `gh pr create --base <rama base> --head <tipo>/<slug>` (la rama base es aquella de la que partió el worktree). El título sigue Conventional Commits, en inglés, y el cuerpo (en inglés) incluye un resumen del cambio, las tareas completadas, el estado de los criterios de aceptación y `Closes #<número>` para enlazar la issue. Usa un HEREDOC y termina el cuerpo con la línea de atribución indicada en las instrucciones de la sesión, si la hay.
4. Guarda la URL que devuelve `gh pr create` (si ya existía una PR para la rama, recupérala con `gh pr view --json url`).
5. Si el push o la creación fallan, no abandones: informa del fallo y del motivo en el resumen final y omite el envío del paso 7 si no hay PR.

### 7. Avisa por Slack

Con la PR creada, publica un mensaje en el canal `revisar-plan` con la herramienta `mcp__slack__slack_post_message` (cárgala antes con `ToolSearch` si no está disponible; si necesitas el ID del canal, búscalo con `mcp__slack__slack_list_channels`). El mensaje debe indicar que la implementación está lista para revisarse e incluir el número de la issue, el nombre del plan y el **enlace directo a la PR** (la URL completa). Si el canal no existe o el envío falla, no abandones: menciónalo en el resumen final.

### 8. Cierra

Muestra al usuario un resumen: enlace a la PR, rama y ruta del worktree, lista de commits (`git log --oneline`), estado de los criterios de aceptación y cualquier incidencia (línea base rota, tareas sin TDD, decisiones tomadas). No hagas merge de la PR ni elimines el worktree sin su confirmación.
