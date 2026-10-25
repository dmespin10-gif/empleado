// src/controllers/employee.controller.ts
// [Reto 1] Controlador AGNÓSTICO al ODM: no importa mongoose ni el modelo.
// Recibe el repositorio por inyección de dependencias (constructor).
import type { Request, Response } from 'express';
import type { IEmployeeRepository } from '../repositories/employee.repository.interface.js';
import type {
  CreateEmployeeDto,
  EmployeeIdParamDto,
  PaginationQueryDto,
  UpdateEmployeeDto,
} from '../dtos/employee.dto.js';
import { NotFoundError } from '../errors/app-error.js';
import { ResponseWrapper } from '../utils/api-response.js';

// Express 5 propaga automáticamente los rechazos de promesas al middleware de errores,
// por eso no se necesitan try/catch en cada método.
export class EmployeeController {
  constructor(private readonly repository: IEmployeeRepository) {}

  /** GET /employees?page=&limit= */
  getAll = async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = req.query as PaginationQueryDto;
    const paginate = page !== undefined || limit !== undefined;
    const result = await this.repository.findAll(paginate ? { page: page ?? 1, limit: limit ?? 10 } : undefined);
    const { items, ...meta } = result;
    ResponseWrapper.success(res, items, 'Empleados obtenidos correctamente', 200, meta);
  };

  /** GET /employees/:id */
  getById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as EmployeeIdParamDto;
    const employee = await this.repository.findById(id);
    if (!employee) throw new NotFoundError(`No existe un empleado con id ${id}`);
    ResponseWrapper.success(res, employee, 'Empleado encontrado');
  };

  /** POST /employees */
  create = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as CreateEmployeeDto;
    const employee = await this.repository.create(dto);
    ResponseWrapper.success(res, employee, 'Empleado registrado correctamente', 201);
  };

  /** PUT /employees/:id (total) y PATCH /employees/:id (parcial) */
  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as EmployeeIdParamDto;
    const dto = req.body as UpdateEmployeeDto;
    const employee = await this.repository.update(id, dto);
    if (!employee) throw new NotFoundError(`No existe un empleado con id ${id}`);
    ResponseWrapper.success(res, employee, 'Empleado actualizado correctamente');
  };

  /** DELETE /employees/:id */
  remove = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as EmployeeIdParamDto;
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError(`No existe un empleado con id ${id}`);
    ResponseWrapper.success(res, { id }, 'Empleado eliminado correctamente');
  };
}
