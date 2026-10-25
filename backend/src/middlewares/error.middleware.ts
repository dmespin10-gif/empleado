// src/middlewares/error.middleware.ts
// [Reto 2] Interceptor global de errores: nunca se exponen excepciones crudas al cliente.
import type { NextFunction, Request, Response } from 'express';
import { AppError, NotFoundError } from '../errors/app-error.js';
import { ResponseWrapper } from '../utils/api-response.js';

/** Rutas inexistentes -> 404 con el mismo formato universal. */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`La ruta ${req.method} ${req.originalUrl} no existe`));
};

interface BodyParserError {
  type?: string;
  status?: number;
}

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  // 1. Errores controlados de la aplicación (validación, 404, etc.)
  if (err instanceof AppError) {
    ResponseWrapper.error(res, err.statusCode, err.message, err.details);
    return;
  }

  // 2. JSON mal formado o payload demasiado grande (lanzados por express.json()).
  const parserErr = err as BodyParserError;
  if (parserErr?.type === 'entity.parse.failed') {
    ResponseWrapper.error(res, 400, 'El cuerpo de la petición no es un JSON válido');
    return;
  }
  if (parserErr?.type === 'entity.too.large') {
    ResponseWrapper.error(res, 413, 'El cuerpo de la petición excede el tamaño permitido');
    return;
  }

  // 3. Cualquier otra cosa: se registra en el servidor y se responde un mensaje genérico.
  console.error('💥 [Unhandled Error]:', err);
  ResponseWrapper.error(res, 500, 'Error interno del servidor');
};
