// src/middlewares/validate.middleware.ts
// [Reto 2] Validación perimetral: la petición se rechaza ANTES de llegar al controlador.
import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationError, type ErrorDetail } from '../errors/app-error.js';

type Target = 'body' | 'params' | 'query';
type SchemaMap = Partial<Record<Target, ZodType>>;

export const validate =
  (schemas: SchemaMap) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const details: ErrorDetail[] = [];

    for (const target of Object.keys(schemas) as Target[]) {
      const schema = schemas[target];
      if (!schema) continue;

      // req.body puede venir undefined si no se envió Content-Type JSON.
      const result = schema.safeParse(req[target] ?? {});
      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({
            field: [target, ...issue.path.map(String)].join('.'),
            message: issue.message,
          });
        }
        continue;
      }

      // Se reemplaza la entrada por la versión saneada (trim, coerción, sin campos extra).
      // En Express 5 req.query es un getter, por eso se redefine la propiedad.
      Object.defineProperty(req, target, { value: result.data, writable: true, configurable: true, enumerable: true });
    }

    if (details.length > 0) {
      next(new ValidationError(details));
      return;
    }
    next();
  };
