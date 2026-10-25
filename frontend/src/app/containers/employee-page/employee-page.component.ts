import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { combineLatest } from 'rxjs';
import { EmployeeService } from '../../services/employee.service';
import { Employee, EmployeeDraft, EmployeePayload } from '../../models/employee';

/**
 * [Reto 4] SMART COMPONENT (Orquestador).
 *  - Es el único que conoce al EmployeeService.
 *  - Consume el estado con el async pipe (cero .subscribe()).
 *  - Delega toda la renderización a componentes presentacionales.
 */
@Component({
  selector: 'app-employee-page',
  templateUrl: './employee-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeePageComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);

  /** View-model: un solo flujo combinado para la plantilla. */
  readonly vm$ = combineLatest({
    employees: this.employeeService.employees$,
    draft: this.employeeService.draft$,
    selectedId: this.employeeService.selectedId$,
    loading: this.employeeService.loading$,
    notification: this.employeeService.notification$,
  });

  ngOnInit(): void {
    this.employeeService.load();
  }

  onSave(draft: EmployeeDraft): void {
    const payload: EmployeePayload = {
      nombre: draft.nombre.trim(),
      cargo: draft.cargo.trim(),
      departamento: draft.departamento.trim(),
      sueldo: Number(draft.sueldo),
    };
    if (draft.id) {
      this.employeeService.update(draft.id, payload);
    } else {
      this.employeeService.create(payload);
    }
  }

  onEdit(employee: Employee): void {
    this.employeeService.select(employee);
  }

  onCancel(): void {
    this.employeeService.resetDraft();
  }

  onDelete(employee: Employee): void {
    if (confirm(`¿Eliminar a ${employee.nombre}?`)) {
      this.employeeService.delete(employee.id);
    }
  }

  onDismiss(): void {
    this.employeeService.dismissNotification();
  }
}
