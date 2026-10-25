import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Protege /employees: solo deja entrar si hay un JWT vigente; si no, redirige a /auth. */
export const authGuard: CanActivateFn = () => {
  // En el servidor (SSR/prerender) no hay localStorage: se decide en el navegador.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  return inject(AuthService).isAuthenticated() ? true : inject(Router).createUrlTree(['/auth']);
};

/** Evita volver a /auth si ya hay sesión iniciada: lo manda directo a /employees. */
export const guestGuard: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  return inject(AuthService).isAuthenticated() ? inject(Router).createUrlTree(['/employees']) : true;
};
