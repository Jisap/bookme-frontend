import axios from "axios";

/**
 * Instancia centralizada de Axios para realizar todas las peticiones HTTP a la API.
 * Configura la URL base predeterminada tomando la variable de entorno de Vite
 * o usando el puerto local del backend (http://localhost:5000/api) como respaldo.
 */
const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

/**
 * Interceptor de Solicitud (Request):
 * Se ejecuta antes de que cualquier petición sea enviada al servidor.
 * Revisa si existe un token de autenticación en localStorage y, de ser así,
 * lo añade a las cabeceras HTTP como 'Bearer token'.
 */
client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    // Manejo de errores antes de enviar la solicitud
    return Promise.reject(error);
});

/**
 * Función auxiliar para persistir el token de autenticación.
 * Examina la respuesta recibida del servidor y, si incluye un campo 'token',
 * lo almacena automáticamente en el localStorage para futuras solicitudes.
 * 
 * @param {import('axios').AxiosResponse} response - Objeto de respuesta HTTP de Axios.
 * @returns {import('axios').AxiosResponse} La respuesta original sin modificar.
 */
const persistTokenFromResponse = (response) => {
    const token = response.data?.token;
    if (token) {
        localStorage.setItem("token", token);
    }
    return response;
};

/**
 * Interceptor de Respuesta (Response):
 * Maneja el flujo global de las respuestas del servidor:
 * 1. Éxito: Pasa por 'persistTokenFromResponse' para guardar tokens si están presentes.
 * 2. Error (401 No Autorizado): Si el token expiró o es inválido, limpia la sesión
 *    en localStorage y redirige automáticamente al usuario a la página de login.
 */
client.interceptors.response.use(
    persistTokenFromResponse,
    (error) => {
        // Si el servidor responde con 401 (No autorizado / sesión expirada)
        if (error.response?.status === 401 && localStorage.getItem("token")) {
            localStorage.removeItem("token");
            window.location.assign("/login");
        }
        
        // Rechazamos la promesa para que el componente que hizo la llamada pueda capturar el error
        return Promise.reject(error);
    }
);

export default client;