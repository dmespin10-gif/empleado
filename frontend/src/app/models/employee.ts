/** Entidad tal como la entrega la API (/api/v1/employees). */
export interface Employee {
  readonly id: string;
  readonly nombre: string;
  readonly cargo: string;
  readonly departamento: string;
  readonly sueldo: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/** Cuerpo que se envía en POST / PUT (los únicos campos que acepta el DTO del backend). */
export type EmployeePayload = Pick<Employee, 'nombre' | 'cargo' | 'departamento' | 'sueldo'>;

/** Modelo editable del formulario: sin id = alta, con id = edición. */
export interface EmployeeDraft {
  id?: string;
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number | null;
}

export const EMPTY_DRAFT: Readonly<EmployeeDraft> = Object.freeze({
  nombre: '',
  cargo: '',
  departamento: '',
  sueldo: null,
});

/** Response Wrapper universal del backend. */
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  errors: ApiErrorDetail[] | null;
  meta?: { total: number; page: number; limit: number; totalPages: number };
  timestamp: string;
}

export interface Notification {
  type: 'success' | 'danger';
  text: string;
  details: string[];
}
