import client from "./client";

/**
 * Capa de acceso a la API de servicios del proveedor.
 * Usa la instancia centralizada `client` (baseURL `VITE_API_URL`, token `localStorage.token`).
 */

/**
 * Lista los servicios del proveedor autenticado (excluye eliminados).
 * @returns {Promise<import('axios').AxiosResponse>} Listado de servicios.
 */
export const listServices = () => client.get("/services");

/**
 * Crea un nuevo servicio del proveedor.
 * @param {Object} data - Datos del servicio ({ name, duration, price, description, icon }).
 * @returns {Promise<import('axios').AxiosResponse>} Servicio creado.
 */
export const createServices = (data) => client.post("/services", data);

/**
 * Actualiza un servicio existente (campos: name, duration, price, description, isActive, icon).
 * @param {string} id - Identificador del servicio.
 * @param {Object} data - Campos a actualizar.
 * @returns {Promise<import('axios').AxiosResponse>} Servicio actualizado.
 */
export const updateServices = (id, data) => client.put(`/services/${id}`, data);

/**
 * Elimina lógicamente un servicio (lo marca como eliminado e inactivo).
 * @param {string} id - Identificador del servicio.
 * @returns {Promise<import('axios').AxiosResponse>} Confirmación de borrado.
 */
export const deleteServices = (id) => client.delete(`/services/${id}`);