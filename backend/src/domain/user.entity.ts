// src/domain/user.entity.ts
// Modelo de dominio PURO del usuario: no conoce Mongoose, Express, bcrypt ni JWT.

export type UserRole = 'admin' | 'user';

/** Usuario tal como se expone hacia afuera (NUNCA incluye la contraseña). */
export interface User {
  id: string;
  nombre: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/** Usuario con su hash: solo lo ven el repositorio y el controlador de login. */
export interface UserWithPassword extends User {
  passwordHash: string;
}

/** Datos para crear un usuario (la contraseña ya llega hasheada). */
export interface UserInput {
  nombre: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

/** Información mínima que viaja dentro del token y queda disponible en la petición. */
export interface AuthPayload {
  sub: string; // id del usuario
  email: string;
  role: UserRole;
}
