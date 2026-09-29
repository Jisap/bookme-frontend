import axios from "axios";

/**
 * Instancia de Axios configurada específicamente para las peticiones del panel de administración.
 * Establece la URL base del backend desde las variables de entorno de Vite
 * o utiliza el puerto local (http://localhost:5000/api) como valor por defecto.
 */
const adminClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

/**
 * Interceptor de Solicitud (Request):
 * Se ejecuta antes de enviar cualquier petición administrativa.
 * Obtiene el token exclusivo del administrador ('adminToken') desde el localStorage
 * y lo inyecta en los encabezados HTTP bajo el formato 'Authorization: Bearer <token>'.
 */
adminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  // Manejo de errores antes de que la solicitud sea enviada
  return Promise.reject(error);
});

/**
 * Interceptor de Respuesta (Response):
 * Gestiona las respuestas provenientes del servidor para las rutas de administración:
 * 1. Éxito: Si la respuesta contiene un nuevo 'token', lo almacena automáticamente en localStorage.
 * 2. Error (401): Si el token de administrador es inválido o expiró, limpia la sesión
 *    y redirige a la pantalla de inicio de sesión de administradores.
 */
adminClient.interceptors.response.use(
  (response) => {
    const token = response.data?.token;
    if (token) {
      localStorage.setItem("adminToken", token);
    }
    return response;
  },
  (error) => {
    // Si el servidor responde con 401 (Sesión administrativa no autorizada o expirada)
    if (error.response?.status === 401 && localStorage.getItem("adminToken")) {
      localStorage.removeItem("adminToken");
      window.location.assign("/admin/login");
    }

    // Rechaza la promesa para que los componentes puedan gestionar el error (ej: mostrar alertas)
    return Promise.reject(error);
  }
);

/**
 * Inicia sesión en la plataforma como administrador global.
 * 
 * @param {Object} data - Credenciales del administrador.
 * @param {string} data.email - Correo electrónico configurado para el admin.
 * @param {string} data.password - Contraseña de acceso administrativo.
 * @returns {Promise<import('axios').AxiosResponse<{ message: string, token: string, admin: { email: string } }>>}
 */
export const adminLogin = (data) => adminClient.post("/admin/login", data);

/**
 * Cierra la sesión activa del administrador eliminando el token de localStorage.
 */
export const adminLogout = () => {
  localStorage.removeItem("adminToken");
};

/**
 * Obtiene las métricas globales del negocio y los listados para el Dashboard administrativo:
 * - Resumen: total de usuarios, reservas, volumen bruto, comisiones de plataforma y retiros.
 * - Listado de los últimos 100 usuarios registrados.
 * - Historial de las últimas 50 solicitudes de retiro.
 * - Las 10 reservas pagadas más recientes.
 * 
 * @returns {Promise<import('axios').AxiosResponse<{
 *   summary: Object,
 *   users: Array<Object>,
 *   withdrawals: Array<Object>,
 *   recentBookings: Array<Object>
 * }>>}
 */
export const getAdminDashboard = () => adminClient.get("/admin/dashboard");

/**
 * Actualiza el estado de una solicitud de retiro de fondos (ej: aprobar, procesar o rechazar).
 * Si se cambia el estado a 'rejected', el backend reversa y reintegra los fondos a la billetera del usuario.
 * 
 * @param {string} id - Identificador único de la solicitud de retiro en MongoDB.
 * @param {Object} data - Datos para la actualización del retiro.
 * @param {'pending' | 'processing' | 'paid' | 'rejected'} data.status - Nuevo estado de la solicitud.
 * @param {string} [data.adminNote] - Comentario o nota explicativa interna del administrador.
 * @returns {Promise<import('axios').AxiosResponse<{ message: string, withdrawal: Object, summary: Object }>>}
 */
export const updateWithdrawalStatus = (id, data) => adminClient.patch(`/admin/withdrawals/${id}`, data);

export default adminClient;