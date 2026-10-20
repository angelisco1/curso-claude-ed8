# Plan: Códigos de descuento y canje de puntos

**Tipo:** feature

**Issue:** #8 — Códigos de descuentos

## Objetivo

Permitir que el admin/manager de un restaurante cree códigos de descuento y defina la equivalencia puntos→descuento, y que los clientes puedan aplicar un código **o** canjear puntos al pedir la cuenta. Hoy no existe ni «pedir la cuenta», ni descuentos, ni puntos: todo es nuevo.

## Alcance

- **Incluye:**
  - API: CRUD de códigos, CRUD de tramos puntos→euros, saldo de puntos de un cliente (alta manual por admin), cuenta de un pedido (previsualizar y confirmar).
  - web-admin: pantallas de códigos y de tramos de puntos.
  - web-clientes: «Pedir la cuenta» en el detalle del pedido, con código o canje de puntos.
- **Fuera de alcance:**
  - Acumulación automática de puntos (el saldo se carga por seed o por un endpoint admin).
  - Pagos reales.
  - Combinar código y puntos en la misma cuenta.
  - `web-empleados`.
  - Cerrar el hueco de seguridad general del repo (restaurantId del JWT vs URL), salvo en los endpoints nuevos.

## Decisiones tomadas

- **Un solo descuento por cuenta:** código **o** tramo de puntos, nunca ambos (400 si llegan los dos).
- **Puntos:** saldo por cliente y restaurante, cargado manualmente. No se acumulan solos.
- **Equivalencia:** tabla de tramos `{points, amount}` editable por el admin (10→1 €, 100→10 €...). El cliente canjea un tramo concreto.
- **Dinero:** la API expone euros (2 decimales), igual que `dishes.price`. Internamente se calcula en céntimos enteros para evitar errores de redondeo.
- **Tope:** el descuento nunca supera el subtotal (el total mínimo es 0).
- **Una cuenta por pedido:** una vez confirmada, un segundo `POST` devuelve 409. Es una suposición a validar en la revisión del plan.

## Contrato de la API (lo comparten las tres fases)

Todos los endpoints de administración usan `authenticate` + `authorize(['admin','manager'])` y comprueban que el `restaurantId` de la URL coincide con el del usuario.

| Método y ruta | Quién | Body / respuesta |
|---|---|---|
| `GET/POST /api/v1/restaurants/:restaurantId/discount-codes` | admin, manager | `{code, type: 'fixed'\|'percent', value, minOrder?, validFrom?, validUntil?, maxUses?, active}`; respuesta con `id` y `uses` (solo lectura) |
| `GET/PUT/DELETE /api/v1/restaurants/:restaurantId/discount-codes/:id` | admin, manager | 409 si el código está duplicado en el restaurante (insensible a mayúsculas), 404 si no existe |
| `GET/POST /api/v1/restaurants/:restaurantId/points-rules` | admin, manager | `{points, amount}`; 409 si `points` está repetido |
| `GET/PUT/DELETE /api/v1/restaurants/:restaurantId/points-rules/:id` | admin, manager | — |
| `PUT /api/v1/restaurants/:restaurantId/clients/:clientId/points` | admin, manager | `{balance}`; fija el saldo |
| `GET /api/v1/restaurants/:restaurantId/points/me` | cliente | `{balance, rules: [{id, points, amount}]}` |
| `GET /api/v1/orders/:id/bill?code=&pointsRuleId=` | cliente dueño del pedido | Previsualiza sin guardar: `{subtotal, discount, pointsUsed, total, code?}` |
| `POST /api/v1/orders/:id/bill` | cliente dueño del pedido | Body `{code?}` o `{pointsRuleId?}`. Confirma y descuenta usos o puntos en una transacción. Devuelve lo mismo que el `GET` |

Errores de la cuenta: 400 (código y puntos a la vez, o validación), 404 (pedido o código inexistente), 409 (cuenta ya pedida), 422 (código caducado, agotado, inactivo, bajo el mínimo, o puntos insuficientes), con un `reason` (`invalid`, `expired`, `exhausted`, `inactive`, `min_order`, `insufficient_points`).

## Tareas

> Cada tarea debe poder completarse en 5-10 minutos. Las fases B y C solo dependen de la Fase 0 hasta la última tarea de cada una, así que pueden hacerse en paralelo con la Fase A usando mocks.

### Fase 0 — Contrato (previa, bloquea a las demás)

1. [x] **Documentar el contrato de códigos y tramos** — `docs/api/openapi.yaml`: paths y schemas de `discount-codes` y `points-rules` con `security`, respuesta 401, y `example` en cada requestBody.
2. [x] **Documentar saldo y cuenta** — `docs/api/openapi.yaml`: `PUT .../points`, `GET .../points/me`, `GET/POST /orders/{id}/bill`, con los errores y `reason` de la tabla.

> El test `openapi.test.ts` fallará hasta que se monten las rutas en la Fase A; es esperado en esta fase. Si se prefiere, las tareas 1-2 pueden hacerse junto a A5/A12 y dejar aquí solo el acuerdo del contrato.

### Fase A — API (`packages/api`)

1. [x] **Función pura de cálculo** — `src/services/bill.calculator.ts` + test: subtotal en céntimos, descuento fijo o porcentaje, tope al subtotal, redondeo.
2. [x] **Errores de dominio** — `src/errors/DomainErrors.ts` y `contexts/shared/infrastructure/http/errorHandler.ts`: errores de código duplicado (409), no encontrado (404) y reglas de cuenta (422), registrados en las listas del `errorHandler`.
3. [x] **Modelo de códigos** — `src/models/discount-code.model.ts`: tipos y `assertValid*` (tipo, valor > 0, porcentaje ≤ 100, fechas coherentes).
4. [x] **Migración y repositorio de códigos** — `src/config/database.ts` y `src/repositories/discount-code.repository.ts` + `mocks/`: tabla `discount_codes` con índice único `(restaurant_id, code)`.
5. [x] **Servicio de códigos** — `src/services/discount-code.service.ts` + test: CRUD con `ensureRestaurantExists` y unicidad.
6. [x] **Rutas de códigos** — `src/controllers/`, `src/routes/discount-code.routes.ts` y `src/app.ts`: montaje en `/api/v1/restaurants/:restaurantId/discount-codes` con `authorize` y comprobación de `restaurantId`.
7. [x] **Tramos de puntos: modelo, migración y repositorio** — tabla `points_rules` con índice único `(restaurant_id, points)`, repositorio y mock.
8. [x] **Tramos de puntos: servicio y rutas** — servicio con test, controller, routes y montaje en `app.ts`.
9. [x] **Saldo de puntos** — tabla `client_points(client_id, restaurant_id, balance)`, repositorio, servicio con test, `PUT .../clients/:clientId/points` y `GET .../points/me`.
10. [x] **Tabla de cuentas** — migración y repositorio de `order_bills(order_id UNIQUE, subtotal, code_id, discount, points_used, total, created_at)` con mock.
11. [x] **Servicio de cuenta: previsualizar** — `src/services/bill.service.ts` + tests: calcula subtotal con `dishPrice` de las líneas, valida código (activo, vigencia, usos, mínimo) o tramo (saldo), rechaza código+puntos a la vez.
12. [x] **Servicio de cuenta: confirmar** — `bill.service.ts` + tests: transacción que guarda la cuenta, incrementa `uses` o resta puntos; 409 si ya existe.
13. [x] **Endpoints de cuenta** — `order.routes.ts`, controller: `GET/POST /orders/:id/bill`, comprobando que el pedido pertenece al cliente del JWT.
14. [x] **Seed y cierre** — `scripts/seed.ts`: códigos, tramos y saldo de ejemplo (idempotente). Actualizar el contador de rutas de `openapi.test.ts` y que `npm test` pase.

### Fase B — web-admin (`packages/web-admin`)

Toma como modelo la feature de mesas (`features/tables/`).

1. [x] **Modelos** — `features/discounts/models/discount-code.model.ts` y `points-rule.model.ts`: interfaces y DTOs según el contrato.
2. [x] **Servicios HTTP** — `features/discounts/services/discount-code.service.ts` y `points-rule.service.ts`.
3. [x] **Stores** — `features/discounts/store/discount-code.store.ts` y `points-rule.store.ts` con signals (`_items`, `_loading`, `_error`).
4. [x] **Lista de códigos** — `pages/discount-list/`: tabla con estados de carga, error y vacío; borrado con confirmación; columnas código, tipo, valor, vigencia, usos y activo.
5. [x] **Formulario de códigos** — `pages/discount-form/`: crear/editar con validación de tipo/valor y fechas; muestra el 409 de código duplicado.
6. [x] **Pantalla de tramos de puntos** — `pages/points-rules/`: tabla editable de tramos (añadir, editar, borrar) con el 409 de puntos repetidos.
7. [x] **Navegación** — `discounts.routes.ts` (`''`, `'new'`, `':id/edit'`, `'points'`), bloque en `app.routes.ts`, enlace «Descuentos» en `core/layout/shell.component.html`, icono en las dos listas de `app.config.ts` y tarjeta en el dashboard del restaurante.
8. [ ] **Verificación** — `npm run build -w @resttek/web-admin` sin errores y prueba manual con la API real (`npm run dev:admin`).

### Fase C — web-clientes (`packages/web-clientes`)

1. [ ] **Modelos** — `core/models/discount.model.ts` (`Bill`, `PointsRule`, `PointsInfo`, `BillErrorReason`) y ampliar `core/models/order.model.ts` con `bill?`.
2. [ ] **Servicio de puntos** — `core/services/points.service.ts`: `GET .../points/me`.
3. [ ] **Servicio de cuenta** — ampliar `core/services/order.service.ts`: `previewBill(orderId, {code?, pointsRuleId?})` y `requestBill(...)`.
4. [ ] **Store de cuenta** — `core/store/bill.store.ts` con signals: modo (código o puntos, excluyentes), código, tramo elegido, resumen y error. Los importes salen del servidor.
5. [ ] **Pedir la cuenta: resumen** — `features/orders/order-detail.component.ts`: botón «Pedir la cuenta» y resumen con subtotal, descuento y total.
6. [ ] **Aplicar código** — mismo componente (o extraer `bill-request.component.ts`): input de código con «Aplicar», previsualización y mensajes por `reason` (inválido, caducado, agotado, mínimo).
7. [ ] **Canjear puntos** — selector de tramos con saldo y equivalencias («100 pts = 10 €»), deshabilitando los tramos que superan el saldo; alterna con el código.
8. [ ] **Totales coherentes** — `features/orders/my-orders.component.ts` y `order-detail.component.ts`: usar el total de la cuenta si existe, y la suma local si no.
9. [ ] **Verificación** — `npm run build -w @resttek/web-clientes` sin errores y prueba manual de extremo a extremo con la API real.

## Criterios de aceptación

- [x] Un admin/manager puede crear, listar, editar y borrar códigos de su restaurante; uno duplicado devuelve 409 y uno de otro restaurante devuelve 403/404.
- [x] Un admin/manager puede gestionar los tramos de puntos (10→1 €, 100→10 €...) y un tramo repetido devuelve 409.
- [x] `POST /orders/:id/bill` con un código válido devuelve el total con el descuento aplicado, incrementa `uses` y nunca da un total negativo.
- [x] `POST /orders/:id/bill` con un tramo de puntos resta los puntos del saldo y aplica el descuento del tramo.
- [x] Enviar código y tramo a la vez devuelve 400; código caducado, agotado, inactivo, bajo el mínimo o saldo insuficiente devuelve 422 con su `reason`.
- [x] Pedir la cuenta de un pedido ajeno devuelve 403/404 y pedirla dos veces devuelve 409.
- [ ] En web-admin se gestionan códigos y tramos desde el menú del restaurante.
- [ ] En web-clientes el cliente puede pedir la cuenta, aplicar un código o canjear un tramo, ve el descuento y el total, y recibe mensajes claros ante los errores.
- [x] `docs/api/openapi.yaml` documenta todos los endpoints nuevos y `npm test` pasa (incluido `openapi.test.ts`).
- [ ] `npm run build` pasa en `web-admin` y `web-clientes`.

## Riesgos y notas

- **Orden de fases:** la Fase 0 bloquea todo; después A, B y C pueden ir en paralelo (B y C con mocks) y solo sus tareas de verificación final necesitan la API real.
- **«Pedir la cuenta» no existe:** esta issue lo introduce como acción sobre el pedido (sin estados nuevos de pedido). Si se quiere un estado de cuenta/pago, es otra issue.
- **Líneas de pedido:** `order_items` tiene una fila por unidad (`quantity` siempre 1); el subtotal es la suma de `dishPrice` de las líneas.
- **Migraciones:** el repo solo tiene `CREATE TABLE IF NOT EXISTS`, sin `ALTER`. Este plan solo añade tablas nuevas, así que no hace falta migrar `orders`.
- **`openapi.test.ts`:** tiene un contador fijo de rutas (38) que hay que subir con cada ruta montada, y los routers deben montarse con la forma exacta `app.use('...', nombre)`.
- **Hueco de autorización existente:** el repo no comprueba que el `restaurantId` del JWT coincida con el de la URL; los endpoints nuevos sí lo hacen.
- **Frontends sin tests:** se verifica con el build y prueba manual.
