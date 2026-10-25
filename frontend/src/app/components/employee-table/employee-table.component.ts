import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Employee } from '../../models/employee';

/**
 * [Reto 4] DUMB COMPONENT (Presentacional) — rejilla de visualización.
 *  - Recibe datos por @Input() de solo lectura y notifica intenciones por @Output().
 *  - No modifica el arreglo ni sus elementos.
 */
@Component({
  selector: 'app-employee-table',
  templateUrl: './employee-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeTableComponent {
  @Input({ required: true }) employees: readonly Employee[] = [];
  @Input() selectedId: string | null = null;
  @Input() disabled = false;

  @Output() readonly edit = new EventEmitter<Employee>();
  @Output() readonly remove = new EventEmitter<Employee>();
}
