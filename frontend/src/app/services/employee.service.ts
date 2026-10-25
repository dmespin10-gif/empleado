import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiResponse,
  EMPTY_DRAFT,
  Employee,
  EmployeeDraft,
  EmployeePayload,
  Notification,
} from '../models/employee';

/**
 * [Reto 3] Servicio reactivo: ÚNICA fuente de verdad del estado de empleados.
 *  - Los BehaviorSubject son privados: nadie fuera del servicio puede hacer .next().
 *  - Se exponen flujos de solo lectura (Observable$).
 *  - Cada mutación emite una referencia NUEVA ([...current, nuevo], map, filter): nunca push/splice.
 *  - Los componentes NO se suscriben: consumen los flujos con el async pipe.
 */
@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly url = `${environment.apiUrl}/employees`;

  // ---- Estado privado ----
  private readonly employeesSubject = new BehaviorSubject<readonly Employee[]>([]);
  private readonly draftSubject = new BehaviorSubject<EmployeeDraft>({ ...EMPTY_DRAFT });
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly notificationSubject = new BehaviorSubject<Notification | null>(null);

  // ---- Flujos públicos de solo lectura ----
  readonly employees$: Observable<readonly Employee[]> = this.employeesSubject.asObservable();
  readonly draft$: Observable<EmployeeDraft> = this.draftSubject.asObservable();
  readonly selectedId$: Observable<string | null> = this.draft$.pipe(map((d) => d.id ?? null));
  readonly loading$: Observable<boolean> = this.loadingSubject.asObservable();
  readonly notification$: Observable<Notification | null> = this.notificationSubject.asObservable();

  // ---- Comandos ----
  load(): void {
    // Con SSR/prerender no se consulta la API en el servidor de build.
    if (!this.isBrowser) return;
    this.execute(this.http.get<ApiResponse<Employee[]>>(this.url), (res) => {
      this.employeesSubject.next([...(res.data ?? [])]);
    });
  }

  create(payload: EmployeePayload): void {
    this.execute(this.http.post<ApiResponse<Employee>>(this.url, payload), (res) => {
      const created = res.data;
      if (!created) return;
      const current = this.employeesSubject.getValue();
      this.employeesSubject.next([...current, created]); // inmutable
      this.resetDraft();
      this.notify('success', res.message);
    });
  }

  update(id: string, payload: EmployeePayload): void {
    this.execute(this.http.put<ApiResponse<Employee>>(`${this.url}/${id}`, payload), (res) => {
      const updated = res.data;
      if (!updated) return;
      const current = this.employeesSubject.getValue();
      this.employeesSubject.next(current.map((e) => (e.id === id ? updated : e))); // inmutable
      this.resetDraft();
      this.notify('success', res.message);
    });
  }

  delete(id: string): void {
    this.execute(this.http.delete<ApiResponse<{ id: string }>>(`${this.url}/${id}`), (res) => {
      const current = this.employeesSubject.getValue();
      this.employeesSubject.next(current.filter((e) => e.id !== id)); // inmutable
      if (this.draftSubject.getValue().id === id) this.resetDraft();
      this.notify('success', res.message);
    });
  }

  /** Carga un empleado en el formulario (se entrega un CLON, nunca la referencia de la rejilla). */
  select(employee: Employee): void {
    const { id, nombre, cargo, departamento, sueldo } = employee;
    this.draftSubject.next({ id, nombre, cargo, departamento, sueldo });
  }

  /** Emite un borrador vacío NUEVO: el cambio de referencia hace que el formulario se limpie. */
  resetDraft(): void {
    this.draftSubject.next({ ...EMPTY_DRAFT });
  }

  dismissNotification(): void {
    this.notificationSubject.next(null);
  }

  // ---- Infraestructura interna ----
  private execute<T>(request$: Observable<T>, onSuccess: (value: T) => void): void {
    this.loadingSubject.next(true);
    this.notificationSubject.next(null);
    request$.pipe(finalize(() => this.loadingSubject.next(false))).subscribe({
      next: onSuccess,
      error: (err: HttpErrorResponse) => this.notificationSubject.next(this.toNotification(err)),
    });
  }

  private notify(type: Notification['type'], text: string, details: string[] = []): void {
    this.notificationSubject.next({ type, text, details });
  }

  /** Traduce el Response Wrapper de error del backend a un mensaje para la vista. */
  private toNotification(err: HttpErrorResponse): Notification {
    if (err.status === 0) {
      return { type: 'danger', text: 'No se pudo conectar con el servidor. ¿Está levantado el backend?', details: [] };
    }
    const body = err.error as Partial<ApiResponse<null>> | null;
    return {
      type: 'danger',
      text: body?.message ?? `Error inesperado (${err.status})`,
      details: (body?.errors ?? []).map((e) => `${e.field.replace(/^body\./, '')}: ${e.message}`),
    };
  }
}
