/**
 * BookingCancelledPage.jsx
 *
 * Página pública de retorno cuando el cliente cancela el pago en Stripe.
 * Propósito: liberar el slot bloqueado (`pending_payment` -> `payment_failed/failed`)
 * e invitar a elegir otro horario volviendo a `/book/:slug`.
 *
 * Flujo Stripe:
 * - `PublicBookingPage` crea `pending_payment` + redirige a Checkout.
 * - Si el usuario cierra/cancela, Stripe redirige a
 *   `{CLIENT_URL}/booking/cancelled?booking_id=<id>&slug=<slug>`
 *   (ver `backend/controllers/publicController.js:343-344`, sin `token`).
 * - Esta página lee `booking_id` y dispara `POST /public/booking/cancel-payment`
 *   con `{ booking_id }`. El backend solo actúa si sigue en `pending_payment`;
 *   si no, responde `No pending booking to cancel` (idempotente).
 *
 * Contratos API (ver `src/api/public.js`):
 * - `cancelPublicBookingPayments(bookingId)` -> POST `/public/booking/cancel-payment`.
 *   Acepta string u objeto; existe alias singular `cancelPublicBookingPayment`.
 *
 * Bugs corregidos:
 * - Import en singular (`cancelPublicBookingPayment`) vs export en plural
 *   (`cancelPublicBookingPayments`) -> se usa el plural canónico + alias en la API.
 * - Condición `if (bookingId && token)` nunca se cumplía (Stripe no envía `token`)
 *   -> ahora basta con `bookingId`. Llamada con un solo argumento.
 *
 * Enfoque de diseño: página pública sin auth ni estado de datos. Un `useEffect`
 * fire-and-forget con `.catch(() => {})`: el mensaje visible es estático porque
 * la cancelación es best-effort (aunque falle, no hubo cobro). Estilos en
 * `bookingCancelledPageStyles as s` (dummyStyles).
 */

import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

// API pública (sin auth). Se usa el nombre en plural, que es el export canónico.
import { cancelPublicBookingPayments } from "../api/public";

// Iconos de Lucide React (ligeros y personalizables)
import { XCircle, ArrowLeft } from "lucide-react";

// Diccionario de clases de esta página
import { bookingCancelledPageStyles as s } from "../assets/dummyStyles";

// ============================================================================
// COMPONENTE PRINCIPAL: BookingCancelledPage
// ============================================================================

export default function BookingCancelledPage() {
  // --- Estado: query params del retorno de Stripe ---
  // `booking_id`: reserva en `pending_payment` a liberar. `slug`: negocio para el botón volver.
  const [searchParams] = useSearchParams();

  // --- Efecto: libera el slot en el backend ---
  // Fire-and-forget: no bloquea el render ni muestra error (no hubo cobro de todos modos).
  // El backend es idempotente: si ya no está en `pending_payment`, responde sin cambios.
  useEffect(() => {
    const bookingId = searchParams.get("booking_id");
    if (bookingId) {
      cancelPublicBookingPayments(bookingId).catch(() => { });
    }
    // `searchParams` como dependencia: reintenta si cambia la query (navegación con mismo componente).
  }, [searchParams]);

  // ============================================================================
  // RENDERIZADO DE LA INTERFAZ (UI)
  // ============================================================================
  return (
    <div className={s.container}>
      <main className={s.card}>
        {/* Icono de estado: X en círculo rojo */}
        <div className={s.iconCircle}>
          <XCircle className={s.icon} />
        </div>
        {/* Mensaje estático: no hubo cobro, puede reintentar */}
        <p className={s.statusLabel}>Payment cancelled</p>
        <h1 className={s.heading}>Your booking was not confirmed.</h1>
        <p className={s.description}>
          No payment was completed. You can return to the booking page and
          choose a slot again.
        </p>

        {/* Volver: a `/book/:slug` si hay slug, si no a `/` */}
        <Link
          to={
            searchParams.get("slug") ? `/book/${searchParams.get("slug")}` : "/"
          }
          className={s.homeLink}
        >
          <ArrowLeft className={s.homeLinkIcon} />
          Back to Booking Page
        </Link>
      </main>
    </div>
  );
}
