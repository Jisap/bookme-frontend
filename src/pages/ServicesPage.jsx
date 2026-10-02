/**
 * ============================================================================
 * ServicesPage.jsx
 * ----------------------------------------------------------------------------
 * Página de gestión de servicios reservables del negocio.
 *
 * Qué hace:
 *  - Lista los servicios existentes (nombre, duración, precio, descripción,
 *    icono y visibilidad Activo/Oculto).
 *  - Permite crear un servicio nuevo y editar uno existente con el mismo
 *    formulario (modo "Add" / modo "Edit" según `editingId`).
 *  - Permite activar/ocultar un servicio (toggle `isActive`) y eliminarlo
 *    con modal de confirmación.
 *  - Muestra toasts de éxito/error y mensajes inline de carga.
 *
 * Dependencias:
 *  - API (`../api/services`): listServices, createService, updateService,
 *    deleteService.
 *  - Layout (`../components/AppLayout`) y toasts (`ToastContext`).
 *  - Estilos centralizados (`servicesPageStyles as s`).
 *  - Iconos `lucide-react` + imágenes locales C1..C8 y P6.png.
 *
 * Estado principal:
 *  - services: array de servicios del backend.
 *  - form: valores controlados del formulario (emptyForm como inicial).
 *  - editingId: "" = creando, "<id>" = editando ese servicio.
 *  - message: error inline (carga inicial).
 *  - loading: bloquea el submit mientras guarda.
 *  - deleteConfirm: servicio pendiente de eliminar (abre el modal).
 * ============================================================================
 */


import { useEffect, useState } from "react";
// --- Ilustración del encabezado ---
import p6Image from "../assets/P6.png";
// --- Iconos seleccionables para cada servicio (C1..C8) ---
import C1 from "../assets/icons/C1.png";
import C2 from "../assets/icons/C2.png";
import C3 from "../assets/icons/C3.png";
import C4 from "../assets/icons/C4.png";
import C5 from "../assets/icons/C5.png";
import C6 from "../assets/icons/C6.png";
import C7 from "../assets/icons/C7.png";
import C8 from "../assets/icons/C8.png";
// --- Layout general de la app (sidebar + contenido) ---
import AppLayout from "../components/AppLayout";
// --- Sistema de notificaciones toast ---
import { useToast } from "../context/ToastContext";
// --- Cliente API de servicios (CRUD contra el backend) ---
import {
  createService,
  deleteService,
  listServices,
  updateService,
} from "../api/services";

import {
  Plus,
  Save,
  X,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  IndianRupee,
  FileText,
  Layers,
} from "lucide-react";
import { servicesPageStyles as s } from "../assets/dummyStyles";

/**
 * Mapa nombre-fichero -> imagen importada.
 * El backend guarda solo el string ("C1.png"), aquí se resuelve al asset real.
 * Si el servicio no tiene icono válido se usa "C1.png" por defecto.
 */
const ICON_MAP = {
  "C1.png": C1,
  "C2.png": C2,
  "C3.png": C3,
  "C4.png": C4,
  "C5.png": C5,
  "C6.png": C6,
  "C7.png": C7,
  "C8.png": C8,
};

/**
 * Resuelve la clave de icono a imagen importada con fallback seguro.
 * Si el backend devuelve un icono desconocido o vacío, usa C1.
 */
const resolveIcon = (iconName) => ICON_MAP[iconName] || C1;

/** Valores iniciales/limpios del formulario. Se reutiliza al cancelar y tras guardar. */
const emptyForm = {
  name: "",
  duration: 30, // minutos, coincide con una opción del <select>
  price: 0,
  description: "",
  icon: "C1.png", // clave de ICON_MAP
};

/**
 * Componente ServicesPage.
 * No recibe props: todo lo obtiene de la API y del contexto.
 */
export default function ServicesPage() {

  const [services, setServices] = useState([]);                      // Lista de servicios mostrada en la columna derecha. 
  const [form, setForm] = useState(emptyForm);                       // Formulario controlado (izquierda). Siempre tiene forma de `emptyForm`.
  const [editingId, setEditingId] = useState("");                    // Id en edición. Vacío = modo crear, con valor = modo editar.
  const [message, setMessage] = useState("");                        // Mensaje de error inline (solo se usa en la carga inicial).
  const [loading, setLoading] = useState(false);                     // true mientras se guarda (deshabilita el botón submit).
  const [deleteConfirm, setDeleteConfirm] = useState(null);          // Servicio seleccionado para eliminar. null = modal cerrado.


  const showToast = useToast();                                      // Función para mostrar toasts (success / error)

  /**
   * Normaliza y guarda la lista recibida del backend.
   * Protege contra `undefined` con `|| []` para que `.map` no falle.
   */
  const applyServices = (items) => {
    setServices(items || []);
  };

  /** Recarga la lista desde el backend. Se llama tras crear/editar/eliminar/toggle. */
  const loadServices = async () => {
    try {
      const { data } = await listServices();
      applyServices(data.services);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not load services");
    }
  };

  // --- Carga inicial: una sola vez al montar el componente ---
  // Reutiliza loadServices para no duplicar la lógica de fetch/error.
  useEffect(() => {
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Manejador genérico de inputs (text, number, select, textarea).
   * Usa `event.target.name` como clave del campo a actualizar.
   */
  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Guarda el formulario.
   * - Convierte duration/price a Number antes de enviar.
   * - Si hay `editingId` actualiza, si no crea.
   * - Limpia el form, muestra toast y recarga la lista.
   * - En error muestra toast de error y libera `loading` en `finally`.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const payload = {
        ...form,
        duration: Number(form.duration),
        price: Number(form.price),
      };

      if (editingId) {
        await updateService(editingId, payload);
      } else {
        await createService(payload);
      }

      setForm(emptyForm);
      setEditingId("");
      showToast(
        editingId
          ? "Service updated successfully"
          : "Service added successfully (created as Hidden — toggle to Active to publish)",
      );
      await loadServices();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Could not save services",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Alterna visibilidad del servicio (Activo <-> Oculto).
   * Solo envía `{ isActive }` al backend y luego recarga.
   * Con try/catch para que un fallo (404/red) muestre toast en vez de
   * quedar como promesa rechazada sin manejar.
   */
  const toggleService = async (service) => {
    try {
      await updateService(service._id, { isActive: !service.isActive });
      await loadServices();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Could not update service visibility",
        "error",
      );
    }
  };

  /** Entra en modo edición: guarda el id y precarga el form con ese servicio. */
  const startEditing = (service) => {
    setEditingId(service._id);
    setForm({
      name: service.name,
      duration: service.duration,
      price: service.price,
      description: service.description || "",
      // Valida contra ICON_MAP: si el icono guardado es desconocido, cae a C1.
      icon: ICON_MAP[service.icon] ? service.icon : "C1.png",
    });
    setMessage("");
  };

  /** Sale del modo edición y restaura el formulario vacío. */
  const cancelEditing = () => {
    setEditingId("");
    setForm(emptyForm);
    setMessage("");
  };

  /** Abre el modal de confirmación guardando el servicio a eliminar. */
  const confirmDelete = (service) => {
    setDeleteConfirm(service);
  };

  /**
   * Ejecuta la eliminación confirmada en el modal.
   * - Si se estaba editando ese mismo servicio, cancela la edición.
   * - Muestra toast, recarga lista y cierra el modal en `finally`.
   */
  const executeDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteService(deleteConfirm._id);
      if (editingId === deleteConfirm._id) cancelEditing();
      showToast("Service deleted successfully");
      await loadServices();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Could not delete service",
        "error",
      );
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <AppLayout>
      {/* Contenedor principal en 2 columnas: formulario (izq) + lista (der) */}
      <div className={s.mainGrid}>
        {/* ===== COLUMNA IZQUIERDA: encabezado + formulario crear/editar ===== */}
        <section>
          {/* Encabezado: título, subtítulo e ilustración */}
          <div className={s.headerRow}>
            <div>
              <p className={s.pageLabel}>Services</p>

              <h1 className={s.mainHeading}>
                Shape what customers can{" "}
                <span className={s.gradientText}>book.</span>
              </h1>

              <p className={s.subText}>
                Add each appointment type with a duration and price. Active
                services appear on your public booking page.
              </p>
            </div>

            <div className={s.illustrationContainer}>
              <img
                src={p6Image}
                alt="Illustration"
                className={s.illustrationImg}
              />
            </div>
          </div>

          {/* Formulario: cambia de título según modo crear/editar */}
          <form onSubmit={handleSubmit} className={s.formCard}>
            <h3 className={s.formTitle}>
              <Plus className={s.formTitleIcon} />
              {editingId ? "Edit service" : "Add new service"}
            </h3>

            <div className={s.formGrid}>
              {/* Campo: nombre del servicio */}
              <label className={s.inputLabel}>
                Service name
                <div className={s.inputWrapper}>
                  <Layers className={s.inputIcon} />
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className={s.textInput}
                    placeholder="Consultation"
                  />
                </div>
              </label>

              {/* Campos: duración (select fijo) + precio (number) */}
              <div className={s.durationPriceGrid}>
                <label className={s.inputLabel}>
                  Duration
                  <div className={s.inputWrapper}>
                    <Clock className={s.inputIcon} />
                    <select
                      name="duration"
                      value={form.duration}
                      onChange={handleChange}
                      className={s.selectInput}
                    >
                      {[15, 30, 45, 60, 90, 120].map((value) => (
                        <option key={value} value={value}>
                          {value} minutes
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className={s.inputLabel}>
                  Price
                  <div className={s.inputWrapper}>
                    <IndianRupee className={s.inputIcon} />
                    <input
                      name="price"
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={handleChange}
                      className={s.priceInput}
                    />
                  </div>
                </label>
              </div>

              {/* Campo: descripción visible para el cliente */}
              <label className={s.inputLabel}>
                Description
                <div className={s.textareaWrapper}>
                  <FileText className={s.textareaIcon} />
                  <textarea
                    name="description"
                    rows={3}
                    value={form.description}
                    onChange={handleChange}
                    className={s.textareaInput}
                    placeholder="A short customer-facing description"
                  />
                </div>
              </label>

              {/* Selector visual de icono: guarda la clave ("C1.png") en form.icon */}
              <label className={s.inputLabel}>
                Service Icon
                <div className={s.iconGrid}>
                  {Object.keys(ICON_MAP).map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, icon: iconName }))
                      }
                      className={
                        form.icon === iconName
                          ? s.iconBtnActive
                          : s.iconBtnInactive
                      }
                    >
                      <img
                        src={ICON_MAP[iconName]}
                        alt="Service Icon"
                        className={s.iconImg}
                      />
                    </button>
                  ))}
                </div>
              </label>
            </div>

            {/* Acciones: guardar (bloqueado si loading) + cancelar (solo editando) */}
            <div className={s.formActions}>
              <button
                type="submit"
                disabled={loading}
                className={s.submitButton}
              >
                <Save className={s.submitIcon} />
                {loading
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Add service"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className={s.cancelButton}
                >
                  <X className={s.cancelIcon} />
                  Cancel
                </button>
              )}
            </div>

            {/* Error inline de carga/guardado (cuando `message` no está vacío) */}
            {message && <p className={s.message}>{message}</p>}
          </form>
        </section>

        {/* ===== COLUMNA DERECHA: lista de servicios ===== */}
        <section className={s.rightSection}>
          <h2 className={s.rightTitle}>
            <Layers className={s.rightTitleIcon} />
            Your services
          </h2>
          <div className={s.serviceList}>
            {/* Estado vacío: se muestra solo si no hay servicios */}
            {services.length === 0 && (
              <div className={s.emptyState}>
                <Layers className={s.emptyIcon} />
                <p className={s.emptyText}>No services yet.</p>
              </div>
            )}

            {/* Una tarjeta por servicio: icono, nombre, duración/precio, descripción */}
            {services.map((service) => (
              <article key={service._id} className={s.serviceCard}>
                <div className={s.serviceCardInner}>
                  <div className={s.serviceInfoRow}>
                    {/* Icono resuelto vía resolveIcon con fallback seguro a C1 */}
                    <div className={s.serviceIconContainer}>
                      <img
                        src={resolveIcon(service.icon)}
                        alt={service.name}
                        className={s.serviceIconImg}
                      />
                    </div>
                    <div className={s.serviceTextBlock}>
                      <h3 className={s.serviceName}>{service.name}</h3>
                      <p className={s.serviceDetail}>
                        {service.duration} min · ₹
                        {Number(service.price).toLocaleString()}
                      </p>
                      {service.description && (
                        <p className={s.serviceDesc}>{service.description}</p>
                      )}
                    </div>
                  </div>
                  {/* Acciones por tarjeta: visibilidad, editar, eliminar */}
                  <div className={s.serviceActions}>
                    <button
                      type="button"
                      onClick={() => toggleService(service)}
                      className={
                        service.isActive
                          ? s.visibilityBadgeActive
                          : s.visibilityBadgeInactive
                      }
                    >
                      {service.isActive ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                      {service.isActive ? "Active" : "Hidden"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing(service)}
                      className={s.editButton}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(service)}
                      className={s.deleteButton}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* ===== Modal de confirmación de borrado (solo si deleteConfirm != null) ===== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Delete Service
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-700">
                  {deleteConfirm.name}
                </span>
                ? Existing bookings will remain, but customers will no longer be
                able to book this service. This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                {/* Cierra el modal sin borrar */}
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                {/* Confirma y ejecuta el borrado */}
                <button
                  type="button"
                  onClick={executeDelete}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Delete Service
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
