@echo off
chcp 65001 > nul
echo.
echo  Deteniendo Perseo...
docker compose down
echo.
echo  [OK] Todos los servicios fueron detenidos.
echo  Para reiniciar: doble click en start.bat
echo.
pause
