@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   Сборка программы "Планирование РЗА"
echo ============================================
echo.

REM Проверяем наличие Go
where go >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Go не установлен!
    echo.
    echo Скачайте и установите Go с сайта:
    echo https://go.dev/dl/
    echo.
    echo После установки перезапустите этот скрипт.
    echo.
    pause
    exit /b 1
)

echo [1/3] Проверка Go...
go version
echo.

echo [2/3] Сборка программы...
go build -ldflags="-s -w" -o "Планирование_РЗА.exe" main.go
if %errorlevel% neq 0 (
    echo.
    echo [ОШИБКА] Не удалось собрать программу!
    pause
    exit /b 1
)

echo.
echo [3/3] Готово!
echo.
echo ============================================
echo   Файл "Планирование_РЗА.exe" создан!
echo ============================================
echo.
echo Теперь вы можете:
echo 1. Запустить "Планирование_РЗА.exe" двойным кликом
echo 2. Перенести его в любую папку
echo 3. Удалить папку rza-go - она больше не нужна
echo.
echo ВАЖНО: Файл работает БЕЗ интернета!
echo.
pause
