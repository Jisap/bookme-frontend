import client from "./client";

/**
 * Capa de acceso a la API de autenticación de proveedores/usuarios.
 * Usa la instancia centralizada `client` (baseURL `VITE_API_URL`, token `localStorage.token`).
 * No usar para el admin (ver `api/admin.js` con `adminToken`).
 */

/**
 * Registra un nuevo proveedor/usuario.
 * @param {Object} data - Datos de registro (nombre, email, password, negocio...).
 * @returns {Promise<import('axios').AxiosResponse>} Respuesta con usuario y token.
 */
export const register = (data) => client.post("/auth/register", data);
/**
 * Solicita el OTP de verificación al email indicado (paso previo al registro).
 * @param {string} email - Correo del proveedor/usuario.
 * @returns {Promise<import('axios').AxiosResponse>} Confirmación de envío del OTP.
 */
export const requestRegistrationOtp = (email) => client.post("/auth/register/request-otp", { email });
/**
 * Verifica el OTP recibido por email para completar el registro.
 * @param {Object} data - Datos con email y código OTP.
 * @returns {Promise<import('axios').AxiosResponse>} Respuesta con verificación y token.
 */
export const verifyRegistrationOtp = (data) => client.post("/auth/register/verify-otp", data);
/**
 * Inicia sesión como proveedor/usuario.
 * El token devuelto se persiste automáticamente vía el interceptor de `client`.
 * @param {Object} data - Credenciales ({ email, password }).
 * @returns {Promise<import('axios').AxiosResponse>} Respuesta con usuario y token.
 */
export const login = (data) => client.post("/auth/login", data);
/**
 * Obtiene el perfil del usuario autenticado (requiere `token`).
 * @returns {Promise<import('axios').AxiosResponse>} Datos del usuario actual.
 */
export const getMe = () => client.get("/auth/me");
/**
 * Actualiza el perfil del usuario autenticado.
 * @param {Object} data - Campos a actualizar del perfil/negocio.
 * @returns {Promise<import('axios').AxiosResponse>} Usuario actualizado.
 */
export const UpdateProfile = (data) => client.put("/auth/profile", data);