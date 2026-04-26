#!/usr/bin/env bash
# check-careful.sh — PreToolUse hook for /careful skill
# Reads JSON from stdin, checks Bash command for destructive patterns.
# Returns hookSpecificOutput permissionDecision: "ask" to warn, or {} to allow.
set -euo pipefail

# Read stdin (JSON with tool_input)
INPUT=$(cat)

# Extract the "command" field value from tool_input
# Try grep/sed first (handles 99% of cases), fall back to Python for escaped quotes
CMD=$(printf '%s' "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//;s/"$//' || true)

# Python fallback if grep returned empty (e.g., escaped quotes in command)
if [ -z "$CMD" ]; then
  CMD=$(printf '%s' "$INPUT" | python3 -c 'import sys,json; print(json.loads(sys.stdin.read()).get("tool_input",{}).get("command",""))' 2>/dev/null || true)
fi

# If we still couldn't extract a command, allow
if [ -z "$CMD" ]; then
  echo '{}'
  exit 0
fi

# Normalize: lowercase for case-insensitive SQL matching
CMD_LOWER=$(printf '%s' "$CMD" | tr '[:upper:]' '[:lower:]')

# --- Check for safe exceptions (rm -rf of build artifacts) ---
if printf '%s' "$CMD" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+|--recursive\s+)' 2>/dev/null; then
  SAFE_ONLY=true
  RM_ARGS=$(printf '%s' "$CMD" | sed -E 's/.*rm[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*//;s/--recursive[[:space:]]*//')
  for target in $RM_ARGS; do
    case "$target" in
      */node_modules|node_modules|*/\.next|\.next|*/dist|dist|*/__pycache__|__pycache__|*/\.cache|\.cache|*/build|build|*/\.turbo|\.turbo|*/coverage|coverage)
        ;; # safe target
      -*)
        ;; # flag, skip
      *)
        SAFE_ONLY=false
        break
        ;;
    esac
  done
  if [ "$SAFE_ONLY" = true ]; then
    echo '{}'
    exit 0
  fi
fi

# --- Destructive pattern checks ---
WARN=""
PATTERN=""

# rm -rf / rm -r / rm --recursive
if printf '%s' "$CMD" | grep -qE 'rm\s+(-[a-zA-Z]*r|--recursive)' 2>/dev/null; then
  WARN="危険: 再帰削除 (rm -r)。ファイルを永続的に削除します。"
  PATTERN="rm_recursive"
fi

# DROP TABLE / DROP DATABASE
if [ -z "$WARN" ] && printf '%s' "$CMD_LOWER" | grep -qE 'drop\s+(table|database)' 2>/dev/null; then
  WARN="危険: SQL DROP を検出。データベースオブジェクトを永続的に削除します。"
  PATTERN="drop_table"
fi

# TRUNCATE
if [ -z "$WARN" ] && printf '%s' "$CMD_LOWER" | grep -qE '\btruncate\b' 2>/dev/null; then
  WARN="危険: SQL TRUNCATE を検出。テーブルの全行を削除します。"
  PATTERN="truncate"
fi

# git push --force / git push -f
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'git\s+push\s+.*(-f\b|--force)' 2>/dev/null; then
  WARN="危険: git force-push は remote の履歴を書き換えます。他の contributor の作業が失われる可能性があります。"
  PATTERN="git_force_push"
fi

# git reset --hard
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'git\s+reset\s+--hard' 2>/dev/null; then
  WARN="危険: git reset --hard は未コミットの変更をすべて破棄します。"
  PATTERN="git_reset_hard"
fi

# git checkout . / git restore .
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'git\s+(checkout|restore)\s+\.' 2>/dev/null; then
  WARN="危険: ワーキングツリーの未コミット変更をすべて破棄します。"
  PATTERN="git_discard"
fi

# kubectl delete
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'kubectl\s+delete' 2>/dev/null; then
  WARN="危険: kubectl delete は Kubernetes リソースを削除します。プロダクションへの影響可能性あり。"
  PATTERN="kubectl_delete"
fi

# docker rm -f / docker system prune
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'docker\s+(rm\s+-f|system\s+prune)' 2>/dev/null; then
  WARN="危険: Docker force-remove または prune。実行中のコンテナや cached image を削除する可能性があります。"
  PATTERN="docker_destructive"
fi

# --- Output ---
if [ -n "$WARN" ]; then
  WARN_ESCAPED=$(printf '%s' "$WARN" | sed 's/"/\\"/g')
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"[careful] %s"}}\n' "$WARN_ESCAPED"
else
  echo '{}'
fi
