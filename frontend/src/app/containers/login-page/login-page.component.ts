import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { combineLatest } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LoginPayload } from '../../models/auth';

/**
 * SMART COMPONENT (Orquestador) de la pantalla de login.
 *  - Es el único que conoce al AuthService; usa async pipe (cero .subscribe()).
 */
@Component({
  selector: 'app-login-page',
  template: `
    @if (vm$ | async; as vm) {
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-sm-10 col-md-6 col-lg-4">
            <app-login-form [loading]="vm.loading" [error]="vm.error" (login)="onLogin($event)" />
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);

  readonly vm$ = combineLatest({ loading: this.auth.loading$, error: this.auth.error$ });

  onLogin(payload: LoginPayload): void {
    this.auth.login(payload);
  }
}
