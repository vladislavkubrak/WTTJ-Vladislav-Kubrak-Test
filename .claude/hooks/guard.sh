#!/usr/bin/env bash
# Blocks edits that would break the exercise's ground rules.
# Denies with a reason Claude can read and act on.

set -uo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

[ -z "$file" ] && exit 0

deny() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}' "$1"
  exit 0
}

case "$file" in
  */CLAUDE.md|CLAUDE.md)
    deny "CLAUDE.md is human-owned. Ask instead of rewriting the rules." ;;
  */yarn.lock|yarn.lock|*/mix.lock|mix.lock)
    deny "Lockfiles are generated. Run yarn or mix and let the tool write it." ;;
  */frontend/package.json|*/mix.exs)
    deny "Adding a dependency is a decision to make out loud: say what is missing and why nothing installed covers it, then add it with yarn/mix and justify it in NOTES.md." ;;
esac

exit 0
