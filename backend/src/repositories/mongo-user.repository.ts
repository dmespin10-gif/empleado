// src/repositories/mongo-user.repository.ts
// Implementación concreta del repositorio de usuarios sobre MongoDB/Mongoose.
import { isValidObjectId, type Types } from 'mongoose';
import { UserModel, type UserRecord } from '../models/user.model.js';
import type { IUserRepository } from './user.repository.interface.js';
import type { User, UserInput, UserWithPassword } from '../domain/user.entity.js';

type LeanUser = UserRecord & { _id: Types.ObjectId };

/** Mapper: documento -> entidad de dominio (oculta _id y la contraseña). */
const toEntity = (doc: LeanUser): User => ({
  id: doc._id.toString(),
  nombre: doc.nombre,
  email: doc.email,
  role: doc.role,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export class MongoUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean<LeanUser>().exec();
    return doc ? { ...toEntity(doc), passwordHash: doc.passwordHash } : null;
  }

  async findById(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await UserModel.findById(id).lean<LeanUser>().exec();
    return doc ? toEntity(doc) : null;
  }

  async create(data: UserInput): Promise<User> {
    const created = await UserModel.create(data);
    return toEntity(created.toObject() as LeanUser);
  }
}
