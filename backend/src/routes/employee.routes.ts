// src/routes/employee.routes.ts
// Contratos REST semánticos. Cada ruta pasa primero por el validador Zod.
// Las consultas (GET) son públicas; registrar, modificar y eliminar exigen iniciar sesión.
import { Router, type RequestHandler } from 'express';
import type { EmployeeController } from '../controllers/employee.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  CreateEmployeeSchema,
  EmployeeIdParamSchema,
  PaginationQuerySchema,
  UpdateEmployeeSchema,
} from '../dtos/employee.dto.js';

export const createEmployeeRouter = (controller: EmployeeController, requireAuth: RequestHandler): Router => {
  const router = Router();

  router.get('/employees', validate({ query: PaginationQuerySchema }), controller.getAll);
  router.get('/employees/:id', validate({ params: EmployeeIdParamSchema }), controller.getById);
  router.post('/employees', requireAuth, validate({ body: CreateEmployeeSchema }), controller.create);
  router.put('/employees/:id', requireAuth, validate({ params: EmployeeIdParamSchema, body: CreateEmployeeSchema }), controller.update);
  router.patch('/employees/:id', requireAuth, validate({ params: EmployeeIdParamSchema, body: UpdateEmployeeSchema }), controller.update);
  router.delete('/employees/:id', requireAuth, validate({ params: EmployeeIdParamSchema }), controller.remove);

  return router;
};
