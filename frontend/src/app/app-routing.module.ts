import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmployeePageComponent } from './containers/employee-page/employee-page.component';
import { LoginPageComponent } from './containers/login-page/login-page.component';
import { authGuard, guestGuard } from './guards/auth.guard';

/**
 * Práctica 05 (JWT) – Instrucción 4:
 *  - /auth       → pantalla de login (si ya hay sesión, guestGuard manda a /employees).
 *  - /employees  → protegida con authGuard: sin token válido redirige a /auth.
 *  - Cualquier otra ruta termina en /auth, así nadie entra a /employees sin pasar por el login.
 */
const routes: Routes = [
  { path: 'auth', component: LoginPageComponent, canActivate: [guestGuard], title: 'Iniciar sesión' },
  { path: 'employees', component: EmployeePageComponent, canActivate: [authGuard], title: 'Gestión de Empleados' },
  { path: '', pathMatch: 'full', redirectTo: 'auth' },
  { path: '**', redirectTo: 'auth' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
