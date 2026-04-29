# uzustack-gbrain-lib.sh — setup-gbrain bin script 群の共通 helper
#
# このファイルは executable ではない。source して使う:
#
#   . "$(dirname "$0")/uzustack-gbrain-lib.sh"
#
# 提供する関数:
#   read_secret_to_env <VARNAME> <prompt> [--echo-redacted <sed-expr>]
#     — stdin から secret を読み、指定の env var に格納する。terminal に
#     echo はしない。SIGINT / SIGTERM / EXIT で terminal echo を復元する
#     ので、以降のキー入力は再び見えるようになる。`--echo-redacted` 指定時は
#     読んだ内容の redacted preview を出すので、貼り付けたものが正しいか
#     視覚確認できる。
#
#     stdin handling: stdin が TTY の時は stty -echo で echo を抑制する。
#     stdin が pipe の時 (自動 test 等) は stty 呼び出しを skip する
#     (pipe input は元々 echo しないため)。
#
#     Var 名は [A-Z_][A-Z0-9_]* に match する必要がある。
#     `read -r "$varname"` 展開経由の injection を防ぐため、不正名は abort する。
#
#     read 後に export するので sub-process は secret を継承できる。
#     使用後の `unset <VARNAME>` は caller の責務。
#
# Load-bearing: PAT + URL paste にまたがる shared secret helper、env-var
# handoff (argv 経由ではない)、PAT scope の SIGINT 復元、pooler URL paste の
# hygiene (redacted preview)。

# _uzustack_gbrain_validate_varname <name> — 使える名前なら 0、そうでなければ 2 を返す。
_uzustack_gbrain_validate_varname() {
  local name="$1"
  case "$name" in
    [A-Z_][A-Z0-9_]*) return 0 ;;
    *) return 2 ;;
  esac
}

read_secret_to_env() {
  local varname="" prompt="" redact_expr=""
  # 先頭の positional args (varname, prompt) を取り、次に optional flag を parse する
  if [ $# -lt 2 ]; then
    echo "read_secret_to_env: usage: read_secret_to_env <VARNAME> <prompt> [--echo-redacted <sed-expr>]" >&2
    return 2
  fi
  varname="$1"; shift
  prompt="$1"; shift
  while [ $# -gt 0 ]; do
    case "$1" in
      --echo-redacted) redact_expr="$2"; shift 2 ;;
      *) echo "read_secret_to_env: 不明な flag: $1" >&2; return 2 ;;
    esac
  done

  if ! _uzustack_gbrain_validate_varname "$varname"; then
    echo "read_secret_to_env: var 名が無効: '$varname' ([A-Z_][A-Z0-9_]* に match する必要がある)" >&2
    return 2
  fi

  # stty 操作は stdin が terminal の時だけ意味がある。
  # CI / test / pipe の文脈では skip する (pipe input は元々 echo しない)。
  local is_tty=false
  if [ -t 0 ]; then is_tty=true; fi

  if $is_tty; then
    # 現在の stty state を save、どの exit path でも restore する
    local saved_stty
    saved_stty=$(stty -g 2>/dev/null || echo "")
    # shellcheck disable=SC2064
    trap "stty '$saved_stty' 2>/dev/null; printf '\n' >&2" INT TERM EXIT
    stty -echo 2>/dev/null || true
  fi

  # Prompt は stderr に出す。caller が stdout を clean に capture できるように。
  printf '%s' "$prompt" >&2

  # stdin から 1 行 read する。`read -r` は newline 無し EOF 時に nonzero を返すが
  # 見えた内容は `value` に入る — その内容が欲しいので、失敗時にも clear しない。
  local value=""
  IFS= read -r value || true

  if $is_tty; then
    stty "$saved_stty" 2>/dev/null || true
    trap - INT TERM EXIT
    printf '\n' >&2
  fi

  # 名前付き変数に assign + export
  printf -v "$varname" '%s' "$value"
  # shellcheck disable=SC2163
  export "$varname"

  # 成功 read 後の optional redacted preview
  if [ -n "$redact_expr" ] && [ -n "$value" ]; then
    local preview
    preview=$(printf '%s' "$value" | sed "$redact_expr" 2>/dev/null || true)
    if [ -n "$preview" ]; then
      printf 'Got: %s\n' "$preview" >&2
    fi
  fi
}
