#!/usr/bin/env bash
# Migration: v1.1.3.0 — stale な /checkpoint skill install を削除
#
# 注：本 migration は upstream gstack の v1.1.3.0 path 由来。uzustack では
# 該当 install（旧 checkpoint skill）が未実装 = 実 trigger なし。Phase 6+ で
# uzustack 独自の skill rename 機構と同時設計するまで型として在庫。
#
# Claude Code は /checkpoint を /rewind の native alias として ship したため、
# 旧 uzustack checkpoint skill が shadow されていた。本 skill は
# /context-save + /context-restore に分割済み。本 migration は旧 install を
# on-disk から削除し、Claude Code の native /checkpoint が shadow されないようにする。
#
# 所有権 guard：install を **uzustack が所有していると判定できた場合のみ** 削除する。
# つまり directory または SKILL.md が ~/.claude/skills/uzustack/ 配下を指す
# symlink である場合のみ。ユーザー独自の /checkpoint skill（普通の file、または
# 別の場所を指す symlink）は保持する。
#
# 対応する 3 種類の install shape：
#   1. ~/.claude/skills/checkpoint が uzustack 内部を指す directory symlink
#   2. ~/.claude/skills/checkpoint が普通の directory で、その中身が
#      uzustack 内部を指す SKILL.md symlink 1 件のみ（uzustack の prefix-install shape）
#   3. それ以外 → 触らず通知だけ
#
# 冪等：path が無い場合は no-op
set -euo pipefail

# Guard: HOME が unset / empty の場合は中止。`set -u` で unset HOME は error
# になるが、HOME=""（sudo-without-H、systemd unit、一部の CI runner で発生）は
# 生き残って "/.claude/skills/..." のような危険な絶対 path を作る。clean に abort する。
if [ -z "${HOME:-}" ]; then
  echo "  [v1.1.3.0] HOME が unset / empty — migration を skip。" >&2
  exit 0
fi

SKILLS_DIR="${HOME}/.claude/skills"
OLD_TOPLEVEL="${SKILLS_DIR}/checkpoint"
OLD_NAMESPACED="${SKILLS_DIR}/uzustack/checkpoint"
UZUSTACK_ROOT_REAL=""

# Helper: target を canonical path に正規化（symlink-safe）。解決済み path を表示、
# 失敗（broken symlink、ENOENT、ELOOP）時は空文字列を返す。realpath と python3
# fallback の両方を試す — 単一 tool の失敗で ownership check が破綻しないように。
# 両方失敗したら空文字列を返す。
resolve_real() {
  local target="$1"
  local out=""
  if command -v realpath >/dev/null 2>&1; then
    out=$(realpath "$target" 2>/dev/null || true)
  fi
  if [ -z "$out" ] && command -v python3 >/dev/null 2>&1; then
    out=$(python3 -c 'import os,sys;print(os.path.realpath(sys.argv[1]))' "$target" 2>/dev/null || true)
  fi
  printf '%s' "$out"
}

# uzustack skills root の canonical path を解決。uzustack が install されていなければ
# 移行対象なし。
if [ -d "${SKILLS_DIR}/uzustack" ]; then
  UZUSTACK_ROOT_REAL=$(resolve_real "${SKILLS_DIR}/uzustack")
fi

# Helper: $1（canonical path）が $2（canonical path）の配下か？
path_inside() {
  local inner="$1"
  local outer="$2"
  [ -n "$inner" ] && [ -n "$outer" ] || return 1
  case "$inner" in
    "$outer"|"$outer"/*) return 0;;
    *) return 1;;
  esac
}

removed_any=0

# --- Shape 1: top-level ~/.claude/skills/checkpoint
if [ -L "$OLD_TOPLEVEL" ]; then
  # Directory symlink（または file symlink）。canonicalize して所有権を確認。
  target_real=$(resolve_real "$OLD_TOPLEVEL")
  if [ -n "$UZUSTACK_ROOT_REAL" ] && path_inside "$target_real" "$UZUSTACK_ROOT_REAL"; then
    rm -- "$OLD_TOPLEVEL"
    echo "  [v1.1.3.0] stale な /checkpoint symlink を削除（Claude Code の /rewind alias を shadow していた）。"
    removed_any=1
  else
    echo "  [v1.1.3.0] $OLD_TOPLEVEL は触らない — symlink target が uzustack 外（または解決不能）。"
  fi
elif [ -d "$OLD_TOPLEVEL" ]; then
  # 普通の directory。SKILL.md が uzustack 内を指す symlink 1 件のみの場合に限り削除
  # （uzustack の prefix-install shape）。find で実 file 数を数え、.DS_Store（macOS sidecar）は無視。
  file_count=$(find "$OLD_TOPLEVEL" -maxdepth 1 -type f -not -name '.DS_Store' -not -name '._*' 2>/dev/null | wc -l | tr -d ' ')
  symlink_count=$(find "$OLD_TOPLEVEL" -maxdepth 1 -type l 2>/dev/null | wc -l | tr -d ' ')
  if [ "$file_count" = "0" ] && [ "$symlink_count" = "1" ] && [ -L "$OLD_TOPLEVEL/SKILL.md" ]; then
    target_real=$(resolve_real "$OLD_TOPLEVEL/SKILL.md")
    if [ -n "$UZUSTACK_ROOT_REAL" ] && path_inside "$target_real" "$UZUSTACK_ROOT_REAL"; then
      # macOS sidecar を先に削除（user content ではない）、その後 dir を削除
      find "$OLD_TOPLEVEL" -maxdepth 1 \( -name '.DS_Store' -o -name '._*' \) -type f -delete 2>/dev/null || true
      rm -r -- "$OLD_TOPLEVEL"
      echo "  [v1.1.3.0] stale な /checkpoint install directory を削除（uzustack prefix-mode）。"
      removed_any=1
    else
      echo "  [v1.1.3.0] $OLD_TOPLEVEL は触らない — SKILL.md symlink target が uzustack 外。"
    fi
  else
    echo "  [v1.1.3.0] $OLD_TOPLEVEL は触らない — uzustack 所有の install ではない（独自 content あり）。"
  fi
fi
# 不在 → no-op（冪等）

# --- Shape 2: ~/.claude/skills/uzustack/checkpoint/
# 所有権 guard はここでも適用：uzustack skills root 内に解決される場合のみ削除。
# ユーザーが directory を別の場所（fork 等）を指す symlink に置き換えていたら尊重する。
if [ -L "$OLD_NAMESPACED" ]; then
  target_real=$(resolve_real "$OLD_NAMESPACED")
  if [ -n "$UZUSTACK_ROOT_REAL" ] && path_inside "$target_real" "$UZUSTACK_ROOT_REAL"; then
    rm -- "$OLD_NAMESPACED"
    echo "  [v1.1.3.0] stale な ~/.claude/skills/uzustack/checkpoint symlink を削除。"
    removed_any=1
  else
    echo "  [v1.1.3.0] $OLD_NAMESPACED は触らない — symlink target が uzustack 外。"
  fi
elif [ -d "$OLD_NAMESPACED" ]; then
  # 普通の directory。uzustack-prefix install location。uzustack root 内に解決されるか確認
  # （手で tree を編集していない限り常に true のはず）。
  target_real=$(resolve_real "$OLD_NAMESPACED")
  if [ -n "$UZUSTACK_ROOT_REAL" ] && path_inside "$target_real" "$UZUSTACK_ROOT_REAL"; then
    rm -rf -- "$OLD_NAMESPACED"
    echo "  [v1.1.3.0] stale な ~/.claude/skills/uzustack/checkpoint/ を削除（context-save + context-restore に置き換え済み）。"
    removed_any=1
  else
    echo "  [v1.1.3.0] $OLD_NAMESPACED は触らない — uzustack 外に解決される。"
  fi
fi

if [ "$removed_any" = "1" ]; then
  echo "  [v1.1.3.0] /checkpoint は Claude Code の native /rewind alias になった。state 保存は /context-save、再開は /context-restore を使う。"
fi

exit 0
