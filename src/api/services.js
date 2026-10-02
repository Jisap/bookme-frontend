/**
 * services.js
 *
 * Capa de acceso a la API de servicios del proveedor.
 * Propósito: centralizar el CRUD de servicios (`/services`) para que las
 * páginas no construyan URLs ni cabeceras a mano, igual que `src/api/bookings.js`
 * hace con las reservas.
 *
 * Flujo de datos:
 * - Cada helper delega en la instancia centralizada `client` (`src/api/client.js`,
 *   baseURL `VITE_API_URL` o `http://localhost:5000/api`, token `localStorage.token`
 *   vía interceptor `Authorization: Bearer <token>`).
 * - Lectura: `listServices()` -> GET `/services` -> `data.services[]` (excluye
 *   eliminados lógicamente). Lo consumen `DashboardPage` (top 4 servicios más
 *   reservados) y `ServicesPage` (`loadServices()` -> `applyServices()`).
 * - Escritura: `createService(data)` / `updateService(id, data)` / `deleteService(id)`
 *   -> POST / PUT / DELETE `/services[/:id]` -> `data.service` o confirmación.
 *   `ServicesPage` recarga con `listServices()` tras cada mutación.
 * - Errores: no se capturan aquí; el llamador muestra banner/toast con
 *   `error.response?.data?.message`. El 401 global lo gestiona `client`
 *   (limpia `token` y redirige a `/login`).
 *
 * Contratos API (backend `/api/services`, requiere JWT de proveedor):
 * - `listServices()` -> GET `/services` (sin params). Respuesta `{ services: [] }`.
 * - `createService(data)` -> POST `/services` con
 *   `{ name, duration, price, description, icon }`. Respuesta `{ service }`.
 * - `updateService(id, data)` -> PUT `/services/:id` con
 *   `{ name, duration, price, description, isActive, icon }`. Respuesta `{ service }`.
 * - `deleteService(id)` -> DELETE `/services/:id` (borrado lógico: marca
 *   `isDeleted=true` e `isActive=false`). Respuesta confirmación `{ message }`.
 *
 * Enfoque de diseño: módulo funcional sin estado (`useState`) ni efectos;
 * thin wrappers puros sobre `client` que devuelven `Promise<AxiosResponse>`
 * sin desempaquetar `data`. Sin `useMemo`: el coste es una sola llamada HTTP
 * por helper. Estilo JSDoc explícito con `@param`/`@returns`, como en
 * `BookingPage.jsx` y `DashboardPage.jsx`.
 *
 * Nota de nomenclatura (resuelta): el canónico es singular para operaciones
 * sobre una entidad (`createService`, `updateService`, `deleteService`, igual
 * que `updateBookingStatus`/`rescheduleBooking` en `bookings.js`) y plural
 * solo para la colección (`listServices`). Se mantienen alias en plural
 * (`createServices`, `updateServices`, `deleteServices`) como retrocompatibles
 * y marcados `@deprecated`, para que los imports antiguos no rompan.
 */

import client from "./client";

// ============================================================================
// 1. LECTURA (query sin params: el backend filtra por proveedor + no eliminados)
// ============================================================================

/**
 * Lista los servicios del proveedor autenticado (excluye eliminados).
 *
 * Usado en `DashboardPage` (carga inicial en `Promise.all` junto a
 * `getMe`/`listBookings`/`getPaymentOverview` para calcular `topServices`)
 * y en `ServicesPage` (`loadServices` inicial + recarga tras cada mutación).
 *
 * @returns {Promise<import('axios').AxiosResponse>} Respuesta Axios con
 *   `data.services: Array<{ _id, name, duration, price, description, icon, isActive }>`.
 * @example
 * const { data } = await listServices();
 * setServices(data.services || []);
 */
export const listServices = () => client.get("/services");

// ============================================================================
// 2. ESCRITURA (mutaciones: crear / actualizar / borrado lógico)
// ============================================================================

/**
 * Crea un nuevo servicio del proveedor.
 *
 * El llamador (`ServicesPage.handleSubmit`) normaliza `duration`/`price` a
 * `Number` antes de enviar y resetea el formulario (`emptyForm`) al éxito.
 *
 * @param {Object} data - Datos del servicio.
 * @param {string} data.name - Nombre visible (ej. "Corte clásico").
 * @param {number} data.duration - Duración en minutos (ej. 30).
 * @param {number} data.price - Precio en unidades mayores (ej. 25.00).
 * @param {string} [data.description] - Descripción opcional.
 * @param {string} [data.icon] - Clave de icono nombre-fichero (ej. "C1.png",
 *   resuelta en UI vía `ICON_MAP`).
 * @returns {Promise<import('axios').AxiosResponse>} Respuesta Axios con
 *   `data.service` creado.
 * @example
 * await createService({ ...form, duration: Number(form.duration), price: Number(form.price) });
 */
export const createService = (data) => client.post("/services", data);

/**
 * Actualiza un servicio existente (edición completa o parcial).
 *
 * El llamador pasa `editingId` + `payload` ya normalizado; tras el éxito
 * recarga la lista para refrescar tarjetas y contadores.
 *
 * @param {string} id - Identificador del servicio (`service._id`).
 * @param {Object} data - Campos a actualizar.
 * @param {string} [data.name] - Nuevo nombre.
 * @param {number} [data.duration] - Nueva duración en minutos.
 * @param {number} [data.price] - Nuevo precio.
 * @param {string} [data.description] - Nueva descripción.
 * @param {boolean} [data.isActive] - Visibilidad en la página pública de reserva.
 * @param {string} [data.icon] - Nueva clave de icono ("C1.png"…"C8.png").
 * @returns {Promise<import('axios').AxiosResponse>} Respuesta Axios con
 *   `data.service` actualizado.
 * @example
 * await updateService(editingId, payload);
 */
export const updateService = (id, data) => client.put(`/services/${id}`, data);

/**
 * Elimina lógicamente un servicio (lo marca como eliminado e inactivo).
 *
 * No borra el documento: el backend lo oculta del GET `/services` y de la
 * página pública, pero las reservas históricas conservan `serviceId`.
 * La UI pide confirmación (`deleteConfirm` modal) antes de llamar.
 *
 * @param {string} id - Identificador del servicio (`service._id`).
 * @returns {Promise<import('axios').AxiosResponse>} Respuesta Axios con
 *   confirmación de borrado (`data.message`).
 * @example
 * await deleteService(serviceId);
 * const { data } = await listServices(); // recarga
 */
export const deleteService = (id) => client.delete(`/services/${id}`);

// ============================================================================
// 3. ALIAS RETROCOMPATIBLES (plural, deprecated: mantener imports antiguos)
// ============================================================================

/**
 * @deprecated Usar `createService`. Alias en plural para compatibilidad.
 */
export const createServices = createService;
/**
 * @deprecated Usar `updateService`. Alias en plural para compatibilidad.
 */
export const updateServices = updateService;
/**
 * @deprecated Usar `deleteService`. Alias en plural para compatibilidad.
 */
export const deleteServices = deleteService;