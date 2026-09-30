import client from "./client";

/**
 * Capa de acceso a la API pública de reservas (sin autenticación).
 * Usa la instancia centralizada `client` (baseURL `VITE_API_URL`).
 * Todas las rutas se resuelven por el `slug` del negocio.
 */

/**
 * Obtiene el perfil público de un negocio y su catálogo de servicios activos.
 * @param {string} slug - Slug identificador del negocio.
 * @returns {Promise<import('axios').AxiosResponse>} Negocio y servicios.
 */
export const getPublicBusiness = (slug) => client.get(`/public/${slug}`);

/**
 * Obtiene los horarios disponibles para una fecha y servicio concretos.
 * @param {string} slug - Slug identificador del negocio.
 * @param {Object} params - Filtros ({ date: 'YYYY-MM-DD', serviceId }).
 * @returns {Promise<import('axios').AxiosResponse>} Listado de slots.
 */
export const getPublicSlots = (slug, params) => client.get(`/public/${slug}/slots`, { params });

/**
 * Solicita el envío del código OTP al email del cliente antes de reservar.
 * @param {string} slug - Slug identificador del negocio.
 * @param {string|Object} customerEmail - Email del cliente o objeto ({ customerEmail }).
 * @returns {Promise<import('axios').AxiosResponse>} Confirmación de envío del OTP.
 */
export const requestPublicBookingOtp = (slug, customerEmail) => client.post(`/public/${slug}/request-otp`, typeof customerEmail === "string" ? { customerEmail } : customerEmail);

/**
 * Verifica el código OTP del cliente (sin consumirlo).
 * @param {string} slug - Slug identificador del negocio.
 * @param {Object} data - Datos de verificación ({ customerEmail, emailOtp }).
 * @returns {Promise<import('axios').AxiosResponse>} Confirmación de verificación.
 */
export const verifyPublicBookingOtp = (slug, data) => client.post(`/public/${slug}/verify-otp`, data);

/**
 * Crea una reserva pública (gratuita o con redirección a Stripe si es de pago).
 * @param {string} slug - Slug identificador del negocio.
 * @param {Object} data - Datos de la reserva ({ serviceId, customerName, customerEmail, date, startTime, endTime, notes, emailOtp... }).
 * @returns {Promise<import('axios').AxiosResponse>} Reserva creada o URL de checkout.
 */
export const createPublicBooking = (slug, data) => client.post(`/public/${slug}/book`, data);

/**
 * Consulta el estado de una reserva por `session_id` (Stripe) o `booking_id`.
 * Si el pago se completó, el backend la confirma automáticamente.
 * @param {Object} params - Identificadores ({ session_id } o { booking_id }).
 * @returns {Promise<import('axios').AxiosResponse>} Reserva actualizada.
 */
export const getPublicBookingStatus = (params) => client.get(`/public/booking/status`, { params });

/**
 * Cancela una reserva en estado pendiente de pago (pasarela cancelada por el usuario).
 * @param {string|Object} bookingId - Identificador de la reserva o objeto ({ booking_id }).
 * @returns {Promise<import('axios').AxiosResponse>} Confirmación de cancelación.
 */
export const cancelPublicBookingPayments = (bookingId) => client.post(`/public/booking/cancel-payment`, typeof bookingId === "object" ? bookingId : { booking_id: bookingId });