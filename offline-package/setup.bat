@echo off
setlocal
chcp 65001 > nul

echo ============================================
echo  業務関係整理ツール - 初回セットアップ
echo ============================================
echo.

set SCRIPT_DIR=%~dp0
set APP_DIR=%SCRIPT_DIR%app\backend
set PKG_DIR=%SCRIPT_DIR%01_packages

cd /d "%APP_DIR%"

echo [1/2] Python 仮想環境を作成中...
uv venv .venv --python 3.13
if errorlevel 1 (
    echo.
    echo エラー: 仮想環境の作成に失敗しました。
    echo Python 3.13 がインストール済みか確認してください。
    pause
    exit /b 1
)

echo.
echo [2/2] パッケージをインストール中 (インターネット不要)...
uv pip install --no-index --find-links "%PKG_DIR%" -r requirements.txt
if errorlevel 1 (
    echo.
    echo エラー: パッケージのインストールに失敗しました。
    echo 手順書を確認してください。
    pause
    exit /b 1
)

echo.
echo ============================================
echo  セットアップ完了！
echo  start.bat でツールを起動してください。
echo ============================================
pause
