import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { EmployeeService } from './employee.service';
import { environment } from '../../environments/environment';
import { ApiResponse, Employee } from '../models/employee';

const URL = `${environment.apiUrl}/employees`;
const wrap = <T>(data: T, message = 'OK'): ApiResponse<T> => ({
  success: true, statusCode: 200, message, data, errors: null, timestamp: new Date().toISOString(),
});
const ana: Employee = { id: 'a'.repeat(24), nombre: 'Ana Torres', cargo: 'Dev', departamento: 'TI', sueldo: 1500 };
const luis: Employee = { id: 'b'.repeat(24), nombre: 'Luis Vera', cargo: 'QA', departamento: 'TI', sueldo: 1200 };

describe('EmployeeService (estado reactivo inmutable)', () => {
  let service: EmployeeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(EmployeeService);
    http = TestBed.inject(HttpTestingController);
    service.load();
    http.expectOne(URL).flush(wrap([ana]));
  });

  afterEach(() => http.verify());

  it('carga la lista desde el Response Wrapper', async () => {
    expect(await firstValueFrom(service.employees$)).toEqual([ana]);
  });

  it('create emite un arreglo NUEVO ([...current, nuevo])', async () => {
    const before = await firstValueFrom(service.employees$);
    service.create({ nombre: luis.nombre, cargo: luis.cargo, departamento: luis.departamento, sueldo: luis.sueldo });
    http.expectOne((r) => r.method === 'POST' && r.url === URL).flush(wrap(luis));
    const after = await firstValueFrom(service.employees$);
    expect(after).toEqual([ana, luis]);
    expect(after).not.toBe(before);
    expect(before).toEqual([ana]); // el estado anterior no fue mutado
  });

  it('update reemplaza solo el elemento modificado sin mutar la referencia previa', async () => {
    const before = await firstValueFrom(service.employees$);
    service.update(ana.id, { ...ana, sueldo: 9999 });
    http.expectOne(`${URL}/${ana.id}`).flush(wrap({ ...ana, sueldo: 9999 }));
    const after = await firstValueFrom(service.employees$);
    expect(after[0]?.sueldo).toBe(9999);
    expect(before[0]?.sueldo).toBe(1500);
  });

  it('delete filtra el elemento eliminado', async () => {
    service.delete(ana.id);
    http.expectOne(`${URL}/${ana.id}`).flush(wrap({ id: ana.id }));
    expect(await firstValueFrom(service.employees$)).toEqual([]);
  });

  it('select entrega un CLON al formulario', async () => {
    service.select(ana);
    const draft = await firstValueFrom(service.draft$);
    expect(draft).toEqual({ id: ana.id, nombre: ana.nombre, cargo: ana.cargo, departamento: ana.departamento, sueldo: ana.sueldo });
    expect(draft as unknown).not.toBe(ana);
  });

  it('traduce los errores 400 del backend en una notificación con detalles', async () => {
    service.create({ nombre: 'An', cargo: 'Dev', departamento: 'TI', sueldo: -1 });
    http.expectOne(URL).flush(
      { success: false, statusCode: 400, message: 'Los datos enviados no son válidos', data: null,
        errors: [{ field: 'body.nombre', message: 'Mínimo 3' }], timestamp: '' },
      { status: 400, statusText: 'Bad Request' },
    );
    const n = await firstValueFrom(service.notification$);
    expect(n?.type).toBe('danger');
    expect(n?.details).toEqual(['nombre: Mínimo 3']);
  });
});
