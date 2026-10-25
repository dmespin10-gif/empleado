// src/repositories/in-memory-employee.repository.ts
// Implementación alternativa del contrato IEmployeeRepository SIN MongoDB.
// Sirve para pruebas de carga locales y demuestra la Inversión de Dependencias:
// el controlador, las rutas y el validador Zod no cambian en absoluto.
import { randomBytes } from 'node:crypto';
import type { IEmployeeRepository } from './employee.repository.interface.js';
import type {
  Employee,
  EmployeeInput,
  EmployeeUpdate,
  PaginatedResult,
  PaginationOptions,
} from '../domain/employee.entity.js';

export class InMemoryEmployeeRepository implements IEmployeeRepository {
  private readonly store = new Map<string, Employee>();

  async findAll(options?: PaginationOptions): Promise<PaginatedResult<Employee>> {
    const all = [...this.store.values()];
    const total = all.length;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? Math.max(total, 1);
    const items = options ? all.slice((page - 1) * limit, page * limit) : all;
    return { items, total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) };
  }

  async findById(id: string): Promise<Employee | null> {
    return this.store.get(id) ?? null;
  }

  async create(data: EmployeeInput): Promise<Employee> {
    const now = new Date();
    const employee: Employee = { id: randomBytes(12).toString('hex'), ...data, createdAt: now, updatedAt: now };
    this.store.set(employee.id, employee);
    return employee;
  }

  async update(id: string, data: EmployeeUpdate): Promise<Employee | null> {
    const current = this.store.get(id);
    if (!current) return null;
    const patch = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    const updated: Employee = { ...current, ...patch, updatedAt: new Date() };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}
