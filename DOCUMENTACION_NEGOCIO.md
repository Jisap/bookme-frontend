# Documentación de Negocio — Bookme

> Plataforma SaaS de gestión de citas para negocios de servicios.
> Stack: `frontend/` (React + Vite) + `backend/` (Express + Mongoose + Stripe + Google Calendar + Brevo).
> Doc técnica del servidor: `backend/DOCUMENTACION_SERVIDOR.md`.

---

## 1. Qué es Bookme en una frase

Bookme le da a un negocio que vende **tiempo** (uñas, peluquería, clínica, consultoría) una **página pública de reservas con cobro online**, agenda sincronizada y panel de gestión, sin llamadas ni WhatsApp manual.

No es un ERP para grandes empresas. Es **B2B2C para pymes de servicios**.

---

## 2. Los 3 actores

| Actor | Quién es | Qué hace | Dónde vive en el código |
|---|---|---|---|
| **Proveedor / Negocio** | Ej. `Nails by Ana`. Tiene cuenta con login. | Se registra, crea servicios, define horario, personaliza marca, comparte su link, gestiona citas, cobra vía wallet. | `frontend/src/pages/AuthPage.jsx`, `DashboardPage.jsx`, `ProfilePage.jsx`, `BookingPage.jsx` + `backend/models/User.js` |
| **Cliente final** | La persona que se hace las uñas. **No tiene cuenta.** | Entra al link público, verifica su email con OTP, elige slot libre, deja notas y paga con Stripe si aplica. | `frontend/src/pages/PublicBookingPage.jsx` + `backend/controllers/publicController.js` |
| **Plataforma / Admin** | Dueño de Bookme. | Cobra comisión del 10%, ve métricas globales y aprueba/rechaza retiros de dinero. | `frontend/src/admin/AdminDashboard.jsx` + `backend/controllers/adminControllers.js` |

---

## 3. Propuesta de valor por actor

- **Proveedor:** deja de perder tiempo en mensajes, evita dobles reservas, cobra por adelantado, reduce no-shows con Calendar + emails, y retiene al cliente reprogramando en vez de perderlo.
- **Cliente final:** reserva en 3 clics desde el móvil, verifica su email, paga seguro y recibe confirmación + link "Add to Google Calendar".
- **Plataforma:** ingresa `10%` de cada reserva pagada (`PLATFORM_FEE_RATE` en `backend/utils/money.js`).

---

## 4. Flujo end-to-end

### 4.1 Onboarding del proveedor
1. `POST /api/auth/register/request-otp` → email con código de 6 dígitos (hash bcrypt, TTL 10 min).
2. `POST /api/auth/register` con `{ name, email, password, businessName, emailOtp }` → crea `User` + `slug` único (`slugify(businessName)`) + JWT 7 días.
3. `GET /api/auth/me` hidrata sesión. Sin `localStorage.token` las rutas privadas redirigen a `/login` (`frontend/src/App.jsx:10-19`).

### 4.2 Configuración del negocio
1. **Servicios** (`/api/services`): `{ name, duration (min ≥5), price, icon C1-C8, isActive }`. Solo `isActive:true` y no eliminados aparecen en la pública.
2. **Disponibilidad** (`/api/availability`): `{ dayOfWeek 0-6, slots: [{startTime, endTime}] }`. Se trocea en bloques de `service.duration` con `backend/utils/slotGenerator.js`, excluyendo solapes con `confirmed` + `pending_payment` recientes.
3. **Marca** (`PUT /api/auth/profile`): `{ businessName, businessDescription, timezone, brandTheme, brandAccent }`. Regenera el `slug`.
4. **Integraciones** (`/api/integrations/google/connect`): OAuth2 Google → guarda `googleRefreshToken`, `googleCalendarConnected=true`. Cada reserva crea/actualiza/cancela evento con recordatorios (email 24h + popup 30m).

### 4.3 Venta pública (sin login)
Ruta: `frontend/src/App.jsx:87` → `/book/:slug` → `PublicBookingPage.jsx`.

1. `GET /api/public/:slug` → negocio + servicios activos.
2. `GET /:slug/slots?date&serviceId` → huecos libres reales.
3. `POST /:slug/request-otp` + `verify-otp` → verifica `customerEmail`.
4. `POST /:slug/book` con `{ serviceId, customerName, customerEmail, date, startTime, endTime, notes, emailOtp }`:
   - Gratis (`price=0`): `status=confirmed` inmediato + evento Calendar + email.
   - Pago: `status=pending_payment` + Stripe Checkout (`success_url/cancel_url`) → frontend llama `GET /booking/status?session_id=` → si pagado confirma, si no marca `payment_failed` (402).

### 4.4 Operación diaria — aquí vive `BookingPage.jsx`
`frontend/src/pages/BookingPage.jsx` (`/bookings`, protegida):

- **Filtros** `{ date, status }` → `GET /bookings?date=&status=`. `""` = sin filtro.
- **Tarjeta por reserva:** badges `status` + `paymentStatus` + `rescheduleCount`, cliente (`customerAvatar` vía `AVATAR_MAP`), fecha/hora + `serviceId.name`, `createdAt/updatedAt`, `googleEventId` (Synced/Not synced) y `customerCalendarUrl`.
- **Reschedule:** modal con `date/startTime/endTime` como draft en `reschedules[bookingId]`. Confirma con `PATCH /bookings/:id/reschedule`. Marca `isRescheduled`, `rescheduleCount++`, actualiza evento Google y manda email. Si el email se omite, el banner lo dice (`data.email.skipped`).
- **Cancel:** modal de confirmación → `PATCH /bookings/:id { status: cancelled }`. Borra evento Google y notifica. Oculto si ya es `cancelled`/`payment_failed`.
- Objetivo comercial: **salvar el ingreso** (reprogramar > cancelar) y **evitar caos** (una sola fuente de verdad entre pagos, Calendar y estado).

### 4.5 Dinero / Wallet
1. Al confirmarse el pago: `toStripeAmount(price) = round(price*100)` (minor units), split `90/10` → `providerPayoutAmount / platformFeeAmount`.
2. Se crea `WalletTransaction(booking_payout, available)` idempotente por `{bookingId, type}`.
3. Resumen `GET /api/payments`: `{ earned, withdrawOrPending, availableBalance }`.
4. Proveedor pide retiro `POST /withdrawals { amount ≥100 }` → requiere `payoutDetails.isComplete` → crea `Withdrawal(pending)` + `withdrawal_hold`.
5. Admin en `AdminDashboard` aprueba: `processing/paid` o `rejected` (+ `withdrawal_reversal` que devuelve saldo).

---

## 5. Ejemplo concreto: estética de uñas

> `Nails by Ana` — manicura, acrílicas, pedicura.

1. Ana se registra, pone `businessName: Nails by Ana` → link `tuapp.com/book/nails-by-ana`.
2. Crea servicios: `Manicura 60min 25€ (C3.png)`, `Acrílicas 90min 40€`, `Pedicura 45min 20€`.
3. Define horario Lun–Vie `10:00-19:00`, Sáb `10:00-14:00`.
4. Personaliza `brandTheme: rose`, comparte el link por WhatsApp/Instagram bio.
5. Clienta Lucía reserva `Acrílicas 2026-10-10 11:00-12:30`, verifica OTP, paga con Stripe.
6. Ana lo ve en `Dashboard` como `Total Income +36€` y en `Bookings` como `confirmed / paid / Synced to Google`.
7. Lucía pide moverlo al viernes → Ana usa `Reschedule`, el slot viejo se libera, el nuevo se bloquea, Calendar y email se actualizan. Ingreso salvado.
8. A fin de mes Ana retira `380€` a su cuenta. Admin lo aprueba. Plataforma ganó `~42€` (10%).

---

## 6. Mapa página → objetivo comercial

| Ruta | Página | Pregunta que responde |
|---|---|---|
| `/login` | `AuthPage` | ¿Quién es el proveedor? (registro OTP + login JWT) |
| `/` | `DashboardPage` | ¿Cómo va mi negocio? (bookings, ingresos, top servicios, próximas citas) |
| `/profile` | `ProfilePage` | ¿Cómo me vendo? (marca, link público, Stripe/Calendar/Emails, preview cliente) |
| `/bookings` | `BookingPage` | ¿Qué hago hoy con mis citas? (filtrar, cobrar, reprogramar, cancelar, sincronizar) |
| `/book/:slug` | `PublicBookingPage` | ¿Cómo reserva mi clienta en 1 minuto? (slots, OTP, pago) |
| `/admin/dashboard` | `AdminDashboard` | ¿Cómo gana la plataforma? (usuarios, GMV, fees, retiros) |

---

## 7. Estados clave (contrato backend ↔ frontend)

- `Booking.status`: `pending | pending_payment | confirmed | cancelled | payment_failed`. Default `confirmed` en gratis.
- `Booking.paymentStatus`: `not_required | pending | paid | failed`.
- `Booking.payoutStatus`: `not_required | pending | available | withdrawn`.
- `Withdrawal.status`: `pending | processing | paid | rejected` (`paid/rejected` inmutables).
- Filtro especial `GET /bookings?status=rescheduled` → filtra `isRescheduled=true`. Por defecto se excluyen `pending_payment/payment_failed`.

---

## 8. Integraciones y por qué existen

| Integración | Para qué (negocio) |
|---|---|
| **Stripe Checkout** | Cobrar por adelantado, reducir no-shows. Moneda en minor units (`price*100`). |
| **Google Calendar OAuth** | Que la agenda del proveedor sea la verdad: crea/actualiza/cancela eventos, invita a `customerEmail`. Si no está conectado, se ofrece `customerCalendarUrl` ("Add to calendar"). |
| **Brevo email + OTP** | Verificar identidad (registro y reserva), confirmar/cancelar/reprogramar, recordar citas. Sin esto, reservas falsas y ausencias. |

---

## 9. Glosario rápido

- **Slug:** identificador público derivado del nombre (`Nails by Ana` → `nails-by-ana`). Va en `/book/:slug`.
- **Slot:** hueco reservable generado desde disponibilidad menos reservas activas.
- **Minor units:** dinero en cents / céntimos USD-EUR (`5000` = `50.00`). Todo cálculo y Stripe usan esto.
- **Payout:** parte del proveedor (`90%`). **Fee:** parte de la plataforma (`10%`).
- **Wallet available:** `earned - held + reversed`. Es lo retirable.
- **Draft de reschedule:** cambio de fecha/hora aún no confirmado (`reschedules[bookingId]` en `BookingPage`).
