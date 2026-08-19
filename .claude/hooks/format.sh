#!/usr/bin/env bash
# Formats/fixes the file Claude just edited. Runs on every Edit/Write/MultiEdit.
# Never blocks: a formatting failure must not stop the turn.
#
# Note: this starter has NO prettier in frontend/package.json — only eslint 9.
# So TS/TSX go through `eslint --fix`, not prettier. Verified 2026-08-14.

set -uo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"

case "$file" in
  *.ts|*.tsx|*.js|*.jsx)
    ( cd "$root/frontend" && npx --no-install eslint --fix "$file" ) >/dev/null 2>&1
    ;;
  *.ex|*.exs|*.heex)
    ( cd "$root" && mix format "$file" ) >/dev/null 2>&1
    ;;
esac

exit 0
