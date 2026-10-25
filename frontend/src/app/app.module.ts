import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EmployeePageComponent } from './containers/employee-page/employee-page.component';
import { LoginPageComponent } from './containers/login-page/login-page.component';
import { EmployeeFormComponent } from './components/employee-form/employee-form.component';
import { EmployeeTableComponent } from './components/employee-table/employee-table.component';
import { LoginFormComponent } from './components/login-form/login-form.component';
import { authInterceptor } from './interceptors/auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    // Smart
    EmployeePageComponent,
    LoginPageComponent,
    // Dumb
    EmployeeFormComponent,
    EmployeeTableComponent,
    LoginFormComponent,
  ],
  imports: [BrowserModule, AppRoutingModule, FormsModule],
  providers: [
    provideClientHydration(),
    // El interceptor agrega el token JWT a todas las peticiones a la API.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    // EmployeeService y AuthService usan providedIn: 'root'; no se registran aquí para no duplicar instancias.
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
