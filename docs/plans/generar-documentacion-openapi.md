# Plan: Generar documentación con OpenAPI

**Tipo:** feature

## Objetivo

Describir el funcionamiento de la API REST de Resttek en un contrato OpenAPI 3 (`openapi.yaml`) y generar a partir de él una página HTML estática con la documentación, lista para publicarse. Así la API queda documentada en un formato estándar, verificable y regenerable con un único comando.

## Alcance

- **Incluye:**
  - Contrato `docs/api/openapi.yaml` (OpenAPI 3.0/3.1) con los 29 endpoints actuales: `/health`, `auth`, `employees`, `restaurants`, `public/restaurants`, `public/.../dishes`, `ingredients`, `dishes`, `orders` y `restaurants/:restaurantId/employees`.
  - Esquemas de los modelos (`Restaurant`, `Dish`, `Ingredient`, `Order`, `OrderItem`, empleados, login/registro), esquema de seguridad JWT Bearer, roles requeridos por endpoint y respuestas de error (400/401/403/404/500).
  - Script npm para validar el contrato y otro para generar el HTML (`docs/api/dist/index.html`), con alias en el `package.json` raíz.
  - Test que garantiza que el contrato cubre todas las rutas montadas en la API.
- **Fuera de alcance:**
  - Servir la documentación desde la propia API (p. ej. `/docs`) y generar el contrato automáticamente desde el código.
  - Publicar realmente el HTML (GitHub Pages, hosting, CI).
  - Cambiar el comportamiento de la API o corregir inconsistencias de respuestas de error detectadas durante la documentación.
  - Documentación de los frontends.

## Tareas

> Cada tarea debe poder completarse en 5-10 minutos.

1. [x] **Leer controladores y use cases para fijar el contrato real** — `src/controllers/*`, `src/contexts/employee/infrastructure/http/*`, `src/errors/*`: apuntar body, query params, códigos de respuesta y formato de error de cada endpoint (los controladores de `order` devuelven `{ error }`, el `errorHandler` devuelve `{ error, message }`).
2. [ ] **Esqueleto del contrato** — `docs/api/openapi.yaml`: `openapi`, `info`, `servers` (`http://localhost:3000`), `tags`, `securitySchemes` (`bearerAuth` JWT) y `components.responses` reutilizables para 400/401/403/404/500.
3. [ ] **Esquemas de modelos** — `docs/api/openapi.yaml` (`components.schemas`): `Restaurant`, `Dish` (+ `DishIngredient`, enum de categorías), `Ingredient` (enum de unidades), `Order`, `OrderItem` (enum de estados), `Employee`, `Error` y los bodies de entrada (create/update).
4. [ ] **Endpoints `health`, `auth` y `employees`** — `docs/api/openapi.yaml` (`paths`): `GET /health`, `POST /auth/login`, `POST /auth/register`, `POST/GET /employees`, `GET /employees/{id}` y `GET /restaurants/{restaurantId}/employees`, con roles (`admin`) y respuestas.
5. [ ] **Endpoints de restaurantes (privados y públicos)** — `docs/api/openapi.yaml`: `POST/GET /restaurants`, `GET/PUT /restaurants/{id}`, `GET /public/restaurants`, `GET /public/restaurants/{id}`.
6. [ ] **Endpoints de ingredientes** — `docs/api/openapi.yaml`: CRUD en `/restaurants/{restaurantId}/ingredients[/{id}]` indicando roles por operación (`admin` escribe; `admin/manager/cocinero` lee).
7. [ ] **Endpoints de platos** — `docs/api/openapi.yaml`: CRUD en `/restaurants/{restaurantId}/dishes[/{id}]` y `GET /public/restaurants/{restaurantId}/dishes`, con roles por operación.
8. [ ] **Endpoints de pedidos** — `docs/api/openapi.yaml`: `POST /orders`, `GET /orders/active` (query `restaurantId` obligatorio), `GET /orders/mine`, `GET /orders/{id}`, `PATCH /orders/{orderId}/items/{itemId}/status`.
9. [x] **Añadir dependencias de desarrollo** — `packages/api/package.json`: `@redocly/cli` (lint + `build-docs`, no hay solución nativa para generar el HTML) y `yaml` (para el test); `npm install`.
10. [ ] **Scripts de validación y generación** — `packages/api/package.json` y `package.json` raíz: `docs:lint` (`redocly lint ../../docs/api/openapi.yaml`) y `docs:build` (`redocly build-docs ... -o ../../docs/api/dist/index.html`); alias `docs:api` en el raíz que encadena ambos.
11. [ ] **Test de cobertura del contrato (TDD: escribirlo antes de las tareas 4-8 si se implementa con `implement-plan`)** — `packages/api/src/docs/openapi.test.ts`: parsea el YAML y comprueba que (a) es OpenAPI 3.x válido en estructura, (b) cada ruta/verbo montado en `app` figura en `paths`, (c) los endpoints protegidos declaran `security`.
12. [ ] **Ejecutar la generación y revisar el HTML** — `docs/api/dist/index.html`: lanzar `npm run docs:api`, abrir el HTML y comprobar que muestra todos los tags, esquemas y la autenticación sin errores de lint.
13. [ ] **Documentar el uso** — `README.md` (sección API) y `CLAUDE.md` (Commands): explicar `docs:lint`, `docs:build` y la ubicación del YAML y del HTML; indicar si `docs/api/dist/` se versiona o se ignora.

## Criterios de aceptación

- [ ] `docs/api/openapi.yaml` existe, declara OpenAPI 3.x y `npm run docs:lint` termina con código 0 y sin errores.
- [ ] El contrato documenta los 29 endpoints actuales (rutas y verbos idénticos a `src/app.ts` y los `*.routes.ts`), incluyendo `/health`.
- [ ] Cada endpoint protegido declara `bearerAuth`, el rol o roles que exige y las respuestas 401 y 403; los endpoints públicos (`auth/*`, `public/*`, `/health`) no declaran seguridad.
- [ ] Cada endpoint con parámetros de ruta o query (`restaurantId`, `id`, `orderId`, `itemId`) los declara como obligatorios, y `POST/PUT` describen su `requestBody` con ejemplos.
- [ ] Los enums del contrato coinciden con el código: categorías de plato (`entrante`, `principal`, `postre`, `bebida`), unidades (`kg`, `g`, `l`, `ml`, `unidad`) y estados de pedido (`pendiente`, `preparando`, `listo`, `entregado`).
- [ ] `npm run docs:build` genera `docs/api/dist/index.html` autocontenido (un solo archivo que se abre en el navegador sin servidor) y muestra todos los endpoints.
- [ ] El test de cobertura falla si se añade una ruta a `app` sin documentarla, y pasa con el contrato actual.
- [ ] Los tests (`npm test`) pasan.

## Riesgos y notas

- **Dependencia nueva:** la regla del proyecto es evitar dependencias si hay solución nativa, pero Node no genera HTML desde OpenAPI. Se propone `@redocly/cli` como devDependency (genera un HTML estático autocontenido). Alternativa sin dependencias pesadas: plantilla HTML propia que cargue Redoc/Scalar por CDN, a costa de que la página dependa de internet; decidir antes de la tarea 9.
- **Formato de errores inconsistente:** `OrderController` devuelve `{ error: "<mensaje>" }`, `authenticate` devuelve `{ error }` y `errorHandler` devuelve `{ error, message }`. El contrato debe reflejar el comportamiento real (esquemas de error distintos) y no corregirlo aquí; conviene anotarlo en `docs/revisiones/`.
- **Códigos de estado derivados del nombre de error:** `errorHandler` mapea a 404/401 por nombre de clase y el resto de `AppError` a 400; hay que revisar cada use case para saber qué errores puede lanzar cada endpoint.
- **Deriva contrato-código:** al escribirse a mano, el YAML puede quedar desfasado; el test de cobertura de rutas mitiga el caso de rutas nuevas, pero no cambios en los cuerpos.
- **Ubicación y control de versiones:** no hay repositorio git en el directorio de trabajo; decidir si `docs/api/dist/` se commitea o se publica desde CI.
- **Tareas largas:** las tareas 4-8 son la parte más extensa; si alguna supera los 10 minutos al implementarse, dividirla por recurso.
- **Nota sobre el skill:** se ha seguido la convención real del repositorio (vitest, `sqlite3`, `AppError`), no la mencionada en `SKILL.md` (`node:test`, `node:sqlite`, `HttpError`). No existe `docs/api/api-pagination.md` ni paginación en la API.
