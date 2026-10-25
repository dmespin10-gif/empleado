// src/dtos/employee.dto.ts
// [Reto 2] Esquemas declarativos Zod que blindan req.body, req.params y req.query.
import { z } from 'zod';

const nombre = z
  .string({ error: 'El nombre es obligatorio y debe ser texto' })
  .trim()
  .min(3, 'El nombre debe tener al menos 3 caracteres')
  .max(100, 'El nombre no puede superar 100 caracteres');

const cargo = z
  .string({ error: 'El cargo es obligatorio y debe ser texto' })
  .trim()
  .min(2, 'El cargo debe tener al menos 2 caracteres')
  .max(80, 'El cargo no puede superar 80 caracteres');

const departamento = z
  .string({ error: 'El departamento es obligatorio y debe ser texto' })
  .trim()
  .min(2, 'El departamento debe tener al menos 2 caracteres')
  .max(80, 'El departamento no puede superar 80 caracteres');

const sueldo = z
  .number({ error: 'El sueldo es obligatorio y debe ser numérico' })
  .positive('El sueldo debe ser mayor a 0')
  .max(1_000_000, 'El sueldo excede el límite permitido');

/** POST / PUT: registro completo. strictObject rechaza campos no declarados (mass assignment). */
export const CreateEmployeeSchema = z.strictObject(
  { nombre, cargo, departamento, sueldo },
  {
    error: (issue) =>
      issue.code === 'unrecognized_keys' ? `Campos no permitidos: ${issue.keys.join(', ')}` : undefined,
  },
);

/** PATCH: mutación parcial, pero al menos un campo. */
export const UpdateEmployeeSchema = CreateEmployeeSchema.partial().refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'Debe enviar al menos un campo para actualizar' },
);

/** :id en la URL — formato de identificador de 24 caracteres hexadecimales. */
export const EmployeeIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'El identificador no tiene un formato válido'),
});

/** ?page=&limit= — si no se envía ninguno, se devuelve la colección completa. */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int('page debe ser entero').min(1, 'page debe ser >= 1').optional(),
  limit: z.coerce.number().int('limit debe ser entero').min(1, 'limit debe ser >= 1').max(100, 'limit máximo 100').optional(),
});

export type CreateEmployeeDto = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeDto = z.infer<typeof UpdateEmployeeSchema>;
export type EmployeeIdParamDto = z.infer<typeof EmployeeIdParamSchema>;
export type PaginationQueryDto = z.infer<typeof PaginationQuerySchema>;
