# Frontend — Gestión de Empleados (Angular 17)

Cliente Angular de la Práctica 03 (Stack MEAN). Consume la API `http://localhost:3000/api/v1/employees`.

## Ejecución

```bash
npm install
ng serve -o          # http://localhost:4200
```

El backend debe estar corriendo (`npm run dev` o `npm run dev:memory` en el repositorio del backend).
La URL de la API se configura en `src/environments/environment.ts`.

## Arquitectura

```
src/app/
├── models/employee.ts                    # Employee, EmployeeDraft, ApiResponse<T> (Response Wrapper)
├── services/employee.service.ts          # [Reto 3] Store reactivo con BehaviorSubject privados
├── containers/employee-page/             # [Reto 4] SMART: orquesta, usa async pipe, inyecta el servicio
└── components/
    ├── employee-form/                    # [Reto 4] DUMB: formulario, @Input()/@Output(), clona su entrada
    └── employee-table/                   # [Reto 4] DUMB: rejilla, @Input()/@Output(), OnPush
```

### Reto 3 — Programación reactiva e inmutabilidad
* `EmployeeService` guarda el estado en `BehaviorSubject` **privados** (`employeesSubject`, `draftSubject`, `loadingSubject`, `notificationSubject`).
* Expone flujos de **solo lectura**: `employees$`, `draft$`, `selectedId$`, `loading$`, `notification$` (`asObservable()`).
* Toda mutación crea una referencia nueva: `[...current, created]`, `current.map(...)`, `current.filter(...)`.
* Los errores del backend (Response Wrapper) se traducen a notificaciones con la lista de campos inválidos.
* Las peticiones solo se lanzan en el navegador (el proyecto usa SSR/prerender).

### Reto 4 — Smart vs. Dumb
* `EmployeePageComponent` (Smart) combina los flujos en un `vm$` y lo consume con **un único `async` pipe**. No hay ningún `.subscribe()` en componentes.
* `EmployeeFormComponent` y `EmployeeTableComponent` (Dumb) no inyectan servicios, usan `ChangeDetectionStrategy.OnPush` y se comunican solo por `@Input()` / `@Output()`.
* El formulario **clona** el empleado recibido (`{ ...this.employee }`) y emite otro clon al guardar: escribir en el formulario no altera la fila de la rejilla.

### Login
* Ruta `/login` (`LoginPageComponent`, Smart) con el formulario `LoginFormComponent` (Dumb).
* `AuthService` guarda la sesión (usuario + token JWT) en un `BehaviorSubject` privado y en `localStorage`, así se mantiene al recargar la página.
* `authInterceptor` agrega `Authorization: Bearer <token>` a cada petición; si la API responde 401, cierra la sesión y vuelve al login.
* `authGuard` protege la página de empleados; `guestGuard` evita volver al login con la sesión abierta.
* Usuario inicial: `admin@empresa.com` / `Admin12345`.

## Pruebas

```bash
ng test
```
`auth.service.spec.ts` y `auth.interceptor.spec.ts` prueban el login, el logout, el token vencido y el header Authorization.
`employee.service.spec.ts` verifica que cada operación emite un arreglo nuevo sin mutar el anterior, que `select` entrega un clon y que los errores 400 se convierten en notificaciones.
