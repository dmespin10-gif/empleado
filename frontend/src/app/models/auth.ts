/** Usuario autenticado tal como lo devuelve /api/v1/auth/login (nunca incluye la contraseña). */
export interface AuthUser {
  readonly id: string;
  readonly nombre: string;
  readonly email: string;
  readonly role: 'admin' | 'user';
}

/** Datos que se envían al iniciar sesión. */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Sesión guardada en el navegador: usuario + token JWT. */
export interface AuthSession {
  readonly user: AuthUser;
  readonly token: string;
}
