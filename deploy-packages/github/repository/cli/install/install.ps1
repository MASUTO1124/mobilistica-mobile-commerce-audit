# cli/install/install.ps1
# Mobilistica Mobile Commerce Audit — CLI + Claude Codeスキル インストーラー (Windows)
#
# 機能:
#   1) npm link を実行し、グローバルコマンド `mobilistica-audit` を登録する
#   2) claude-skill\mobilistica-mobile-commerce-audit\ を ~\.claude\skills\ へコピーする
#      (claude-skill\ が未実装の場合はエラーにせずスキップする)
#
# 使い方: powershell -ExecutionPolicy Bypass -File install.ps1 [-Yes]

param(
    [switch]$Yes,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
    Write-Host "使い方: install.ps1 [-Yes]"
    Write-Host "  -Yes   確認なしで実行（非対話環境では必須）"
    exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
$SkillSrc = Join-Path $RepoRoot 'claude-skill\mobilistica-mobile-commerce-audit'
$HomeDir = if ($env:USERPROFILE) { $env:USERPROFILE } else { $HOME }
$SkillDestRoot = Join-Path $HomeDir '.claude\skills'
$SkillDest = Join-Path $SkillDestRoot 'mobilistica-mobile-commerce-audit'

Write-Host "=== Mobilistica Mobile Commerce Audit インストーラー ==="
Write-Host "インストール対象:"
Write-Host "  1) npm link （グローバルコマンド 'mobilistica-audit' として登録）"
Write-Host "     リポジトリ: $RepoRoot"
Write-Host "  2) Claude Codeスキルのコピー"
Write-Host "     コピー元: $SkillSrc"
Write-Host "     コピー先: $SkillDest"
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

Write-Host "--- npm link を実行します ---"
Push-Location $RepoRoot
try {
    npm link
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm link に失敗しました (exit $LASTEXITCODE)"
        exit 4
    }
} finally {
    Pop-Location
}
Write-Host "OK: npm link 完了（コマンド: mobilistica-audit）"

Write-Host ""
if (Test-Path $SkillSrc) {
    New-Item -ItemType Directory -Force -Path $SkillDestRoot | Out-Null
    if (Test-Path $SkillDest) {
        $ts = Get-Date -Format 'yyyyMMdd-HHmmss'
        $bak = "$SkillDest.bak-$ts"
        Write-Host "既存のスキルをバックアップします: $bak"
        Move-Item -Path $SkillDest -Destination $bak -Force
    }
    Copy-Item -Path $SkillSrc -Destination $SkillDest -Recurse -Force
    Write-Host "OK: Claude Codeスキルをコピーしました: $SkillDest"
} else {
    Write-Host "スキップ: claude-skill\mobilistica-mobile-commerce-audit\ がまだ存在しません（未実装のためスキップ。エラーではありません）"
}

Write-Host ""
Write-Host "インストール完了。'mobilistica-audit --help' で確認してください。"
