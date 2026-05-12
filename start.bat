@echo off
chcp 65001 > nul
cls

echo.
echo  ████████████████████████████████████████████████████
echo  █                                                  █
echo  █          PERSEO  —  Iniciando...                 █
echo  █     Tu base de datos de leads, en automático.    █
echo  █                                                  █
echo  ████████████████████████████████████████████████████
echo.

REM ── Verificar Docker ────────────────────────────────────────────
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Docker Desktop no está corriendo.
    echo.
    echo  Por favor:
    echo    1. Abrí Docker Desktop
    echo    2. Esperá a que el ícono de la ballena sea estable
    echo    3. Volvé a ejecutar este script
    echo.
    pause
    exit /b 1
)
echo  [OK] Docker Desktop está corriendo.

REM ── Copiar .env.local si no existe .env ─────────────────────────
if not exist .env (
    echo  [INFO] Primera ejecución detectada.
    echo  [INFO] Copiando .env.local a .env...
    copy .env.local .env > nul
    echo  [OK] Archivo .env creado.
) else (
    echo  [OK] Archivo .env existente encontrado.
)

REM ── Construir y levantar servicios ──────────────────────────────
echo.
echo  [INFO] Construyendo imágenes Docker (puede tardar 2-3 minutos la primera vez)...
echo.
docker compose up -d --build

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Hubo un problema al levantar los servicios.
    echo  Revisá los logs con: docker compose logs
    echo.
    pause
    exit /b 1
)

REM ── Esperar que los servicios estén listos ──────────────────────
echo.
echo  [INFO] Esperando que los servicios inicien...

set /a intentos=0
:esperar
set /a intentos+=1
timeout /t 3 /nobreak > nul
curl -s http://localhost:3000/api/health > nul 2>&1
if %errorlevel% equ 0 goto listo
if %intentos% geq 20 goto timeout_error
echo  [INFO] Esperando... (%intentos%/20)
goto esperar

:timeout_error
echo.
echo  [WARN] Los servicios tardaron más de lo esperado.
echo  Intentá abrir http://localhost:3000 en unos segundos.
goto abrir

:listo
echo  [OK] Todos los servicios están listos.

:abrir
REM ── Abrir en el navegador ────────────────────────────────────────
echo  [INFO] Abriendo Perseo en el navegador...
start http://localhost:3000

echo.
echo  ████████████████████████████████████████████████████████████
echo  █                                                          █
echo  █   PERSEO está corriendo en http://localhost:3000         █
echo  █                                                          █
echo  █   Cuenta demo:                                           █
echo  █     Email:    demo@perseo.app                            █
echo  █     Password: demo1234                                   █
echo  █                                                          █
echo  █   Health Check:  http://localhost:3000/health            █
echo  █   Evolution API: http://localhost:8080                   █
echo  █   Base de datos: localhost:5432                          █
echo  █                                                          █
echo  ████████████████████████████████████████████████████████████
echo.
echo  Comandos útiles:
echo    Ver logs backend:   docker compose logs -f backend
echo    Ver todos los logs: docker compose logs -f
echo    Detener todo:       docker compose down
echo    Resetear DB demo:   docker compose down -v ^&^& start.bat
echo.
pause
