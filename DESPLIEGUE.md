# Despliegue (PDA06): Backend en AWS EC2 · Frontend en Azure · MongoDB Atlas

```
Navegador
   │ https://front-empleados-abe7enfzauaadqem.brazilsouth-01.azurewebsites.net
   ▼
Azure App Service (Angular SSR – frontend/server.ts)
   │ /api/*  → proxy servidor a servidor (evita el bloqueo "Mixed Content")
   ▼
AWS EC2 18.222.83.229
   ├─ :5000  Express (PM2 cluster)        http://18.222.83.229:5000/api/v1/auth
   ├─ :80    Nginx → 301 a HTTPS
   └─ :443   Nginx + certificado autofirmado → :5000
   ▼
MongoDB Atlas (usuarios_db)
```

## Qué hay en el proyecto y a qué parte de la guía corresponde

| Guía PDA06 | Archivo |
|---|---|
| Fase 2 – Node, Git, build-essential, certificado autofirmado, Nginx | `backend/aws/1-preparar-servidor.sh` |
| Fase 2.6 – Nginx proxy inverso 80→443→app | `backend/aws/nginx-empleados.conf` |
| Fase 3 / 4 – clonar, instalar, PM2 cluster + variables de entorno | `backend/aws/2-desplegar-backend.sh`, `backend/ecosystem.config.cjs` |
| Fase 5 – CI/CD con `pm2 deploy` | sección `deploy` de `backend/ecosystem.config.cjs` |
| Fase 6 – alertas por Webhook (Slack/Discord) | `backend/alertas/pm2-alertas.cjs` (app `empleados-alertas`) |
| Fase 6.3 – rotación de logs | `pm2-logrotate` (lo instala `1-preparar-servidor.sh`) |
| Frontend en Azure | `frontend/scripts/preparar-azure.mjs`, `frontend/azure/desplegar-frontend.ps1` |

> **Nota:** el módulo `pm2-notify` de la guía solo envía correos (SMTP); `slackUrl`/`discordUrl` no existen en él.
> Por eso el proyecto trae su propio notificador, `pm2-alertas.cjs`.

---

## PASO 0 – Subir el proyecto a GitHub (tu PC)

```bash
cd "C:\ruta\a\tu\proyecto\empleado"
git pull origin main
# copia/descomprime aquí los archivos del proyecto
git add -A
git status                 # backend/.env NO debe aparecer
git commit -m "feat(PDA06): despliegue AWS (Nginx HTTPS, PM2, alertas) y Azure"
git push origin main
```

---

## PASO 1 – MongoDB Atlas

1. **Network Access** → *Add IP Address* → `18.222.83.229/32`.
2. **Database Access**: el usuario de tu `MONGO_URI` debe tener permiso *readWrite*.

---

## PASO 2 – Consola de AWS (Fase 1)

**IP elástica:** EC2 → *Direcciones IP elásticas* → `18.222.83.229` → *Asociar* a la instancia `backend` (`i-000ee53fe434187a5`).

**Grupo de seguridad → Editar reglas de entrada:**

| Tipo | Puerto | Origen |
|---|---|---|
| SSH | 22 | Mi IP **y** `3.16.146.0/29` (consola web *EC2 Instance Connect* de Ohio) |
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |
| TCP personalizado | 5000 | 0.0.0.0/0 (la URL pedida `http://18.222.83.229:5000`) |

---

## PASO 3 – Webhook de alertas (Fase 6.1)

**Slack:** App Directory → *Incoming WebHooks* → *Añadir a Slack* → elige el canal (ej. `#alertas-servidor`) → copia la URL `https://hooks.slack.com/services/...`

**Discord:** Canal → ⚙ *Editar canal* → *Integraciones* → *Webhooks* → *Nuevo webhook* → *Copiar URL*.

---

## PASO 4 – Servidor EC2 (una sola vez)

En la terminal del EC2 (la consola de AWS de la imagen):

```bash
sudo mkdir -p /var/www && sudo chown -R ubuntu:ubuntu /var/www
cd /var/www
git clone https://github.com/dmespin10-gif/empleado.git
cd empleado
bash backend/aws/1-preparar-servidor.sh
```

Esto instala Node 24, Git, build-essential, Nginx, PM2, crea el **certificado autofirmado** para `18.222.83.229`,
configura **Nginx (80→443→5000)**, instala **pm2-logrotate** y deja PM2 arrancando solo si el EC2 se reinicia.

> ¿Repositorio privado? Haz primero la Fase 3.1 de la guía (Deploy Key: `ssh-keygen -t ed25519`, pegar la llave pública en GitHub → Settings → Deploy keys) y clona con `git clone git@github.com:dmespin10-gif/empleado.git`.

### Variables de entorno (`.env`)

```bash
cd /var/www/empleado/backend
cp .env.example .env
nano .env
```

Rellena:
- `MONGO_URI=` tu cadena real de Atlas
- `JWT_SECRET=` una cadena larga (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `ALERT_WEBHOOK_URL=` la URL del PASO 3

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## PASO 5 – Levantar el backend (y cada vez que hagas `git push`)

```bash
bash /var/www/empleado/backend/aws/2-desplegar-backend.sh
```

Hace `git pull` → `npm install` → `npm run build` → `pm2 startOrReload` (cluster) → `pm2 save` y verifica la API.
Debe terminar con **✅ API local: … Módulo de autenticación activo** y llegar a Slack/Discord *"Monitor de alertas iniciado"*.

Comandos útiles:

```bash
pm2 status
pm2 logs empleados-api
pm2 logs empleados-alertas
sudo systemctl status nginx
```

---

## PASO 6 – Frontend en Azure (tu PC, PowerShell)

### Opción A – automática (recomendada, requiere Azure CLI)

```powershell
cd "C:\ruta\a\tu\proyecto\empleado"
powershell -ExecutionPolicy Bypass -File frontend\azure\desplegar-frontend.ps1
```

El script compila, encuentra tu Web App por su dominio, configura `API_URL=http://18.222.83.229:5000`
y el comando de inicio `node server/server.mjs`, sube el zip y prueba la URL.

### Opción B – sin Azure CLI

1. Compila y empaqueta:
   ```powershell
   cd frontend
   npm install
   npm run build:azure        # crea frontend\deploy-azure.zip
   ```
2. Portal de Azure → tu Web App → **Configuración / Variables de entorno**:
   - `API_URL` = `http://18.222.83.229:5000`
   - `SCM_DO_BUILD_DURING_DEPLOYMENT` = `false`
3. **Configuración general → Comando de inicio:** `node server/server.mjs` → Guardar.
4. Abre `https://front-empleados-abe7enfzauaadqem.scm.brazilsouth-01.azurewebsites.net/ZipDeployUI`
   y arrastra `frontend\deploy-azure.zip`.
   (O en VS Code: clic derecho en `frontend/dist/frontend` → *Deploy to Web App…*)

> La Web App debe ser **Linux · Node 22 LTS**. "Solo HTTPS" puede quedar activado.

---

## PASO 7 – Pruebas de verificación (criterios de la guía)

1. **Prueba de red**
   - `http://18.222.83.229:5000/api/v1/auth` → *Módulo de autenticación activo*
   - `http://18.222.83.229/api/v1/auth` → redirige a HTTPS
   - `https://18.222.83.229/api/v1/auth` → acepta la advertencia del certificado autofirmado → responde la API
   - `https://front-empleados-abe7enfzauaadqem.brazilsouth-01.azurewebsites.net` → login con `ADMIN_EMAIL` / `ADMIN_PASSWORD`, crear un empleado (se guarda en Atlas)

2. **Prueba de resiliencia** (en el EC2)
   ```bash
   pm2 stop empleados-api      # llega 🔴 "detenido manualmente"
   pm2 start empleados-api     # llega 🟢 "en línea nuevamente"
   kill -9 $(pm2 pid empleados-api | head -1)   # llega 🔴 "caída" y PM2 lo levanta solo 🟢
   ```

3. **Prueba de CI/CD**
   - Cambia algo del backend en tu PC → `git push`.
   - Opción guía (desde **Git Bash** en tu PC, con tu llave `.pem` en `key` del `ecosystem.config.cjs`):
     ```bash
     cd backend
     pm2 deploy ecosystem.config.cjs production setup     # solo la primera vez
     scp -i ~/.ssh/tu-llave-aws.pem .env ubuntu@18.222.83.229:/var/www/empleado-deploy/shared/.env
     pm2 deploy ecosystem.config.cjs production
     ```
     > Si usas este método, antes ejecuta `pm2 delete all` en el EC2 para no tener dos copias del mismo proceso.
   - Opción simple: en el EC2 `bash /var/www/empleado/backend/aws/2-desplegar-backend.sh`.

---

## Problemas comunes

| Síntoma | Solución |
|---|---|
| `npm ci` muestra la ayuda y falla | Los scripts usan `npm install`; no uses `npm ci` en el servidor |
| `bash: $'\r': command not found` | El `.sh` se guardó con fin de línea Windows. El `.gitattributes` lo evita; en el EC2: `sed -i 's/\r$//' backend/aws/*.sh` |
| `pm2 logs`: *Server selection timed out* | Falta `18.222.83.229/32` en Atlas → Network Access |
| `:5000` no carga desde tu PC | Falta la regla del puerto 5000 en el Grupo de Seguridad |
| `https://18.222.83.229` no carga | Falta la regla 443, o `sudo nginx -t` muestra error |
| No llegan alertas | `ALERT_WEBHOOK_URL` vacío o mal copiado; revisa `pm2 logs empleados-alertas`, corrige el `.env` y `pm2 restart empleados-alertas` |
| Login en Azure: *No se pudo conectar con el backend en AWS* (502) | `API_URL` en Azure mal escrita, o backend caído (`pm2 status`) |
| Azure muestra *Application Error* | La Web App no es Linux/Node, o el zip no tiene `browser/`, `server/` y `package.json` en la raíz |
| La consola web de EC2 ya no conecta | La regla SSH no incluye `3.16.146.0/29` |
