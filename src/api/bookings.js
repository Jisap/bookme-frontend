import client from "./client";

/**
 * Capa de acceso a la API de reservas del proveedor.
 * Usa la instancia centralizada `client` (baseURL `VITE_API_URL`, token `localStorage.token`).
 */

/**
 * Lista las reservas del proveedor autenticado.
 * @param {Object} [params] - Filtros opcionales (fecha, estado, servicio...).
 * @returns {Promise<import('axios').AxiosResponse>} Listado de reservas.
 */
export const listBookings = (params = {}) => client.get("/bookings", { params });

/**
 * Actualiza el estado de una reserva (confirmar, cancelar...).
 * @param {string} id - Identificador de la reserva.
 * @param {string} status - Nuevo estado.
 * @returns {Promise<import('axios').AxiosResponse>} Reserva actualizada.
 */
export const updateBookingStatus = (id, status) => client.patch(`/bookings/${id}`, { status });

/**
 * Reprograma una reserva existente.
 * @param {string} id - Identificador de la reserva.
 * @param {Object} data - Nueva fecha y franja horaria.
 * @returns {Promise<import('axios').AxiosResponse>} Reserva reprogramada.
 */
export const rescheduleBooking = (id, data) => client.patch(`/bookings/${id}/reschedule`, { data })