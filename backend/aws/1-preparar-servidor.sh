#!/usr/bin/env bash
# =============================================================================
# 1-preparar-servidor.sh — Preparación ÚNICA del EC2 (PDA06, Fases 1, 2, 4 y 6)
#
# Uso (en el EC2, dentro del repositorio clonado):
#   cd /var/www/empleado
#   bash backend/aws/1-preparar-servidor.sh
#
# Instala: Node.js 24 LTS, npm, Git, build-essential, Nginx, PM2, pm2-logrotate.
# Genera:  certificado SSL autofirmado para la IP elástica.
# Configura: Nginx (80 → 443 → 5000) y el arranque automático de PM2.
# Se puede ejecutar varias veces sin romper nada.
# =============================================================================
set -euo pipefail

IP_ELASTICA="${IP_ELASTICA:-18.222.83.229}"
NODE_MAJOR="${NODE_MAJOR:-24}"
AWS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # .../empleado/backend/aws
BACKEND_DIR="$(dirname "$AWS_DIR")"                         # .../empleado/backend
REPO_DIR="$(dirname "$BACKEND_DIR")"                         # .../empleado
SSL_CRT=/etc/ssl/certs/nginx-selfsigned.crt
SSL_KEY=/etc/ssl/private/nginx-selfsigned.key

paso() { echo; echo "══════ $* ══════"; }

paso "1/7 Actualizando paquetes del sistema"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

paso "2/7 Instalando Git, build-essential, Nginx, curl y OpenSSL"
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y git build-essential nginx curl ca-certificates openssl

paso "3/7 Instalando Node.js ${NODE_MAJOR} LTS (NodeSource)"
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi
echo "node $(node -v)  |  npm $(npm -v)"

paso "4/7 Instalando PM2 global"
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi
pm2 -v

paso "5/7 Certificado SSL autofirmado (CN=${IP_ELASTICA}, 365 días)"
if sudo test -f "$SSL_CRT" && sudo test -f "$SSL_KEY"; then
  echo "Ya existe: $SSL_CRT"
else
  sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_KEY" \
    -out "$SSL_CRT" \
    -subj "/C=EC/ST=Pichincha/L=Quito/O=UPS/OU=Maestria Software/CN=${IP_ELASTICA}" \
    -addext "subjectAltName=IP:${IP_ELASTICA}"
fi
sudo openssl x509 -in "$SSL_CRT" -noout -subject -enddate

paso "6/7 Configurando Nginx como proxy inverso (80 → 443 → 127.0.0.1:5000)"
sudo cp "$AWS_DIR/nginx-empleados.conf" /etc/nginx/sites-available/empleados
sudo ln -sf /etc/nginx/sites-available/empleados /etc/nginx/sites-enabled/empleados
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

# Si ufw está activo, abrir solo lo necesario (sin bloquear SSH).
if sudo ufw status 2>/dev/null | grep -q "Status: active"; then
  sudo ufw allow OpenSSH
  sudo ufw allow 'Nginx Full'
  sudo ufw allow 5000/tcp
fi

paso "7/7 PM2: rotación de logs y arranque automático al reiniciar el EC2"
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
sudo env PATH="$PATH:/usr/bin" "$(command -v pm2)" startup systemd -u "$USER" --hp "$HOME" >/dev/null
pm2 save --force

sudo chown -R "$USER:$USER" "$REPO_DIR"

echo
echo "✅ Servidor listo."
echo "   Siguiente paso:"
echo "     cd $BACKEND_DIR && cp .env.example .env && nano .env   (pon MONGO_URI, JWT_SECRET y ALERT_WEBHOOK_URL)"
echo "     bash $AWS_DIR/2-desplegar-backend.sh"
