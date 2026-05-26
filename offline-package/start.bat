@echo off
setlocal
chcp 65001 > nul

set SCRIPT_DIR=%~dp0
set APP_DIR=%SCRIPT_DIR%app\backend

cd /d "%APP_DIR%"

if not exist ".venv\Scripts\uvicorn.exe" (
    echo エラー: セットアップが完了していません。
    echo 先に setup.bat を実行してください。
    pause
    exit /b 1
)

echo ============================================
echo  業務関係整理ツール 起動中...
echo.
echo  ブラウザで以下を開いてください:
echo    http://localhost:8000
echo.
echo  終了: この画面で Ctrl+C を押す
echo ============================================
echo.

.venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8000
pause
