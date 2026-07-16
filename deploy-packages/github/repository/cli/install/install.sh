#!/usr/bin/env bash
# cli/install/install.sh
# Mobilistica Mobile Commerce Audit — CLI + Claude Codeスキル インストーラー (Linux/Mac)
#
# 機能:
#   1) npm link を実行し、グローバルコマンド `mobilistica-audit` を登録する
#   2) claude-skill/mobilistica-mobile-commerce-audit/ を ~/.claude/skills/ へコピーする
#      (claude-skill/ が未実装の場合はエラーにせずスキップする)
#
# 使い方: install.sh [--yes]
#   --yes   確認なしで実行する（非対話シェルでは必須）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILL_SRC="$REPO_ROOT/claude-skill/mobilistica-mobile-commerce-audit"
SKILL_DEST="${HOME:-$USERPROFILE}/.claude/skills/mobilistica-mobile-commerce-audit"

YES=0
for arg in "$@"; do
  case "$arg" in
    --yes|-y) YES=1 ;;
    --help|-h)
      echo "使い方: install.sh [--yes]"
      echo "  --yes   確認なしで実行（非対話環境では必須）"
      exit 0
      ;;
    *)
      echo "エラー: 未知のオプション: $arg" >&2
      exit 2
      ;;
  esac
done

echo "=== Mobilistica Mobile Commerce Audit インストーラー ==="
echo "インストール対象:"
echo "  1) npm link （グローバルコマンド 'mobilistica-audit' として登録）"
echo "     リポジトリ: $REPO_ROOT"
echo "  2) Claude Codeスキルのコピー"
echo "     コピー元: $SKILL_SRC"
echo "     コピー先: $SKILL_DEST"
echo

if [ "$YES" -ne 1 ]; then
  if [ ! -t 0 ]; then
    echo "エラー: 非対話環境では --yes を指定してください" >&2
    exit 2
  fi
  read -r -p "続行しますか？ [y/N]: " ans
  case "$ans" in
    y|Y|yes|YES) ;;
    *)
      echo "中止しました"
      exit 1
      ;;
  esac
fi

echo "--- npm link を実行します ---"
if ! (cd "$REPO_ROOT" && npm link); then
  echo "エラー: npm link に失敗しました" >&2
  exit 4
fi
echo "OK: npm link 完了（コマンド: mobilistica-audit）"

echo
if [ -d "$SKILL_SRC" ]; then
  mkdir -p "$(dirname "$SKILL_DEST")"
  if [ -e "$SKILL_DEST" ] || [ -L "$SKILL_DEST" ]; then
    TS="$(date +%Y%m%d-%H%M%S)"
    BAK="${SKILL_DEST}.bak-${TS}"
    echo "既存のスキルをバックアップします: $BAK"
    mv "$SKILL_DEST" "$BAK"
  fi
  cp -R "$SKILL_SRC" "$SKILL_DEST"
  echo "OK: Claude Codeスキルをコピーしました: $SKILL_DEST"
else
  echo "スキップ: claude-skill/mobilistica-mobile-commerce-audit/ がまだ存在しません（未実装のためスキップ。エラーではありません）"
fi

echo
echo "インストール完了。'mobilistica-audit --help' で確認してください。"
