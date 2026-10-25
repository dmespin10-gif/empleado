// src/config/security.ts
// Configuración de seguridad leída del entorno + creación del usuario administrador inicial.
import type { IUserRepository } from '../repositories/user.repository.interface.js';
import type { IPasswordHasher } from '../security/security.interfaces.js';

export const securityConfig = () => {
  const jwtSecret = process.env['JWT_SECRET'];
  if (!jwtSecret) {
    console.warn('⚠️  [Security]: JWT_SECRET no está definido en .env; se usa un secreto de desarrollo.');
  }
  return {
    jwtSecret: jwtSecret ?? 'dev-secret-cambiar-en-produccion',
    jwtExpiresIn: (process.env['JWT_EXPIRES_IN'] ?? '1h') as `${number}h`,
    adminEmail: process.env['ADMIN_EMAIL'] ?? 'admin@empresa.com',
    adminPassword: process.env['ADMIN_PASSWORD'] ?? 'Admin12345',
  };
};

/** Crea el usuario administrador si todavía no existe (para poder iniciar sesión la primera vez). */
export const seedAdmin = async (
  users: IUserRepository,
  hasher: IPasswordHasher,
  email: string,
  password: string,
): Promise<void> => {
  try {
    if (await users.findByEmail(email)) return;
    await users.create({ nombre: 'Administrador', email, passwordHash: await hasher.hash(password), role: 'admin' });
    console.log(`👤 [Security]: Usuario administrador creado (${email})`);
  } catch (error) {
    // En modo cluster (PM2) varias instancias arrancan a la vez; si otra ya creó
    // el administrador, el índice único de email rechaza el duplicado. No es un error fatal.
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  [Security]: No se creó el administrador (${msg})`);
  }
};
