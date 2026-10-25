// src/models/employee.model.ts
// Esquema de Mongoose. SOLO lo importa la implementación concreta del repositorio.
import { Schema, model } from 'mongoose';

export interface EmployeeRecord {
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<EmployeeRecord>(
  {
    nombre: { type: String, required: true, trim: true },
    cargo: { type: String, required: true, trim: true },
    departamento: { type: String, required: true, trim: true },
    sueldo: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Se conserva el nombre de colección original ("empleados") para no perder datos existentes.
export const EmployeeModel = model<EmployeeRecord>('Empleado', employeeSchema);
