// src/index.memory.ts
// Composition Root alternativo: misma app, pero con persistencia en memoria (sin MongoDB).
// Uso: npm run dev:memory
try {
  process.loadEnvFile();
} catch {
  // Sin .env se usan los valores por defecto
}

import { createApp } from './app.js';
import { securityConfig, seedAdmin } from './config/security.js';
import { InMemoryEmployeeRepository } from './repositories/in-memory-employee.repository.js';
import { InMemoryUserRepository } from './repositories/in-memory-user.repository.js';
import { BcryptPasswordHasher } from './security/bcrypt-password-hasher.js';
import { JwtTokenService } from './security/jwt-token.service.js';

const PORT = Number(process.env['PORT'] ?? 5000);

const bootstrap = async (): Promise<void> => {
  const config = securityConfig();
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new BcryptPasswordHasher();
  await seedAdmin(userRepository, passwordHasher, config.adminEmail, config.adminPassword);

  const app = createApp({
    employeeRepository: new InMemoryEmployeeRepository(),
    userRepository,
    passwordHasher,
    tokenService: new JwtTokenService(config.jwtSecret, config.jwtExpiresIn),
  });
  app.listen(PORT, () => {
    console.log(`🧠 Servidor (repositorio EN MEMORIA) escuchando en http://localhost:${PORT}/api/v1`);
  });
};

void bootstrap();
