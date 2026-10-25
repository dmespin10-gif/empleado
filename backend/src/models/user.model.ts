// src/models/user.model.ts
// Esquema de Mongoose para usuarios. SOLO lo importa MongoUserRepository.
import { Schema, model } from 'mongoose';
import type { UserRole } from '../domain/user.entity.js';

export interface UserRecord {
  nombre: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserRecord>(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
  },
  { timestamps: true, versionKey: false },
);

export const UserModel = model<UserRecord>('Usuario', userSchema);
