#!/usr/bin/env bash
# cli/install/uninstall.sh
# Mobilistica Mobile Commerce Audit — アンインストーラー (Linux/Mac)
#
# 機能:
#   1) npm link の解除
#   2) ~/.claude/skills/mobilistica-mobile-commerce-audit/ の削除
#      (*.bak-* バックアップは削除しない)
#
# 使い方: uninstall.sh [--yes]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILL_DEST="${HOME:-$USERPROFILE}/.claude/skills/mobilistica-mobile-commerce-audit"

YES=0
for arg in "$@"; do
  case "$arg" in
    --yes|-y) YES=1 ;;
    --help|-h)
      echo "使い方: uninstall.sh [--yes]"
      exit 0
      ;;
    *)
      echo "エラー: 未知のオプション: $arg" >&2
      exit 2
      ;;
  esac
done

echo "=== Mobilistica Mobile Commerce Audit アンインストーラー ==="
echo "削除対象:"
echo "  1) npm link の解除（リポジトリ: $REPO_ROOT）"
echo "  2) Claude Codeスキル: $SKILL_DEST"
echo "  ※ *.bak-* バックアップは削除しません"
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

(cd "$REPO_ROOT" && npm unlink 2>/dev/null) || true
echo "OK: npm link を解除しました（未リンクの場合は何もしません）"

if [ -e "$SKILL_DEST" ] || [ -L "$SKILL_DEST" ]; then
  rm -rf "$SKILL_DEST"
  echo "OK: Claude Codeスキルを削除しました: $SKILL_DEST"
else
  echo "スキップ: Claude Codeスキルは見つかりませんでした（既にアンインストール済みの可能性）"
fi

echo "アンインストール完了。バックアップ(*.bak-*)は手動で削除してください。"
