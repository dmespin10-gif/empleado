import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, finalize, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/employee';
import { AuthSession, AuthUser, LoginPayload } from '../models/auth';

const STORAGE_KEY = 'auth_session';

/**
 * Servicio reactivo de autenticación (mismo estilo que EmployeeService):
 *  - Estado en BehaviorSubject privados, expuesto como Observable$ de solo lectura.
 *  - La sesión (usuario + token) se guarda en localStorage para sobrevivir a un F5.
 *  - Con SSR/prerender no se toca localStorage (no existe en el servidor).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly url = `${environment.apiUrl}/auth`;

  // ---- Estado privado ----
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(this.restore());
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  // ---- Flujos públicos de solo lectura ----
  readonly user$: Observable<AuthUser | null> = this.sessionSubject.pipe(map((s) => s?.user ?? null));
  readonly loading$: Observable<boolean> = this.loadingSubject.asObservable();
  readonly error$: Observable<string | null> = this.errorSubject.asObservable();

  /** Token actual (lo usa el interceptor para el header Authorization). */
  get token(): string | null {
    return this.sessionSubject.getValue()?.token ?? null;
  }

  /** true si hay token y todavía no expiró. */
  isAuthenticated(): boolean {
    const token = this.token;
    if (!token) return false;
    if (this.isExpired(token)) {
      this.clear();
      return false;
    }
    return true;
  }

  // ---- Comandos ----
  login(payload: LoginPayload): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.http
      .post<ApiResponse<AuthSession>>(`${this.url}/login`, payload)
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe({
        next: (res) => {
          if (!res.data) return;
          this.save(res.data);
          void this.router.navigate(['/employees']); // redirección segura tras guardar el token
        },
        error: (err: HttpErrorResponse) => this.errorSubject.next(this.toMessage(err)),
      });
  }

  /** Cierra la sesión. `reason` se muestra en la pantalla de login (p. ej. "sesión expirada"). */
  logout(reason: string | null = null): void {
    this.clear();
    this.errorSubject.next(reason);
    void this.router.navigate(['/auth']);
  }

  // ---- Infraestructura interna ----
  private save(session: AuthSession): void {
    if (this.isBrowser) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  private clear(): void {
    if (this.isBrowser) localStorage.removeItem(STORAGE_KEY);
    this.sessionSubject.next(null);
  }

  private restore(): AuthSession | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const session = raw ? (JSON.parse(raw) as AuthSession) : null;
      return session && !this.isExpired(session.token) ? session : null;
    } catch {
      return null;
    }
  }

  /** Lee la fecha "exp" del JWT (no verifica la firma: eso lo hace el backend). */
  private isExpired(token: string): boolean {
    try {
      const part = token.split('.')[1] ?? '';
      const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
      return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

  private toMessage(err: HttpErrorResponse): string {
    if (err.status === 0) return 'No se pudo conectar con el servidor. ¿Está levantado el backend?';
    const body = err.error as Partial<ApiResponse<null>> | null;
    return body?.message ?? `Error inesperado (${err.status})`;
  }
}
