import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: { token: string | null; logout: jasmine.Spy };

  beforeEach(() => {
    auth = { token: null, logout: jasmine.createSpy('logout') };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('agrega el header Authorization cuando hay token', () => {
    auth.token = 'abc';
    http.get('/api/v1/employees').subscribe();
    expect(backend.expectOne('/api/v1/employees').request.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('no agrega el header sin sesión', () => {
    http.get('/api/v1/employees').subscribe();
    expect(backend.expectOne('/api/v1/employees').request.headers.has('Authorization')).toBeFalse();
  });

  it('cierra la sesión si la API responde 401', () => {
    auth.token = 'vencido';
    http.post('/api/v1/employees', {}).subscribe({ error: () => undefined });
    backend.expectOne('/api/v1/employees').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).toHaveBeenCalled();
  });
});
