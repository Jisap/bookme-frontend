/**
 * BookingPage.jsx
 *
 * Página de gestión de reservas (Bookings) para proveedores de servicios.
 * Propósito: listar y filtrar citas de clientes, revisar estado de pago,
 * sincronización con Google Calendar y contadores de reprogramación, y
 * permitir cancelar o reprogramar cada reserva desde modales de confirmación.
 *
 * Flujo de datos:
 * - `filters { date, status }` vive en estado local. Cada cambio dispara el
 *   `useEffect` que relanza `fetchBookings(filters)` -> GET `/bookings?date=&status=`.
 * - `reschedules` es un diccionario `{ [bookingId]: { date, startTime, endTime } }`
 *   con los borradores (drafts) de reprogramación aún no confirmados.
 * - Cancelar usa modal de confirmación (`cancelModalBookingId`) + PATCH `/bookings/:id`
 *   con `{ status: "cancelled" }`. Reprogramar usa `rescheduleModalBooking` +
 *   PATCH `/bookings/:id/reschedule` con el draft fusionado.
 * - `message` es el banner global de feedback (éxito/info/error de carga o de acciones).
 *
 * Contratos API (ver `src/api/bookings.js`):
 * - `listBookings(params)` -> GET `/bookings` (filtros opcionales `date`, `status`).
 * - `updateBookingStatus(id, status)` -> PATCH `/bookings/:id` con `{ status }`.
 * - `rescheduleBooking(id, draft)` -> PATCH `/bookings/:id/reschedule` con
 *   `{ date, startTime, endTime }`; la respuesta puede traer `data.email { skipped, reason }`.
 *
 * Enfoque de diseño: componente funcional con estado local (`useState`) + recarga
 * reactiva en `useEffect([filters])`. Sin `useMemo`: los derivados (variante del
 * banner, valores de inputs del modal) son baratos de calcular en cada render.
 * Estilos centralizados en `bookingsPageStyles as s` (dummyStyles) + `AppLayout`
 * (sidebar + contenedor). Avatares resueltos vía `AVATAR_MAP` nombre-fichero -> import.
 */

import { useEffect, useState } from "react";

// Layout general de la app (sidebar + contenedor)
import AppLayout from "../components/AppLayout";

// APIs del proyecto
import {
  listBookings,
  rescheduleBooking,
  updateBookingStatus,
} from "../api/bookings";

// Iconos de Lucide React (ligeros y personalizables)
// Nota: `BadgeCheck`, `MoreVertical`, `Plus` y `Trash2` se importan pero
// actualmente no se usan en el render; se dejan para futuras acciones de la tarjeta.
import {
  CalendarDays,
  Clock,
  BadgeCheck,
  XCircle,
  CreditCard,
  ExternalLink,
  Filter,
  MoreVertical,
  Plus,
  Calendar,
  Info,
  Trash2,
  RefreshCcw,
  Check,
} from "lucide-react";

// Importación de recursos estáticos (ilustración de cabecera y avatares de clientes)
import p7Image from "../assets/P7.png";
import A1 from "../assets/avatars/A1.png";
import A2 from "../assets/avatars/A2.png";
import A3 from "../assets/avatars/A3.png";
import A4 from "../assets/avatars/A4.png";
import A5 from "../assets/avatars/A5.png";
import A6 from "../assets/avatars/A6.png";
import A7 from "../assets/avatars/A7.png";
import A8 from "../assets/avatars/A8.png";
import A9 from "../assets/avatars/A9.png";
import A10 from "../assets/avatars/A10.png";
import A11 from "../assets/avatars/A11.png";
import A12 from "../assets/avatars/A12.png";
import A13 from "../assets/avatars/A13.png";
import A15 from "../assets/avatars/A15.png";
import A16 from "../assets/avatars/A16.png";

// Diccionario de clases de esta página (mantiene el componente limpio de Tailwind inline)
import { bookingsPageStyles as s } from "../assets/dummyStyles";

// ============================================================================
// 1. MAPEO DE RECURSOS Y CONSTANTES (fuera del componente)
// ============================================================================

/**
 * Mapa nombre-fichero -> imagen importada para el avatar del cliente.
 * El backend solo guarda el string (ej. "A3.png"); aquí se resuelve al asset real.
 * Fallback en el render: `AVATAR_MAP[booking.customerAvatar || "A1.png"]`.
 * (Nota: falta A14, igual que en DashboardPage/ProfilePage.)
 */
const AVATAR_MAP = {
  "A1.png": A1,
  "A2.png": A2,
  "A3.png": A3,
  "A4.png": A4,
  "A5.png": A5,
  "A6.png": A6,
  "A7.png": A7,
  "A8.png": A8,
  "A9.png": A9,
  "A10.png": A10,
  "A11.png": A11,
  "A12.png": A12,
  "A13.png": A13,
  "A15.png": A15,
  "A16.png": A16,
};

/**
 * Opciones del filtro de estado. El string vacío "" significa "All Statuses"
 * (sin filtro) y no se envía como query param en `fetchBookings`.
 */
const statuses = ["", "confirmed", "rescheduled", "cancelled"];

// ============================================================================
// 2. COMPONENTE PRINCIPAL: BookingPage
// ============================================================================

export default function BookingPage() {
  // --- Estado: datos y UI ---
  const [bookings, setBookings] = useState([]); // Lista de reservas devuelta por GET /bookings
  const [filters, setFilters] = useState({ date: "", status: "" }); // Filtros controlados { YYYY-MM-DD, status }
  const [message, setMessage] = useState(""); // Banner global de feedback (carga / reschedule / error)
  const [reschedules, setReschedules] = useState({}); // Drafts por reserva: { [bookingId]: { date, startTime, endTime } }
  const [cancelModalBookingId, setCancelModalBookingId] = useState(null); // Id en el modal de cancelación (null = cerrado)
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState(null); // Objeto reserva en el modal de reprogramación (null = cerrado)

  // --- Funciones auxiliares (definidas dentro: usan estado/setters del cierre) ---

  /**
   * Formatea un timestamp ISO (`createdAt` / `updatedAt`) a fecha legible.
   * @param {string} value - Fecha ISO del backend.
   * @returns {string} Fecha formateada o "Not available" si no hay valor.
   */
  const formatTimestamp = (value) => {
    if (!value) return "Not available";
    return new Intl.DateTimeFormat("en-In", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  };

  /**
   * Pide la lista de reservas al backend aplicando los filtros recibidos.
   * Solo envía `date` / `status` como query params si tienen valor (si no,
   * el backend devuelve todo). En caso de error muestra banner con el mensaje
   * del backend o un fallback genérico.
   * @param {{ date: string, status: string }} nextFilters - Filtros a aplicar.
   */
  const fetchBookings = async (nextFilters) => {
    try {
      const params = {};
      if (nextFilters.date) params.date = nextFilters.date;
      if (nextFilters.status) params.status = nextFilters.status;

      const { data } = await listBookings(params);
      setBookings(data.bookings || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could Not Load Bookings");
    }
  };

  /**
   * Atajo para recargar la lista con los filtros actuales del estado.
   * Se usa tras cancelar / reprogramar para refrescar las tarjetas.
   */
  const loadBookings = () => fetchBookings(filters);

  // --- Efecto: recarga filtrada ---
  // Se ejecuta al montar y cada vez que cambia `filters` (input date o select status).
  // Envuelve `fetchBookings` en una función async interna porque el callback de
  // `useEffect` no puede ser async directamente.
  useEffect(() => {
    const loadFilteredBookings = async () => {
      await fetchBookings(filters);
    };

    loadFilteredBookings();
  }, [filters]);

  // --- Manejadores de eventos ---

  /**
   * Cambia el estado de una reserva (actualmente solo se usa con "cancelled"
   * desde el modal) y recarga la lista.
   * @param {{ _id: string }} bookings - Reserva objetivo (el nombre en plural es
   *   legado: en realidad es un único objeto booking).
   * @param {string} status - Nuevo estado (ej. "cancelled").
   */
  const setStatus = async (bookings, status) => {
    await updateBookingStatus(bookings._id, status);
    loadBookings();
  };

  /**
   * Actualiza el borrador (draft) de reprogramación de una reserva en `reschedules`.
   * Fusiona: valores actuales del booking + draft previo + nuevo `[key]: value`.
   * Así los inputs del modal son controlados sin mutar la reserva original hasta confirmar.
   * @param {{ _id: string, date: string, startTime: string, endtime: string }} booking - Reserva base.
   * @param {string} key - Campo a editar ("date" | "startTime" | "endTime").
   * @param {string} value - Nuevo valor del input (date o time).
   */
  const updateRecheduleDraft = (booking, key, value) => {
    setReschedules((prev) => ({
      ...prev,
      [booking._id]: {
        date: booking.date,
        startTime: booking.startTime,
        endtime: booking.endtime,
        ...prev[booking._id],
        [key]: value,
      },
    }));
  };

  /**
   * Confirma la reprogramación: fusiona valores originales + draft, llama a
   * PATCH `/bookings/:id/reschedule`, muestra banner según si el email al cliente
   * se envió o se omitió (`data.email.skipped`), limpia el draft y recarga.
   * @param {{ _id: string, date: string, startTime: string, endTime: string }} booking - Reserva a reprogramar.
   */
  const submitReschedule = async (booking) => {
    const draft = {
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      ...reschedules[booking._id],
    };

    try {
      const { data } = await rescheduleBooking(booking._id, draft);
      setMessage(
        data.email?.skipped
          ? `Booking rescheduled, but email was skipped: ${data.email.reason}`
          : "Booking rescheduled. Customer notification and calendar update were triggered.",
      );
      setReschedules((prev) => ({ ...prev, [booking._id]: undefined }));
      loadBookings();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not reschedule booking",
      );
    }
  };

  /**
   * Elige el estilo del banner de mensajes: verde (success) si contiene
   * "triggered"/"success", azul informativo en otro caso.
   * @param {string} msg - Mensaje actual.
   * @returns {string} Clase CSS de `bookingsPageStyles`.
   */
  const getBannerVariant = (msg) =>
    msg.toLowerCase().includes("triggered") ||
      msg.toLowerCase().includes("success")
      ? s.messageBannerSuccess
      : s.messageBannerInfo;

  // ============================================================================
  // 3. RENDERIZADO DE LA INTERFAZ (UI)
  // ============================================================================
  return (
    <AppLayout>
      {/* HEADER: título + subtítulo + ilustración P7 + fila de filtros */}
      <section className={s.headerSection}>
        <div className={s.headerLeftArea}>
          <div>
            <p className={s.bookingLabel}>Bookings</p>
            <h1 className={s.mainHeading}>
              Manage customer{" "}
              <span className={s.mainHeadingGradient}>appointments</span>
            </h1>
            <p className={s.subText}>
              Review payments, calendar sync, and appointment status from one
              calm workspace.
            </p>
          </div>
          <div className={s.illustrationContainer}>
            <img src={p7Image} className={s.illustrationImg} />
          </div>
        </div>

        {/* Filtros controlados: `filters.date` y `filters.status` -> disparan el useEffect */}
        <div className={s.filterRow}>
          {/* Filtro por fecha: input date -> `setFilters({ ...prev, date })` */}
          <div className={s.filterDateContainer}>
            <CalendarDays className={s.filterIcon} />
            <input
              type="date"
              value={filters.date}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, date: event.target.value }))
              }
              className={s.filterDateInput}
              placeholder="Select Date"
            />
          </div>
          {/* Filtro por estado: select construido desde `statuses` ("" = All Statuses) */}
          <div className={s.filterStatusContainer}>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
              className={s.filterStatusSelect}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status ? status.replace("_", " ") : "All Statuses"}
                </option>
              ))}
            </select>
            <Filter className={s.filterSelectIcon} />
          </div>
        </div>
      </section>

      {/* Banner global de feedback: solo visible si hay `message` */}
      {message && (
        <div className={`${s.messageBanner} ${getBannerVariant(message)}`}>
          <Info className="w-4 h-4" />
          {message}
        </div>
      )}

      {/* LISTA DE RESERVAS: estado vacío + una tarjeta por booking */}
      <section className={s.bookingListSection}>
        {/* Empty state: cuando el filtro no devuelve resultados */}
        {bookings.length === 0 && (
          <div className={s.emptyStateContainer}>
            <CalendarDays className={s.emptyStateIcon} />
            <p className={s.emptyStateText}>No bookings match these filters.</p>
          </div>
        )}

        {bookings.map((booking) => (
          <article key={booking._id} className={s.cardContainer}>
            <div className={s.cardInnerLayout}>
              {/* Izquierda: información de la reserva */}
              <div className={s.cardLeftBlock}>
                {/* Badges: estado + pago + contador de reprogramaciones (solo si > 0) */}
                <div className={s.badgesContainer}>
                  <span
                    className={`${s.statusBadgeBase} ${s.statusBadgeClassMap[booking.status] || s.statusBadgeClassMap.default}`}
                  >
                    <Check className={s.badgeIcon} />
                    {booking.status.replace("_", " ")}
                  </span>
                  <span
                    className={`${s.paymentBadgeBase} ${s.paymentBadgeClassMap[booking.paymentStatus] || s.paymentBadgeClassMap.default}`}
                  >
                    <CreditCard className={s.badgeIcon} />
                    Payment:{" "}
                    {booking.paymentStatus?.replace("_", " ") || "Not Required"}
                  </span>
                  {booking.rescheduleCount > 0 && (
                    <span
                      className={`${s.paymentBadgeBase} bg-orange-100 text-orange-700 ml-2`}
                    >
                      <RefreshCcw className={s.badgeIcon} />
                      Rescheduled ({booking.rescheduleCount})
                    </span>
                  )}
                </div>

                {/* Cliente: avatar resuelto vía AVATAR_MAP + nombre + email */}
                <div className={s.customerInfoRow}>
                  <div className={s.customerAvatarContainer}>
                    <img
                      src={AVATAR_MAP[booking.customerAvatar || "A1.png"]}
                      alt={booking.customerName}
                      className={s.customerAvatarImg}
                    />
                  </div>
                  <div>
                    <h2 className={s.customerName}>{booking.customerName}</h2>
                    <p className={s.customerEmail}>{booking.customerEmail}</p>
                  </div>
                </div>

                {/* Detalle cita: fecha • hora + servicio (`serviceId.name`) + notas */}
                <div className={s.bookingDetailsRow}>
                  <div className={s.bookingDetailsIconContainer}>
                    <CalendarDays className={s.bookingDetailsIcon} />
                  </div>
                  <div className={s.bookingDetailsTextContainer}>
                    <p className={s.bookingDateTimeText}>
                      {booking.date} • {booking.startTime} - {booking.endTime}
                    </p>
                    <div className={s.bookingServiceRow}>
                      <div className={s.bookingServiceDot}></div>
                      <p className={s.bookingServiceText}>
                        {booking.serviceId?.name || "Meeting"}
                        {booking.notes ? ` • ${booking.notes}` : " • GGH"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timestamps: creación y última actualización formateadas con `formatTimestamp()` */}
                <div className={s.timestampsContainer}>
                  <span className={s.timestampSpan}>
                    <Clock className={s.timestampIcon} />
                    Created: {formatTimestamp(booking.createdAt)}
                  </span>
                  <span className={s.timestampSpan}>
                    <RefreshCcw className={s.timestampIcon} />
                    Last updated: {formatTimestamp(booking.updatedAt)}
                  </span>
                </div>

                {/* Sync Calendar: `googleEventId` indica si se sincronizó con Google */}
                <div className={s.calendarSyncRow}>
                  <Calendar className={s.timestampIcon} />
                  Calendar:{" "}
                  {booking.googleEventId ? "Synced to Google" : "Not synced"}
                </div>

                {/* Enlace "Add to calendar" del cliente: botón si hay URL, texto apagado si no */}
                {booking.customerCalendarUrl ? (
                  <a
                    href={booking.customerCalendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={s.calendarLinkButton}
                  >
                    Customer calendar link
                    <ExternalLink className={s.calendarLinkIcon} />
                  </a>
                ) : (
                  <span className={s.calendarLinkUnavailable}>
                    Calendar link unavailable
                    <ExternalLink className={s.calendarLinkIcon} />
                  </span>
                )}
              </div>

              {/* Derecha: acciones. Se ocultan si ya está cancelada o falló el pago */}
              <div className={s.cardRightBlock}>
                <div className={s.actionButtonsContainer}>
                  {booking.status !== "cancelled" &&
                    booking.status !== "payment_failed" && (
                      <>
                        {/* Abre el modal de reprogramación con esta reserva */}
                        <button
                          type="button"
                          onClick={() => setRescheduleModalBooking(booking)}
                          className={s.rescheduleButton}
                        >
                          <CalendarDays className={s.actionIcon} />
                          Reschedule
                        </button>
                        {/* Abre el modal de cancelación guardando solo el _id */}
                        <button
                          type="button"
                          onClick={() => setCancelModalBookingId(booking._id)}
                          className={s.cancelButton}
                        >
                          <XCircle className={s.actionIcon} />
                          Cancel
                        </button>
                      </>
                    )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* MODAL CANCELAR: confirmación irreversible; "Yes, Cancel" -> `setStatus(..., "cancelled")` */}
      {cancelModalBookingId && (
        <div className={s.modalOverlay}>
          <div className={s.modalContent}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Cancel Booking</h2>
              <button
                onClick={() => setCancelModalBookingId(null)}
                className={s.modalCloseBtn}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className={s.modalBody}>
              <p className={s.modalMessage}>
                Are you sure you want to cancel this booking? This action cannot
                be undone, and the customer will be notified.
              </p>
            </div>
            <div className={s.modalFooter}>
              <button
                onClick={() => setCancelModalBookingId(null)}
                className={s.modalButtonSecondary}
              >
                Keep Booking
              </button>
              <button
                onClick={() => {
                  setStatus({ _id: cancelModalBookingId }, "cancelled");
                  setCancelModalBookingId(null);
                }}
                className={s.modalButtonDanger}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REPROGRAMAR: 3 inputs controlados (date/startTime/endTime) atados al draft */}
      {rescheduleModalBooking && (
        <div className={s.modalOverlay}>
          <div className={s.modalContent}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Reschedule Booking</h2>
              {/* Cerrar con X: cierra y descarta el draft de esta reserva */}
              <button
                onClick={() => {
                  setRescheduleModalBooking(null);
                  setReschedules((prev) => ({
                    ...prev,
                    [rescheduleModalBooking._id]: undefined,
                  }));
                }}
                className={s.modalCloseBtn}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className={s.modalBody}>
              <div className={s.rescheduleGrid}>
                {/* Nueva fecha: `reschedules[id]?.date ?? booking.date` */}
                <div className={s.rescheduleInputContainer}>
                  <CalendarDays className={s.rescheduleInputIcon} />
                  <input
                    type="date"
                    value={
                      reschedules[rescheduleModalBooking._id]?.date ??
                      rescheduleModalBooking.date
                    }
                    onChange={(event) =>
                      updateRecheduleDraft(
                        rescheduleModalBooking,
                        "date",
                        event.target.value,
                      )
                    }
                    className={s.rescheduleInputField}
                  />
                </div>
                {/* Nueva hora inicio: `reschedules[id]?.startTime ?? booking.startTime` */}
                <div className={s.rescheduleInputContainer}>
                  <Clock className={s.rescheduleInputIcon} />
                  <input
                    type="time"
                    value={
                      reschedules[rescheduleModalBooking._id]?.startTime ??
                      rescheduleModalBooking.startTime
                    }
                    onChange={(event) =>
                      updateRecheduleDraft(
                        rescheduleModalBooking,
                        "startTime",
                        event.target.value,
                      )
                    }
                    className={s.rescheduleInputField}
                  />
                </div>
                {/* Nueva hora fin: `reschedules[id]?.endTime ?? booking.endTime` */}
                <div className={s.rescheduleInputContainer}>
                  <Clock className={s.rescheduleInputIcon} />
                  <input
                    type="time"
                    value={
                      reschedules[rescheduleModalBooking._id]?.endTime ??
                      rescheduleModalBooking.endTime
                    }
                    onChange={(event) =>
                      updateRecheduleDraft(
                        rescheduleModalBooking,
                        "endTime",
                        event.target.value,
                      )
                    }
                    className={s.rescheduleInputField}
                  />
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              {/* Discard: cierra y descarta el draft sin llamar a la API */}
              <button
                onClick={() => {
                  setRescheduleModalBooking(null);
                  setReschedules((prev) => ({
                    ...prev,
                    [rescheduleModalBooking._id]: undefined,
                  }));
                }}
                className={s.modalButtonSecondary}
              >
                Discard
              </button>
              {/* Confirm: llama a `submitReschedule(booking)` y cierra el modal */}
              <button
                onClick={() => {
                  submitReschedule(rescheduleModalBooking);
                  setRescheduleModalBooking(null);
                }}
                className={s.modalButtonPrimary}
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
