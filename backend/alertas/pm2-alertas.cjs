// alertas/pm2-alertas.cjs
// ─────────────────────────────────────────────────────────────────────────────
// PDA06 – Fase 6: Monitorización activa y alertas en tiempo real por Webhook.
//
// Proceso PM2 que escucha el bus de eventos de PM2 y envía una alerta a
// Slack o Discord cuando la API se cae, se detiene, se reinicia o lanza una
// excepción no controlada.
//
// (El módulo "pm2-notify" que menciona la guía solo envía correos por SMTP;
//  por eso el proyecto trae este notificador propio, sin dependencias externas.)
//
// Configuración en backend/.env:
//   ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...      (Slack)
//   ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/...      (Discord)
//   ALERT_APPS=empleados-api                (opcional, apps vigiladas)
//
// Lo arranca ecosystem.config.cjs como la app "empleados-alertas".
// Prueba:  pm2 stop empleados-api   → llega alerta 🔴
//          pm2 start empleados-api  → llega alerta 🟢
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const os = require('node:os');
const path = require('node:path');
const pm2 = require('pm2');

try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  // sin .env: se usan las variables ya presentes en el entorno
}

const WEBHOOK_URL = (process.env.ALERT_WEBHOOK_URL || '').trim();
const APPS = (process.env.ALERT_APPS || 'empleados-api').split(',').map((s) => s.trim()).filter(Boolean);
const SERVIDOR = process.env.ALERT_SERVER_NAME || `AWS EC2 ${process.env.IP_ELASTICA || '18.222.83.229'} (${os.hostname()})`;

const ICONOS = {
  stop: '🔴',
  exit: '🔴',
  'restart overlimit': '🚨',
  exception: '💥',
  online: '🟢',
};
const DESCRIPCION = {
  stop: 'detenido manualmente',
  exit: 'el proceso terminó (caída)',
  'restart overlimit': 'demasiados reinicios: PM2 dejó de reiniciarlo',
  exception: 'excepción no controlada',
  online: 'en línea nuevamente',
};

const esDiscord = (url) => /discord(app)?\.com\/api\/webhooks/i.test(url);

async function enviar(texto) {
  console.log(`[alerta] ${texto.replace(/\n/g, ' | ')}`);
  if (!WEBHOOK_URL) return;
  const cuerpo = esDiscord(WEBHOOK_URL) ? { content: texto.slice(0, 1900) } : { text: texto };
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    if (!res.ok) console.error(`[alerta] El webhook respondió ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error('[alerta] No se pudo enviar al webhook:', err.message);
  }
}

// Evita duplicados: "pm2 stop" emite "stop" y luego "exit" para el mismo proceso.
const ultimo = new Map();
function duplicado(clave) {
  const ahora = Date.now();
  const antes = ultimo.get(clave) || 0;
  ultimo.set(clave, ahora);
  return ahora - antes < 5000;
}

function mensaje(evento, proc, extra) {
  const fecha = new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });
  let txt = `${ICONOS[evento] || 'ℹ️'} *${proc.name}* (instancia ${proc.pm_id}) — ${DESCRIPCION[evento] || evento}\n` +
    `Servidor: ${SERVIDOR}\nFecha: ${fecha}`;
  if (extra) txt += `\nDetalle: ${extra}`;
  return txt;
}

if (!WEBHOOK_URL) {
  console.warn('[alerta] ALERT_WEBHOOK_URL no está definido en backend/.env: las alertas solo se escriben en el log.');
}

pm2.connect((err) => {
  if (err) {
    console.error('[alerta] No se pudo conectar con PM2:', err);
    process.exit(1);
  }
  pm2.launchBus((busErr, bus) => {
    if (busErr) {
      console.error('[alerta] No se pudo abrir el bus de PM2:', busErr);
      process.exit(1);
    }
    console.log(`[alerta] Vigilando: ${APPS.join(', ')} → ${WEBHOOK_URL ? (esDiscord(WEBHOOK_URL) ? 'Discord' : 'Slack') : 'solo log'}`);

    // "pm2 stop" emite exit(s) y luego "stop"; una caída emite solo "exit".
    // Por eso cada "exit" espera 1,5 s: si llega "stop" es manual, si no, es caída.
    const exitsPendientes = new Map();

    bus.on('process:event', (packet) => {
      const proc = packet.process || {};
      const evento = packet.event;
      if (!APPS.includes(proc.name)) return;

      if (evento === 'exit') {
        clearTimeout(exitsPendientes.get(proc.pm_id));
        exitsPendientes.set(proc.pm_id, setTimeout(() => {
          exitsPendientes.delete(proc.pm_id);
          if (!duplicado(`${proc.pm_id}:exit`)) void enviar(mensaje('exit', proc));
        }, 1500));
        return;
      }
      if (evento === 'stop') {
        clearTimeout(exitsPendientes.get(proc.pm_id));
        exitsPendientes.delete(proc.pm_id);
      }
      if (!(evento in ICONOS) || duplicado(`${proc.pm_id}:${evento}`)) return;
      void enviar(mensaje(evento, proc));
    });

    bus.on('process:exception', (packet) => {
      const proc = packet.process || {};
      if (!APPS.includes(proc.name)) return;
      const data = packet.data || {};
      const detalle = (data.message || data.stack || String(data)).toString().slice(0, 500);
      void enviar(mensaje('exception', proc, detalle));
    });
  });
});

void enviar(`ℹ️ Monitor de alertas iniciado en ${SERVIDOR}. Vigilando: ${APPS.join(', ')}`);
