/**
 * BookingSuccessPage.jsx
 *
 * Página pública de retorno cuando el cliente completa el pago en Stripe.
 * Propósito: verificar el pago contra el backend, confirmar la reserva y
 * mostrar el resumen (servicio, fecha/hora, estado) + botón "Add to Google Calendar".
 *
 * Flujo página
 *  - BookingSuccessPage:12-42 — lee session_id, llama getPublicBookingStatus({session_id}) → GET /public/booking/status, que verifica Stripe y pasa a confirmed/paid + crea evento Calendar    
       + payout + email. Muestra servicio, fecha y customerCalendarUrl.
    - BookingCancelledPage:10-16 — intenta liberar el slot llamando a cancel-payment y muestra Back to Booking Page hacia /book/:slug.
 * 
 * Flujo Stripe:
 * - `PublicBookingPage` crea `pending_payment` + redirige a Checkout con
 *   `success_url = {CLIENT_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}&slug=<slug>`
 *   (ver `backend/controllers/publicController.js:343`).
 * - Esta página lee `session_id` y llama `GET /public/booking/status?session_id=...`.
 * - El backend (`getBookingStatus`) busca por `stripeSessionId`, verifica con la
 *   API de Stripe (`payment_status === "paid"`) y, si Ok, ejecuta `confirmPaidBooking`:
 *   `pending_payment` -> `confirmed/paid` + evento Google Calendar + `WalletTransaction`
 *   (payout 90/10) + email de confirmación. Si no pagado: `payment_failed/failed` (402).
 * - El mensaje visible depende de `booking.status + paymentStatus`:
 *   `confirmed + paid` -> éxito; cualquier otro caso -> "could not verify".
 *
 * Contratos API (ver `src/api/public.js`):
 * - `getPublicBookingStatus({ session_id })` -> GET `/public/booking/status`.
 *
 * Robustez aplicada:
 * - Guard `data.booking?.status` (el 402 devuelve `{ message, booking }` y axios
 *   lanza; pero si el 200 viniera sin booking, no debe romper).
 * - `booking.status?.replace` con optional chaining en el render.
 *
 * Enfoque de diseño: página pública sin auth. Estado mínimo (`booking`, `message`)
 * + verificación en `useEffect([searchParams])`. Estilos en
 * `bookingSuccessPageStyles as s` (dummyStyles). Rutas en `src/App.jsx`:
 * `/booking/success` y `/booking/cancelled` (públicas, sin `ProtectedRoute`).
 */

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

// API pública (sin auth): consulta y confirmación de la reserva vía Stripe session
import { getPublicBookingStatus } from "../api/public";

// Iconos de Lucide React (ligeros y personalizables)
import { BadgeCheck, Calendar, CalendarDays, ArrowLeft } from "lucide-react";

// Diccionario de clases de esta página
import { bookingSuccessPageStyles as s } from "../assets/dummyStyles";

// ============================================================================
// COMPONENTE PRINCIPAL: BookingSuccessPage
// ============================================================================

export default function BookingSuccessPage() {
  // --- Estado: query params del retorno de Stripe ---
  // `session_id`: Checkout Session a verificar. `slug`: negocio para el botón volver.
  const [searchParams] = useSearchParams();

  // --- Estado: datos y UI ---
  const [booking, setBooking] = useState(null); // Reserva confirmada (o null si falló la verificación)
  const [message, setMessage] = useState("Verifying your payment..."); // Título: verificando -> éxito/error

  // --- Efecto: verifica el pago al montar / cambiar la query ---
  useEffect(() => {
    const loadBooking = async () => {
      const sessionId = searchParams.get("session_id");

      // Sin session no hay nada que verificar contra Stripe.
      if (!sessionId) {
        setMessage("We could not verify the payment. No booking was created.");
        return;
      }

      try {
        const { data } = await getPublicBookingStatus({
          session_id: sessionId,
        });

        setBooking(data.booking ?? null);
        setMessage(
          data.booking?.status === "confirmed" &&
            data.booking?.paymentStatus === "paid"
            ? "Payment received. Your booking is confirmed."
            : "We could not verify the payment. No booking was created.",
        );
      } catch (error) {
        // 402 pago no exitoso, 404 booking inexistente o 500: se muestra el mensaje del backend.
        setMessage(
          error.response?.data?.message ||
          "We could not verify the payment. No booking was created.",
        );
      }
    };

    loadBooking();
    // `searchParams` como dependencia: reverifica si cambia la query sin remontar.
  }, [searchParams]);

  // ============================================================================
  // RENDERIZADO DE LA INTERFAZ (UI)
  // ============================================================================
  return (
    <div className={s.container}>
      <main className={s.card}>
        {/* Cabecera de estado: icono + título dinámico (`message`) */}
        <div className={s.iconCircle}>
          <BadgeCheck className={s.checkIcon} />
        </div>
        <p className={s.statusLabel}>Payment verification</p>
        <h1 className={s.heading}>{message}</h1>

        {/* Resumen de la reserva: solo si la verificación devolvió booking */}
        {booking && (
          <div className={s.bookingDetails}>
            <div className={s.serviceRow}>
              <CalendarDays className={s.calendarDaysIcon} />
              <p className={s.serviceName}>
                {booking.serviceId?.name || "Appointment"}
              </p>
            </div>
            <p className={s.detailText}>
              {booking.date} · {booking.startTime}-{booking.endTime}
            </p>
            <p className={s.statusText}>
              Status: {booking.status?.replace("_", " ")}
            </p>
          </div>
        )}

        {/* Añadir al calendario del cliente: solo si el backend generó la URL */}
        {booking?.customerCalendarUrl && (
          <a
            href={booking.customerCalendarUrl}
            target="_blank"
            rel="noreferrer"
            className={s.addToCalendarLink}
          >
            <Calendar className={s.calendarIcon} />
            Add to Google Calendar
          </a>
        )}

        {/* Volver: a `/book/:slug` si hay slug, si no a `/` */}
        <Link
          to={
            searchParams.get("slug") ? `/book/${searchParams.get("slug")}` : "/"
          }
          className={s.backLink}
        >
          <ArrowLeft className={s.backIcon} />
          Back to Booking Page
        </Link>
      </main>
    </div>
  );
}
