// src/routes/auth.routes.ts
import { Router, type RequestHandler } from 'express';
import type { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { LoginSchema, RegisterSchema } from '../dtos/auth.dto.js';
import { ResponseWrapper } from '../utils/api-response.js';

export const createAuthRouter = (controller: AuthController, requireAuth: RequestHandler): Router => {
  const router = Router();

  // GET /api/v1/auth → comprobación rápida de que el módulo de seguridad responde
  // (útil para probar en el navegador http://18.222.83.229:5000/api/v1/auth).
  router.get('/auth', (_req, res) => {
    ResponseWrapper.success(
      res,
      { endpoints: ['POST /api/v1/auth/login', 'POST /api/v1/auth/register', 'GET /api/v1/auth/me'] },
      'Módulo de autenticación activo',
    );
  });

  router.post('/auth/register', validate({ body: RegisterSchema }), controller.register);
  router.post('/auth/login', validate({ body: LoginSchema }), controller.login);
  router.get('/auth/me', requireAuth, controller.me);

  return router;
};
