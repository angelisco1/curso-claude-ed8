---
description: Crea un commit siguiendo el formato Conventional Commits
argument-hint: [pista opcional sobre el cambio]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

Crea un commit de git siguiendo la especificación Conventional Commits.

## Contexto

- Estado: !`git status --short`
- Cambios en staging: !`git diff --cached`
- Cambios sin stage: !`git diff`
- Commits recientes (para ver el estilo): !`git log --oneline -10`

## Instrucciones

0. **Validaciones previas:**
   - Si git no está inicializado (no existe `.git/`): inicializa con `git init`.
   - Si no hay ningún commit aún (`git log --oneline -10` falla con "fatal: your current branch... does not have any commits yet"): procede normalmente; el primer commit no necesita inspirarse en histórico.

1. Analiza los cambios. Si hay cambios en staging, commitea solo esos. Si no hay nada en staging, añade con `git add` los archivos relevantes (nunca `.env` ni secretos). Si no hay cambios, díselo al usuario y para.
2. Si los cambios mezclan propósitos distintos, propón dividirlos en varios commits.
3. Redacta el mensaje con este formato:

   ```
   <tipo>(<ámbito opcional>)!: <descripción>

   [cuerpo opcional]

   [pie opcional]
   ```

   - **Tipos**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
   - **Ámbito** (opcional): la capa o módulo afectado (p. ej. `auth`, `routes`, `services`, `repositories`).
   - **Descripción**: en español, modo imperativo, minúscula inicial, sin punto final, máximo ~72 caracteres.
   - **Cuerpo**: explica el *qué* y el *porqué*, no el *cómo*; solo si aporta.
   - **Cambios incompatibles**: añade `!` tras el tipo/ámbito y un pie `BREAKING CHANGE: <descripción>`.
4. Si el usuario pasó argumentos, úsalos como pista del propósito del cambio: $ARGUMENTS
5. Usa la tool `AskUserQuestion` para mostrarle al usuario el mensaje del commit, y que decida si le parece bien. Si te da el ok, continua. Si te dice que no, proponle otro mensaje y vuelve a preguntarle.
6. Ejecuta `git commit` con el mensaje (usa un HEREDOC para respetar los saltos de línea). Termina el mensaje con la línea de atribución indicada en las instrucciones de la sesión, si la hay.
7. No hagas `git push`, no uses `--amend` ni `--no-verify` salvo que el usuario lo pida.
8. Al terminar, muestra el hash y el mensaje del commit.
