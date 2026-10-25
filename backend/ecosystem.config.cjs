// ecosystem.config.cjs
// ─────────────────────────────────────────────────────────────────────────────
// PM2 – Backend "Gestión de Empleados" (Práctica 06: Despliegue en AWS)
//
// Se usa extensión .cjs porque package.json tiene "type": "module" y PM2
// necesita leer este archivo como CommonJS (module.exports).
//
// Arquitectura:
//   Navegador → Azure App Service (Angular, HTTPS)
//             → /api/*  (proxy del server.ts de Angular)
//             → AWS EC2 18.222.83.229:5000 (este backend, Express)
//             → MongoDB Atlas
//
// Comandos en el EC2 (dentro de /var/www/empleado/backend):
//   npm install && npm run build
//   pm2 start ecosystem.config.cjs --env production
//   pm2 save
//   pm2 logs empleados-api
// (o simplemente:  bash aws/2-desplegar-backend.sh)
//
// Los secretos (MONGO_URI, JWT_SECRET, ADMIN_*) NO van aquí: viven en el
// archivo backend/.env del servidor (lo lee process.loadEnvFile()).
// ─────────────────────────────────────────────────────────────────────────────

const AWS_IP = '18.222.83.229';
const AZURE_HOST = 'front-empleados-abe7enfzauaadqem.brazilsouth-01.azurewebsites.net';

module.exports = {
  apps: [
    {
      name: 'empleados-api',
      cwd: __dirname,                 // así process.loadEnvFile() encuentra backend/.env
      script: 'dist/index.js',        // ejecutar `npm run build` antes

      instances: 'max',               // Modo cluster: un proceso por vCPU
      exec_mode: 'cluster',

      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      autorestart: true,

      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',

      // pm2 start ecosystem.config.cjs   (desarrollo)
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
        FRONTEND_URL: 'http://localhost:4200',
      },

      // pm2 start ecosystem.config.cjs --env production   (AWS EC2)
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        // Orígenes del navegador permitidos por CORS (Azure en https y http).
        FRONTEND_URL: `https://${AZURE_HOST},http://${AZURE_HOST}`,
      },
    },

    // ── Fase 6: alertas en tiempo real (Slack / Discord) ──────────────────
    // Lee ALERT_WEBHOOK_URL de backend/.env. Ver alertas/pm2-alertas.cjs
    {
      name: 'empleados-alertas',
      cwd: __dirname,
      script: 'alertas/pm2-alertas.cjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/alertas-error.log',
      out_file: './logs/alertas-out.log',
      env_production: {
        NODE_ENV: 'production',
        ALERT_APPS: 'empleados-api',
        IP_ELASTICA: AWS_IP,
      },
    },
  ],

  // ── CI/CD con PM2 Deploy (Fase 5 de la guía) ─────────────────────────────
  // Desde tu PC:  pm2 deploy ecosystem.config.cjs production setup   (solo 1 vez)
  //               pm2 deploy ecosystem.config.cjs production
  // Antes del primer deploy copia el .env al servidor en
  //   /var/www/empleado-deploy/shared/.env
  deploy: {
    production: {
      user: 'ubuntu',
      host: AWS_IP,
      ref: 'origin/main',
      repo: 'https://github.com/dmespin10-gif/empleado.git',
      path: '/var/www/empleado-deploy',
      key: '~/.ssh/tu-llave-aws.pem',   // ← ruta a tu llave .pem en tu PC
      'post-deploy':
        'cd backend && cp ../../shared/.env .env && mkdir -p logs && npm install --no-audit --no-fund && npm run build && ' +
        'pm2 startOrReload ecosystem.config.cjs --env production && pm2 save',
    },
  },
};
