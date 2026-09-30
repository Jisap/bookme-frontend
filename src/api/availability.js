import client from "./client";

/**
 * Capa de acceso a la API de disponibilidad del proveedor.
 * Usa la instancia centralizada `client` (baseURL `VITE_API_URL`, token `localStorage.token`).
 */

/**
 * Obtiene la disponibilidad semanal del proveedor autenticado.
 * @returns {Promise<import('axios').AxiosResponse>} Horarios de disponibilidad actuales.
 */
export const listAvailability = () => client.get("/availability");

/**
 * Guarda o actualiza la disponibilidad semanal del proveedor autenticado.
 * @param {Object} data - Configuración de disponibilidad (días, franjas horarias...).
 * @returns {Promise<import('axios').AxiosResponse>} Disponibilidad guardada.
 */
export const saveAvailability = (data) => client.post("/availability", data);