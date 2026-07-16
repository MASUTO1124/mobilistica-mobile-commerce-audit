# cli/install/uninstall.ps1
# Mobilistica Mobile Commerce Audit — アンインストーラー (Windows)
#
# 機能:
#   1) npm link の解除
#   2) ~\.claude\skills\mobilistica-mobile-commerce-audit\ の削除
#      (*.bak-* バックアップは削除しない)
#
# 使い方: powershell -ExecutionPolicy Bypass -File uninstall.ps1 [-Yes]

param(
    [switch]$Yes,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
    Write-Host "使い方: uninstall.ps1 [-Yes]"
    exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
$HomeDir = if ($env:USERPROFILE) { $env:USERPROFILE } else { $HOME }
$SkillDest = Join-Path $HomeDir '.claude\skills\mobilistica-mobile-commerce-audit'

Write-Host "=== Mobilistica Mobile Commerce Audit アンインストーラー ==="
Write-Host "削除対象:"
Write-Host "  1) npm link の解除（リポジトリ: $RepoRoot）"
Write-Host "  2) Claude Codeスキル: $SkillDest"
Write-Host "  ※ *.bak-* バックアップは削除しません"
Write-Host ""

if (-not $Yes) {
    $isInteractive = [Environment]::UserInteractive -and (-not [Console]::IsInputRedirected)
    if (-not $isInteractive) {
        Write-Error "非対話環境では -Yes を指定してください"
        exit 2
    }
    $ans = Read-Host "続行しますか？ [y/N]"
    if ($ans -notmatch '^(y|yes)$') {
        Write-Host "中止しました"
        exit 1
    }
}

Push-Location $RepoRoot
try {
    npm unlink 2>$null | Out-Null
} catch {
    # 未リンクの場合は無視する
} finally {
    Pop-Location
}
Write-Host "OK: npm link を解除しました（未リンクの場合は何もしません）"

if (Test-Path $SkillDest) {
    Remove-Item -Path $SkillDest -Recurse -Force
    Write-Host "OK: Claude Codeスキルを削除しました: $SkillDest"
} else {
    Write-Host "スキップ: Claude Codeスキルは見つかりませんでした（既にアンインストール済みの可能性）"
}

Write-Host "アンインストール完了。バックアップ(*.bak-*)は手動で削除してください。"
