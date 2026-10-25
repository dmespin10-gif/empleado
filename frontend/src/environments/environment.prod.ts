export const environment = {
  production: true,
  // Frontend en Azure App Service:
  //   https://front-empleados-abe7enfzauaadqem.brazilsouth-01.azurewebsites.net
  //
  // El navegador llama a /api/v1/... en el MISMO dominio de Azure (HTTPS) y el
  // server.ts de Angular reenvía la petición al backend en AWS EC2:
  //   http://18.222.83.229:5000/api/v1/...
  // Así se evita el bloqueo "Mixed Content" (página HTTPS → API HTTP).
  //
  // Si algún día el backend tiene dominio + HTTPS, puedes llamar directo:
  //   apiUrl: 'https://api.tudominio.com/api/v1',
  apiUrl: '/api/v1',
};
