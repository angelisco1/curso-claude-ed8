#!/usr/bin/env bash
# PreToolUse hook: blocks the agent from reading scripts/issues.json.
# Exit code 2 denies the tool call and sends stderr back to Claude.

input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input")

case "$tool" in
  Read)
    target=$(jq -r '.tool_input.file_path // empty' <<<"$input")
    ;;
  Grep|Glob)
    target=$(jq -r '[.tool_input.path, .tool_input.pattern, .tool_input.glob] | map(select(. != null)) | join(" ")' <<<"$input")
    ;;
  Bash)
    target=$(jq -r '.tool_input.command // empty' <<<"$input")
    ;;
  *)
    exit 0
    ;;
esac

if grep -qE 'issues\.json' <<<"$target"; then
  echo "Blocked: reading issues.json is not allowed in this project." >&2
  exit 2
fi

exit 0
