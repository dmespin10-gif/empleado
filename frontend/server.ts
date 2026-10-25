import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import AppServerModule from './src/main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // ── Proxy /api/* → Backend en AWS EC2 ──────────────────────────────────────
  // Azure sirve el frontend por HTTPS; el backend en AWS está en HTTP (sin dominio
  // ni certificado). Si el navegador llamara directo a http://18.222.83.229:5000
  // lo bloquearía por "Mixed Content". Por eso el navegador llama a /api/... en el
  // MISMO dominio de Azure, y este servidor Node reenvía la petición a AWS.
  // La URL de AWS se puede cambiar en Azure > Configuración > API_URL.
  const apiTarget = (process.env['API_URL'] || 'http://18.222.83.229:5000').replace(/\/+$/, '');

  server.use('/api', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    try {
      const headers: Record<string, string> = {};
      for (const name of ['content-type', 'authorization', 'accept']) {
        const value = req.headers[name];
        if (typeof value === 'string') headers[name] = value;
      }
      const hasBody = !['GET', 'HEAD'].includes(req.method) && Buffer.isBuffer(req.body) && req.body.length > 0;

      const upstream = await fetch(`${apiTarget}${req.originalUrl}`, {
        method: req.method,
        headers,
        body: hasBody ? req.body : undefined,
      });

      res.status(upstream.status);
      const contentType = upstream.headers.get('content-type');
      if (contentType) res.setHeader('content-type', contentType);
      res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch (err) {
      console.error(`[proxy] No se pudo contactar ${apiTarget}:`, err);
      res.status(502).json({
        success: false,
        statusCode: 502,
        message: 'No se pudo conectar con el backend en AWS',
        data: null,
        errors: null,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Serve static files from /browser
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap: AppServerModule,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
