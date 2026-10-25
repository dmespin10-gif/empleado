// scripts/preparar-azure.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Prepara el build de Angular (SSR) para Azure App Service (Linux / Node):
//   1. Crea dist/frontend/package.json con "npm start" → node server/server.mjs
//      (Azure ejecuta "npm start" aunque no configures el comando de inicio).
//   2. Empaqueta dist/frontend en frontend/deploy-azure.zip con rutas "/"
//      (Compress-Archive de Windows usa "\" y rompe el despliegue en Linux).
//
// Uso:  npm run build:azure
// Sin dependencias externas: funciona igual en Windows, Linux y macOS.
// ─────────────────────────────────────────────────────────────────────────────
import { deflateRawSync } from 'node:zlib';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const distDir = join(raiz, 'dist', 'frontend');
const zipPath = join(raiz, 'deploy-azure.zip');

if (!existsSync(join(distDir, 'server', 'server.mjs')) || !existsSync(join(distDir, 'browser', 'index.html'))) {
  console.error('❌ No existe dist/frontend/server/server.mjs o dist/frontend/browser. Ejecuta primero: npx ng build');
  process.exit(1);
}

// 1. package.json para Azure
const pkg = {
  name: 'front-empleados',
  version: '1.0.0',
  private: true,
  description: 'Angular SSR + proxy /api hacia el backend en AWS EC2',
  scripts: { start: 'node server/server.mjs' },
  engines: { node: '>=20' },
};
writeFileSync(join(distDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
console.log('✔ dist/frontend/package.json creado (npm start → node server/server.mjs)');

// 2. ZIP mínimo (deflate) con rutas tipo POSIX
const crcTabla = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTabla[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const archivos = [];
const recorrer = (dir) => {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) recorrer(ruta);
    else archivos.push(ruta);
  }
};
recorrer(distDir);

const partes = [];
const central = [];
let offset = 0;
for (const ruta of archivos) {
  const nombre = Buffer.from(relative(distDir, ruta).split(sep).join('/'), 'utf8');
  const datos = readFileSync(ruta);
  const comprimido = deflateRawSync(datos, { level: 9 });
  const crc = crc32(datos);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);           // versión necesaria
  local.writeUInt16LE(0x0800, 6);       // nombres en UTF-8
  local.writeUInt16LE(8, 8);            // deflate
  local.writeUInt16LE(0, 10);           // hora
  local.writeUInt16LE(0x21, 12);        // fecha (1980-01-01)
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(comprimido.length, 18);
  local.writeUInt32LE(datos.length, 22);
  local.writeUInt16LE(nombre.length, 26);
  local.writeUInt16LE(0, 28);
  partes.push(local, nombre, comprimido);

  const cab = Buffer.alloc(46);
  cab.writeUInt32LE(0x02014b50, 0);
  cab.writeUInt16LE(0x031e, 4);         // creado en Unix
  cab.writeUInt16LE(20, 6);
  cab.writeUInt16LE(0x0800, 8);
  cab.writeUInt16LE(8, 10);
  cab.writeUInt16LE(0, 12);
  cab.writeUInt16LE(0x21, 14);
  cab.writeUInt32LE(crc, 16);
  cab.writeUInt32LE(comprimido.length, 20);
  cab.writeUInt32LE(datos.length, 24);
  cab.writeUInt16LE(nombre.length, 28);
  cab.writeUInt32LE((0o100644 << 16) >>> 0, 38); // permisos rw-r--r--
  cab.writeUInt32LE(offset, 42);
  central.push(cab, nombre);

  offset += local.length + nombre.length + comprimido.length;
}
const centralBuf = Buffer.concat(central);
const fin = Buffer.alloc(22);
fin.writeUInt32LE(0x06054b50, 0);
fin.writeUInt16LE(archivos.length, 8);
fin.writeUInt16LE(archivos.length, 10);
fin.writeUInt32LE(centralBuf.length, 12);
fin.writeUInt32LE(offset, 16);
writeFileSync(zipPath, Buffer.concat([...partes, centralBuf, fin]));

console.log(`✔ deploy-azure.zip creado (${archivos.length} archivos, ${(statSync(zipPath).size / 1024).toFixed(0)} KB)`);
console.log('  Publícalo con:  frontend/azure/desplegar-frontend.ps1   o   VS Code → Deploy to Web App (carpeta dist/frontend)');
