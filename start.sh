#!/usr/bin/env bash
set -e

# ────────────────────────────────────────────────────────────────
#  PERSEO — Script de inicio (Linux / macOS)
# ────────────────────────────────────────────────────────────────

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo ""
echo -e "${CYAN}████████████████████████████████████████████████████${NC}"
echo -e "${CYAN}█                                                  █${NC}"
echo -e "${CYAN}█  ${BOLD}${YELLOW}PERSEO${NC}${CYAN}  —  Iniciando...                       █${NC}"
echo -e "${CYAN}█  Tu base de datos de leads, en automático.       █${NC}"
echo -e "${CYAN}█                                                  █${NC}"
echo -e "${CYAN}████████████████████████████████████████████████████${NC}"
echo ""

# ── Verificar Docker ──────────────────────────────────────────────
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} Docker no está corriendo."
    echo ""
    echo "  Por favor:"
    echo "    - En macOS: abrí Docker Desktop"
    echo "    - En Linux: sudo systemctl start docker"
    echo ""
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Docker está corriendo."

# ── Verificar docker compose ──────────────────────────────────────
if ! docker compose version > /dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} docker compose (v2) no está instalado."
    echo "  Instalalo con: sudo apt install docker-compose-plugin"
    exit 1
fi

# ── Copiar .env.local si no existe .env ──────────────────────────
if [ ! -f .env ]; then
    echo -e "${YELLOW}[INFO]${NC} Primera ejecución detectada."
    echo -e "${YELLOW}[INFO]${NC} Copiando .env.local a .env..."
    cp .env.local .env
    echo -e "${GREEN}[OK]${NC} Archivo .env creado."
else
    echo -e "${GREEN}[OK]${NC} Archivo .env existente encontrado."
fi

# ── Construir y levantar servicios ────────────────────────────────
echo ""
echo -e "${YELLOW}[INFO]${NC} Construyendo imágenes Docker (puede tardar 2-3 minutos la primera vez)..."
echo ""
docker compose up -d --build

# ── Esperar que los servicios estén listos ────────────────────────
echo ""
echo -e "${YELLOW}[INFO]${NC} Esperando que los servicios inicien..."

intentos=0
until curl -s http://localhost:3000/api/health > /dev/null 2>&1; do
    intentos=$((intentos + 1))
    if [ $intentos -ge 30 ]; then
        echo -e "${YELLOW}[WARN]${NC} Timeout esperando servicios. Intentá abrir http://localhost:3000 en unos segundos."
        break
    fi
    echo -e "${YELLOW}[INFO]${NC} Esperando... ($intentos/30)"
    sleep 3
done

echo -e "${GREEN}[OK]${NC} ¡Servicios listos!"

# ── Abrir en el navegador ─────────────────────────────────────────
echo -e "${YELLOW}[INFO]${NC} Abriendo Perseo en el navegador..."

if command -v xdg-open > /dev/null 2>&1; then
    xdg-open http://localhost:3000 &
elif command -v open > /dev/null 2>&1; then
    open http://localhost:3000
fi

echo ""
echo -e "${CYAN}████████████████████████████████████████████████████████████${NC}"
echo -e "${CYAN}█                                                          █${NC}"
echo -e "${CYAN}█   ${GREEN}PERSEO está corriendo en ${BOLD}http://localhost:3000${NC}${CYAN}         █${NC}"
echo -e "${CYAN}█                                                          █${NC}"
echo -e "${CYAN}█   Cuenta demo:                                           █${NC}"
echo -e "${CYAN}█     Email:    ${YELLOW}demo@perseo.app${NC}${CYAN}                            █${NC}"
echo -e "${CYAN}█     Password: ${YELLOW}demo1234${NC}${CYAN}                                   █${NC}"
echo -e "${CYAN}█                                                          █${NC}"
echo -e "${CYAN}█   Health Check:  http://localhost:3000/health            █${NC}"
echo -e "${CYAN}█   Evolution API: http://localhost:8080                   █${NC}"
echo -e "${CYAN}█   Base de datos: localhost:5432                          █${NC}"
echo -e "${CYAN}█                                                          █${NC}"
echo -e "${CYAN}████████████████████████████████████████████████████████████${NC}"
echo ""
echo "  Comandos útiles:"
echo "    Ver logs backend:    docker compose logs -f backend"
echo "    Ver todos los logs:  docker compose logs -f"
echo "    Detener todo:        docker compose down"
echo "    Resetear DB demo:    docker compose down -v && ./start.sh"
echo ""
