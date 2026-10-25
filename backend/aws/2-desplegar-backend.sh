#!/usr/bin/env bash
# =============================================================================
# 2-desplegar-backend.sh — Publica / actualiza el backend en el EC2 (PDA06, Fases 3 y 4)
#
# Uso (en el EC2):
#   bash /var/www/empleado/backend/aws/2-desplegar-backend.sh
#
# Hace: git pull → npm install → npm run build → pm2 startOrReload → pm2 save
#       y verifica que la API responda en :5000 y por Nginx (HTTPS).
# Ejecútalo cada vez que hagas git push de cambios del backend.
# =============================================================================
set -euo pipefail

AWS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # .../empleado/backend/aws
BACKEND_DIR="$(dirname "$AWS_DIR")"                         # .../empleado/backend
REPO_DIR="$(dirname "$BACKEND_DIR")"                         # .../empleado
RAMA="${RAMA:-main}"

paso() { echo; echo "══════ $* ══════"; }

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "❌ Falta $BACKEND_DIR/.env"
  echo "   cp $BACKEND_DIR/.env.example $BACKEND_DIR/.env && nano $BACKEND_DIR/.env"
  exit 1
fi
if grep -q "<USUARIO>\|<CONTRASEÑA>" "$BACKEND_DIR/.env"; then
  echo "❌ El .env todavía tiene MONGO_URI de ejemplo (<USUARIO>/<CONTRASEÑA>). Edítalo con tus datos reales."
  exit 1
fi

paso "1/4 Descargando la última versión de GitHub (rama $RAMA)"
cd "$REPO_DIR"
# npm install puede reescribir el package-lock en el servidor; se descarta para que git pull no choque.
git checkout -- backend/package-lock.json 2>/dev/null || true
git pull --ff-only origin "$RAMA"
git log --oneline -1

paso "2/4 Instalando dependencias"
cd "$BACKEND_DIR"
npm install --no-audit --no-fund

paso "3/4 Compilando TypeScript → dist/"
npm run build
mkdir -p logs

paso "4/4 Levantando con PM2 (modo cluster, entorno production)"
pm2 startOrReload ecosystem.config.cjs --env production --update-env
pm2 save --force
pm2 status

paso "Verificación"
ok=0
for _ in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:5000/api/v1/auth >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
if [ "$ok" = 1 ]; then
  echo "✅ API local:  $(curl -s http://127.0.0.1:5000/api/v1/auth)"
  echo "   Nginx HTTPS: $(curl -sk --max-time 5 https://127.0.0.1/api/v1/auth | head -c 120 || echo "(Nginx no responde: sudo systemctl status nginx)")"
  echo
  echo "Pruébalo desde tu PC:"
  echo "   http://18.222.83.229:5000/api/v1/auth"
  echo "   https://18.222.83.229/api/v1/auth   (aceptar advertencia del certificado autofirmado)"
else
  echo "❌ La API no responde en :5000. Últimos logs:"
  pm2 logs empleados-api --lines 30 --nostream
  echo
  echo "Causas típicas: IP del EC2 no autorizada en MongoDB Atlas (Network Access) o MONGO_URI incorrecta."
  exit 1
fi
