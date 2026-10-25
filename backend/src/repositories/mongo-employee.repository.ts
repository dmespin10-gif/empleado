// src/repositories/mongo-employee.repository.ts
// [Reto 1] Implementación concreta del repositorio sobre MongoDB/Mongoose.
// Es el ÚNICO archivo (junto con models/ y config/) que conoce el ODM.
import { isValidObjectId, type Types } from 'mongoose';
import { EmployeeModel, type EmployeeRecord } from '../models/employee.model.js';
import type { IEmployeeRepository } from './employee.repository.interface.js';
import type {
  Employee,
  EmployeeInput,
  EmployeeUpdate,
  PaginatedResult,
  PaginationOptions,
} from '../domain/employee.entity.js';

type LeanEmployee = EmployeeRecord & { _id: Types.ObjectId };

/** Mapper: documento de persistencia -> entidad de dominio (oculta _id). */
const toEntity = (doc: LeanEmployee): Employee => ({
  id: doc._id.toString(),
  nombre: doc.nombre,
  cargo: doc.cargo,
  departamento: doc.departamento,
  sueldo: doc.sueldo,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

/** Elimina claves undefined para no sobrescribir campos en un PATCH. */
const compact = (data: EmployeeUpdate): Partial<EmployeeInput> =>
  Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as Partial<EmployeeInput>;

export class MongoEmployeeRepository implements IEmployeeRepository {
  async findAll(options?: PaginationOptions): Promise<PaginatedResult<Employee>> {
    const query = EmployeeModel.find().sort({ createdAt: 1 });
    if (options) {
      query.skip((options.page - 1) * options.limit).limit(options.limit);
    }
    const [docs, total] = await Promise.all([
      query.lean<LeanEmployee[]>().exec(),
      EmployeeModel.countDocuments().exec(),
    ]);
    const page = options?.page ?? 1;
    const limit = options?.limit ?? Math.max(total, 1);
    return {
      items: docs.map(toEntity),
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }

  async findById(id: string): Promise<Employee | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await EmployeeModel.findById(id).lean<LeanEmployee>().exec();
    return doc ? toEntity(doc) : null;
  }

  async create(data: EmployeeInput): Promise<Employee> {
    const created = await EmployeeModel.create(data);
    return toEntity(created.toObject() as LeanEmployee);
  }

  async update(id: string, data: EmployeeUpdate): Promise<Employee | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await EmployeeModel.findByIdAndUpdate(id, compact(data), {
      returnDocument: 'after',
      runValidators: true,
    })
      .lean<LeanEmployee>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    // findByIdAndRemove fue eliminado en Mongoose 8+; se usa findByIdAndDelete.
    const doc = await EmployeeModel.findByIdAndDelete(id).exec();
    return doc !== null;
  }
}
