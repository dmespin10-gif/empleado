import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { EMPTY_DRAFT, EmployeeDraft } from '../../models/employee';

/**
 * [Reto 4] DUMB COMPONENT (Presentacional) — formulario de captura.
 *  - No inyecta servicios: se comunica SOLO por @Input() / @Output().
 *  - CLONA la entrada: editar en el formulario nunca muta el objeto que muestra la rejilla.
 */
@Component({
  selector: 'app-employee-form',
  templateUrl: './employee-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFormComponent implements OnChanges {
  @Input({ required: true }) employee: EmployeeDraft = { ...EMPTY_DRAFT };
  @Input() saving = false;

  @Output() readonly save = new EventEmitter<EmployeeDraft>();
  @Output() readonly cancel = new EventEmitter<void>();

  @ViewChild('employeeForm') private form?: NgForm;

  /** Copia local editable. */
  model: EmployeeDraft = { ...EMPTY_DRAFT };

  get isEdit(): boolean {
    return !!this.model.id;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employee']) {
      this.model = { ...this.employee }; // clon defensivo
      this.form?.resetForm(this.model); // limpia estados touched/submitted
    }
  }

  submit(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.save.emit({ ...this.model }); // se emite otro clon, nunca la referencia interna
  }
}
