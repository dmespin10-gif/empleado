// src/repositories/employee.repository.interface.ts
// [Reto 1] Contrato abstracto de persistencia (Patrón Repository).
// Los controladores dependen de ESTA interfaz, nunca de Mongoose (Inversión de Dependencias).

import type {
  Employee,
  EmployeeInput,
  EmployeeUpdate,
  PaginatedResult,
  PaginationOptions,
} from '../domain/employee.entity.js';

export interface IEmployeeRepository {
  /** Sin opciones devuelve la colección completa; con opciones, una página. */
  findAll(options?: PaginationOptions): Promise<PaginatedResult<Employee>>;
  findById(id: string): Promise<Employee | null>;
  create(data: EmployeeInput): Promise<Employee>;
  /** Devuelve null si el registro no existe. */
  update(id: string, data: EmployeeUpdate): Promise<Employee | null>;
  /** Devuelve false si el registro no existe. */
  delete(id: string): Promise<boolean>;
}
