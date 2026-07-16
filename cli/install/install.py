#!/usr/bin/env python3
"""cli/install/install.py

Mobilistica Mobile Commerce Audit — CLI + Claude Codeスキル インストーラー
(クロスプラットフォーム版。install.sh / install.ps1 が使えない環境向け)

機能:
  1) npm link を実行し、グローバルコマンド `mobilistica-audit` を登録する
  2) claude-skill/mobilistica-mobile-commerce-audit/ を ~/.claude/skills/ へコピーする
     (claude-skill/ が未実装の場合はエラーにせずスキップする)

使い方: python install.py [--yes]
"""
import argparse
import datetime
import shutil
import subprocess
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Mobilistica Mobile Commerce Audit インストーラー")
    parser.add_argument("--yes", "-y", action="store_true", help="確認なしで実行（非対話環境では必須）")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent.parent
    skill_src = repo_root / "claude-skill" / "mobilistica-mobile-commerce-audit"
    skill_dest = Path.home() / ".claude" / "skills" / "mobilistica-mobile-commerce-audit"

    print("=== Mobilistica Mobile Commerce Audit インストーラー ===")
    print("インストール対象:")
    print("  1) npm link （グローバルコマンド 'mobilistica-audit' として登録）")
    print(f"     リポジトリ: {repo_root}")
    print("  2) Claude Codeスキルのコピー")
    print(f"     コピー元: {skill_src}")
    print(f"     コピー先: {skill_dest}")
    print()

    if not args.yes:
        if not sys.stdin.isatty():
            print("エラー: 非対話環境では --yes を指定してください", file=sys.stderr)
            return 2
        ans = input("続行しますか？ [y/N]: ").strip().lower()
        if ans not in ("y", "yes"):
            print("中止しました")
            return 1

    print("--- npm link を実行します ---")
    result = subprocess.run(["npm", "link"], cwd=str(repo_root), shell=(sys.platform == "win32"))
    if result.returncode != 0:
        print(f"エラー: npm link に失敗しました (exit {result.returncode})", file=sys.stderr)
        return 4
    print("OK: npm link 完了（コマンド: mobilistica-audit）")
    print()

    if skill_src.is_dir():
        skill_dest.parent.mkdir(parents=True, exist_ok=True)
        if skill_dest.exists() or skill_dest.is_symlink():
            ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
            backup = skill_dest.with_name(f"{skill_dest.name}.bak-{ts}")
            print(f"既存のスキルをバックアップします: {backup}")
            shutil.move(str(skill_dest), str(backup))
        shutil.copytree(str(skill_src), str(skill_dest))
        print(f"OK: Claude Codeスキルをコピーしました: {skill_dest}")
    else:
        print(
            "スキップ: claude-skill/mobilistica-mobile-commerce-audit/ がまだ存在しません"
            "（未実装のためスキップ。エラーではありません）"
        )

    print()
    print("インストール完了。'mobilistica-audit --help' で確認してください。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
