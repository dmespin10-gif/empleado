// src/controllers/employee.controller.spec.ts
// FASE A — Prueba unitaria de caja blanca (ISO/IEC 25010: Mantenibilidad → Modularidad / Capacidad de prueba)
// IMPORTANTE: este archivo NO importa el ODM ni el modelo. Solo depende de la abstracción.
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import { EmployeeController } from './employee.controller.js';
import type { IEmployeeRepository } from '../repositories/employee.repository.interface.js';
import type { Employee, PaginatedResult } from '../domain/employee.entity.js';
import { NotFoundError } from '../errors/app-error.js';

describe('🧪 Unit Test: EmployeeController (Mantenibilidad & Testabilidad)', () => {
  let controller: EmployeeController;
  let mockRepository: jest.Mocked<IEmployeeRepository>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const fakeEmployee: Employee = {
    id: '665f1c2b9a1e4b0012345678',
    nombre: 'Andrés Mendoza',
    cargo: 'Arquitecto',
    departamento: 'TI',
    sueldo: 4000,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    // 1. Mock 100 % aislado de la interfaz (cero dependencia del ODM, de la BD o de Docker)
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IEmployeeRepository>;

    // 2. Inyección de dependencias por constructor
    controller = new EmployeeController(mockRepository);

    // 3. Mock del ciclo de vida de Express: res.status(...).json(...)
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = { status: statusMock } as unknown as Partial<Response>;
  });

  it('Debería retornar un estado 200 y la lista de empleados de la abstracción', async () => {
    const page: PaginatedResult<Employee> = { items: [fakeEmployee], total: 1, page: 1, limit: 1, totalPages: 1 };
    mockRepository.findAll.mockResolvedValue(page);
    mockRequest = { query: {} };

    await controller.getAll(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    // El controlador envuelve la respuesta con el Response Wrapper Pattern
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, statusCode: 200, data: [fakeEmployee] }),
    );
    expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    expect(mockRepository.findAll).toHaveBeenCalledWith(undefined); // sin page/limit → colección completa
  });

  it('Debería solicitar paginación al repositorio cuando llegan page y limit', async () => {
    mockRepository.findAll.mockResolvedValue({ items: [], total: 0, page: 2, limit: 5, totalPages: 1 });
    mockRequest = { query: { page: 2, limit: 5 } as never };

    await controller.getAll(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.findAll).toHaveBeenCalledWith({ page: 2, limit: 5 });
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { total: 0, page: 2, limit: 5, totalPages: 1 } }),
    );
  });

  it('Debería retornar 201 al crear un empleado', async () => {
    const dto = { nombre: 'Andrés Mendoza', cargo: 'Arquitecto', departamento: 'TI', sueldo: 4000 };
    mockRepository.create.mockResolvedValue(fakeEmployee);
    mockRequest = { body: dto };

    await controller.create(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.create).toHaveBeenCalledWith(dto);
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: fakeEmployee }));
  });

  it('Debería lanzar NotFoundError (404) si el repositorio no encuentra el id', async () => {
    mockRepository.findById.mockResolvedValue(null);
    mockRequest = { params: { id: fakeEmployee.id } };

    await expect(controller.getById(mockRequest as Request, mockResponse as Response)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(statusMock).not.toHaveBeenCalled();
  });
});
