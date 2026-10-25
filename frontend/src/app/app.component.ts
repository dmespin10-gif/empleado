import { Component, inject } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private readonly auth = inject(AuthService);

  /** Usuario actual: la barra superior solo se muestra con sesión iniciada. */
  readonly user$ = this.auth.user$;

  logout(): void {
    this.auth.logout();
  }
}
