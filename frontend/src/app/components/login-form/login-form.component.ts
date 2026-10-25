import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgForm } from '@angular/forms';
import { LoginPayload } from '../../models/auth';

/**
 * DUMB COMPONENT (Presentacional) — formulario de inicio de sesión.
 *  - No inyecta servicios: recibe estado por @Input() y avisa por @Output().
 */
@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent {
  @Input() loading = false;
  @Input() error: string | null = null;

  @Output() readonly login = new EventEmitter<LoginPayload>();

  model: LoginPayload = { email: '', password: '' };
  showPassword = false;

  submit(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.login.emit({ email: this.model.email.trim(), password: this.model.password });
  }
}
