import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { AuthSession } from '../models/auth';

const LOGIN_URL = `${environment.apiUrl}/auth/login`;

/** Token con formato JWT y "exp" dentro de 1 hora (la firma no se valida en el frontend). */
const fakeToken = (expInSeconds = 3600): string => {
  const payload = btoa(JSON.stringify({ sub: '1', exp: Math.floor(Date.now() / 1000) + expInSeconds }));
  return `header.${payload}.firma`;
};

const session = (token = fakeToken()): AuthSession => ({
  token,
  user: { id: '1', nombre: 'Administrador', email: 'admin@empresa.com', role: 'admin' },
});

describe('AuthService (login reactivo)', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: Router, useValue: router }],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('login correcto: guarda la sesión, emite el usuario y navega al inicio', async () => {
    const s = session();
    service.login({ email: 'admin@empresa.com', password: 'Admin12345' });
    http.expectOne(LOGIN_URL).flush({ success: true, statusCode: 200, message: 'OK', data: s, errors: null, timestamp: '' });

    expect(await firstValueFrom(service.user$)).toEqual(s.user);
    expect(service.token).toBe(s.token);
    expect(service.isAuthenticated()).toBeTrue();
    expect(localStorage.getItem('auth_session')).not.toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/employees']);
  });

  it('login incorrecto: muestra el mensaje del backend y no guarda sesión', async () => {
    service.login({ email: 'admin@empresa.com', password: 'mala' });
    http.expectOne(LOGIN_URL).flush(
      { success: false, statusCode: 401, message: 'Email o contraseña incorrectos', data: null, errors: null, timestamp: '' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(await firstValueFrom(service.error$)).toBe('Email o contraseña incorrectos');
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('logout: borra la sesión y lleva al login', async () => {
    service.login({ email: 'a@b.com', password: 'x' });
    http.expectOne(LOGIN_URL).flush({ success: true, statusCode: 200, message: 'OK', data: session(), errors: null, timestamp: '' });

    service.logout();

    expect(await firstValueFrom(service.user$)).toBeNull();
    expect(localStorage.getItem('auth_session')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth']);
  });

  it('un token vencido no cuenta como sesión válida', () => {
    service.login({ email: 'a@b.com', password: 'x' });
    http.expectOne(LOGIN_URL).flush({ success: true, statusCode: 200, message: 'OK', data: session(fakeToken(-10)), errors: null, timestamp: '' });

    expect(service.isAuthenticated()).toBeFalse();
  });
});
