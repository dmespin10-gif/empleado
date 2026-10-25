// src/domain/employee.entity.ts
// Modelo de dominio PURO: no conoce Mongoose, Express ni Zod.

export interface Employee {
  id: string;
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Datos necesarios para registrar un empleado (sin campos generados por el sistema). */
export type EmployeeInput = Pick<Employee, 'nombre' | 'cargo' | 'departamento' | 'sueldo'>;

/** Mutación parcial: cualquier subconjunto de campos editables. */
export type EmployeeUpdate = { [K in keyof EmployeeInput]?: EmployeeInput[K] | undefined };

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
