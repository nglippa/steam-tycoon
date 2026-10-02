#!/bin/sh
# Delegation hooks: the main session is the architect/orchestrator; subagents
# do the repository work.
#
#   delegate.sh prompt    UserPromptSubmit: inject the delegation policy
#   delegate.sh pre-edit  PreToolUse (Edit|Write|MultiEdit): deny main-session
#                         edits to files inside this repository
#
# Main vs subagent: Claude Code adds agent_id/agent_type to hook input only for
# tool calls made inside a subagent (verified empirically, 2026-10-01).
#
# Always allowed: subagent calls, anything under <repo>/.claude/, files outside
# the repository. Escape hatch: touch <repo>/.claude/allow-main-edits
#
# Fails open (allows, with a stderr warning) if jq is missing or the input is
# unreadable: failing closed would also block subagents.
#
# Bash is deliberately not guarded; see the note at the end of this file.

mode=$1
input=$(cat)

if ! command -v jq >/dev/null 2>&1; then
  echo "delegate.sh: jq not found; delegation hook inactive" >&2
  exit 0
fi
field() { printf '%s' "$input" | jq -r "$1 // empty" 2>/dev/null; }

[ -n "$(field .agent_id)" ] && exit 0

case $mode in
prompt)
  jq -n '{hookSpecificOutput: {hookEventName: "UserPromptSubmit", additionalContext:
"You are the architect/orchestrator for this repository. Inspect only as needed to plan, then delegate repository implementation, exploration, testing, review and browser QA to subagents via the Agent tool, running independent tasks in parallel with self-contained prompts. Review and integrate their results yourself. Main-session Edit/Write to repository files is blocked by a hook (files under .claude/ excepted; .claude/allow-main-edits lifts the block)."}}'
  ;;
pre-edit)
  file=$(field '.tool_input.file_path')
  cwd=$(field .cwd)
  [ -n "$file" ] || exit 0
  [ -n "$cwd" ] || cwd=$PWD
  case $file in /*) ;; *) file=$cwd/$file ;; esac

  root=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null) || exit 0
  root=$(cd "$root" && pwd -P) || exit 0
  [ -e "$root/.claude/allow-main-edits" ] && exit 0

  # Resolve symlinks via the nearest existing ancestor (the file may be new).
  dir=$(dirname "$file") rest=$(basename "$file")
  while [ ! -d "$dir" ]; do rest=$(basename "$dir")/$rest; dir=$(dirname "$dir"); done
  file=$(cd "$dir" && pwd -P)/$rest

  case $file in
    "$root"/.claude/*) exit 0 ;;
    "$root"/*) ;;
    *) exit 0 ;;
  esac

  jq -n --arg f "${file#"$root"/}" '{hookSpecificOutput: {hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: ("Main-session edit to " + $f + " blocked: you are the orchestrator, so delegate this change to a subagent via the Agent tool. To edit directly, the user can create .claude/allow-main-edits.")}}'
  ;;
esac
exit 0

# Bash limitation: repository writes made through Bash (sed -i, redirects,
# scripts, git) are not guarded. PreToolUse can see Bash calls and agent_id,
# but telling a mutating command from a read-only one needs a shell parser,
# and denying all main-session Bash would also block git, tests and builds.
