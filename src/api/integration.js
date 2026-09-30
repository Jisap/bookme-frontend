import client from "./client";

/**
 * Capa de acceso a la API de integraciones del proveedor.
 * Usa la instancia centralizada `client` (baseURL `VITE_API_URL`, token `localStorage.token`).
 */

/**
 * Obtiene la URL de OAuth para conectar el Google Calendar del proveedor autenticado.
 * @returns {Promise<import('axios').AxiosResponse>} URL de autorización de Google.
 */
export const getGoogleConnectUrl = () => client.get("/integrations/google/connect");