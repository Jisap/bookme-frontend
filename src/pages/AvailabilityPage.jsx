import { useEffect, useMemo, useState } from "react";
import p5Image from "../assets/P5.png";
import AppLayout from "../components/AppLayout";
import { useToast } from "../context/ToastContext";
import { listAvailability, saveAvailability } from "../api/availability";
import {
  CalendarDays,
  Sun,
  Plus,
  Trash2,
  Save,
  Clock,
  BadgeCheck,
  Sparkles,
} from "lucide-react";
import { availabilityPageStyles as s } from "../assets/dummyStyles";

// -----------------------------------------------------------------------------
// CONSTANTES Y DATOS ESTÁTICOS
// -----------------------------------------------------------------------------

// Lista de días de la semana. El índice coincide con el valor de `dayOfWeek` (0 = Domingo).
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Iconos asociados a cada día (usando el icono de sol para el fin de semana).
const dayIcons = [
  Sun,
  CalendarDays,
  CalendarDays,
  CalendarDays,
  CalendarDays,
  CalendarDays,
  Sun,
];

// Estructura por defecto para un nuevo slot de tiempo (9:00 AM a 5:00 PM).
export const defaultSlot = { startTime: "09:00", endTime: "17:00" };

export const isSlotOverlapping = (slots, newSlot, ignoreIndex = -1) =>
  slots.some(
    (slot, i) =>
      i !== ignoreIndex &&
      slot.startTime < newSlot.endTime &&
      newSlot.startTime < slot.endTime
  );

export const getSlotsForDay = (items, day) => {
  const dayAvailability = items.find((item) => item.dayOfWeek === day);
  return dayAvailability?.slots?.length
    ? dayAvailability.slots
    : [defaultSlot];
};

export const formatTime = (time24) => {
  if (!time24) return "";
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${m} ${ampm}`;
};

// -----------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// -----------------------------------------------------------------------------

export default function AvailabilityPage() {
  // --- ESTADO PRINCIPAL ---
  // Array completo de disponibilidad recibida del backend (todos los días).
  const [availability, setAvailability] = useState([]);

  // Índice del día seleccionado actualmente (0-6). Por defecto, Lunes (1).
  const [selectedDay, setSelectedDay] = useState(1);

  // Array de slots de tiempo para el día seleccionado actualmente.
  // Este es el estado "local" que el usuario edita antes de guardar.
  const [slots, setSlots] = useState([defaultSlot]);

  // Estados para feedback y carga.
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const showToast = useToast();

  // ---------------------------------------------------------------------------
  // FUNCIONES AUXILIARES (HELPERS) - wrappers locales que usan los exports testeables
  // ---------------------------------------------------------------------------

  /**
   * Busca los slots guardados para un día específico.
   * Si no hay slots guardados, devuelve el slot por defecto.
   */
  const getSlotsForDays = (items, day) => getSlotsForDay(items, day);

  // ---------------------------------------------------------------------------
  // ESTADO DERIVADO Y EFECTOS
  // ---------------------------------------------------------------------------

  // Calcula el resumen del día seleccionado para mostrar en la UI (ej. "3 saved time windows").
  const currentDaySummary = useMemo(
    () => availability.find((item) => item.dayOfWeek === selectedDay),
    [availability, selectedDay]
  );

  /**
   * Carga la disponibilidad inicial o actualiza los slots cuando el usuario cambia de día.
   * Al cambiar `selectedDay`, sincronizamos el estado local `slots` con los datos del backend.
   */
  useEffect(() => {
    const loadInitialAvailability = async () => {
      try {
        const { data } = await listAvailability();
        const items = data.availability || [];
        setAvailability(items);

        // Sincroniza los slots locales con el día recién seleccionado.
        setSlots(getSlotsForDays(items, selectedDay));
      } catch (error) {
        setMessage(
          error.response?.data?.message || "Could not load availability"
        );
      }
    };

    loadInitialAvailability();
  }, [selectedDay]); // Se re-ejecuta cada vez que cambia el día seleccionado.

  // ---------------------------------------------------------------------------
  // MANEJADORES DE EVENTOS (HANDLERS)
  // ---------------------------------------------------------------------------

  /**
   * Actualiza un slot específico y valida que no haya errores de tiempo.
   * - Ajusta automáticamente la hora de fin si es menor o igual a la de inicio.
   * - Detecta y previene solapamientos (overlaps) con otros slots del mismo día.
   */
  const updateSlot = (index, field, value) => {
    let newSlot = { ...slots[index], [field]: value };

    // 1. VALIDACIÓN: Asegurar que la hora de inicio sea menor que la de fin.
    // Si el usuario pone una hora de inicio mayor, ajustamos la hora de fin automáticamente.
    if (newSlot.startTime >= newSlot.endTime) {
      if (field === "startTime") {
        const [h, m] = newSlot.startTime.split(":");
        let nextH = Math.min(23, parseInt(h, 10) + 1);
        newSlot.endTime = `${String(nextH).padStart(2, "0")}:${m}`;
      } else {
        const [h, m] = newSlot.endTime.split(":");
        let prevH = Math.max(0, parseInt(h, 10) - 1);
        newSlot.startTime = `${String(prevH).padStart(2, "0")}:${m}`;
      }
    }

    // 2. VALIDACIÓN: Detectar solapamientos (Overlaps).
    // Comparamos el nuevo slot contra todos los demás.
    // NOTA: La comparación de strings de hora ("HH:MM") funciona perfectamente aquí
    // porque el formato de 24h es lexicográficamente ordenable.
    const isOverlapping = isSlotOverlapping(slots, newSlot, index);

    if (isOverlapping) {
      showToast("Overlap detected: Time falls within an existing slot.", "error");
      return; // Cancelamos la actualización si hay solapamiento.
    }

    // 3. ACTUALIZACIÓN: Si todo es correcto, actualizamos el estado.
    setSlots((prev) =>
      prev.map((slot, slotIndex) => (slotIndex === index ? newSlot : slot))
    );
  };

  /**
   * Añade un nuevo slot de tiempo basándose en la hora de fin del último slot existente.
   */
  const addSlot = () => {
    if (slots.length === 0) {
      setSlots([defaultSlot]);
      return;
    }

    // Ordenamos los slots por hora de fin para encontrar el último del día.
    const sorted = [...slots].sort((a, b) => a.endTime.localeCompare(b.endTime));
    const latest = sorted[sorted.length - 1];

    const [h, m] = latest.endTime.split(":");
    let startH = parseInt(h, 10);

    // Validación: No permitir añadir slots si ya hemos llegado al final del día (23:00).
    if (startH >= 23) {
      showToast("Cannot add slot: No more hours available.", "error");
      return;
    }

    let endH = startH + 1;

    const newStart = `${String(startH).padStart(2, "0")}:${m}`;
    const newEnd = `${String(endH).padStart(2, "0")}:${m}`;

    setSlots((prev) => [...prev, { startTime: newStart, endTime: newEnd }]);
  };

  /**
   * Elimina un slot por su índice.
   */
  const removeSlot = (index) => {
    setSlots((prev) => prev.filter((_, slotIndex) => slotIndex !== index));
  };

  /**
   * Guarda los slots del día seleccionado en el backend.
   */
  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    try {
      const { data } = await saveAvailability({
        dayOfWeek: selectedDay,
        slots,
      });

      // Actualizamos el estado global `availability` reemplazando el día guardado
      // y ordenando el array por día de la semana para mantener la consistencia.
      setAvailability((prev) => {
        const withoutDay = prev.filter((item) => item.dayOfWeek !== selectedDay);
        return [...withoutDay, data.availability].sort(
          (a, b) => a.dayOfWeek - b.dayOfWeek
        );
      });

      showToast("Availability saved", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Could not save availability",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDERIZADO (JSX)
  // ---------------------------------------------------------------------------

  return (
    <AppLayout>
      <div className={s.mainGrid}>

        {/* =========================================================================
            COLUMNA IZQUIERDA: Selector de días de la semana
            ========================================================================= */}
        <section>
          <div className={s.leftTopArea}>
            <div>
              <p className={s.availabilityLabel}>Availability</p>

              <h1 className={s.mainHeading}>
                Set the hours customers can{" "}
                <span className={s.gradientText}>choose.</span>
              </h1>

              <p className={s.subText}>
                Keep it simple: select a weekday, add one or more time windows,
                then save.
              </p>
            </div>

            <div className={s.illustrationContainer}>
              <img src={p5Image} className={s.illustrationImg} alt="Availability illustration" />
            </div>
          </div>

          {/* Lista de botones para seleccionar el día */}
          <div className={s.dayListContainer}>
            {days.map((day, index) => {
              const Icon = dayIcons[index];
              const isSelected = selectedDay === index;

              // Verifica si el día ya tiene slots guardados para mostrar el indicador visual.
              const hasSaved = availability.some(
                (item) => item.dayOfWeek === index && item.slots?.length > 0
              );

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setSelectedDay(index);
                    // Al cambiar de día, cargamos inmediatamente sus slots en el estado local.
                    setSlots(getSlotsForDays(availability, index));
                  }}
                  className={isSelected ? s.dayButtonActive : s.dayButtonInactive}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={
                        isSelected
                          ? s.dayIconContainerActive
                          : s.dayIconContainerInactive
                      }
                    >
                      <Icon className={s.dayIcon} />
                    </div>

                    <span
                      className={isSelected ? s.dayLabelActive : s.dayLabelInactive}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Indicador de "día configurado" (Check) */}
                  {isSelected ? (
                    <div className={s.dayCheckActiveContainer}>
                      <BadgeCheck className={s.dayCheckActiveIcon} />
                    </div>
                  ) : (
                    <div className={s.dayIconContainerInactive} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Caja informativa */}
          <div className={s.infoBox}>
            <Clock className={s.infoBoxIcon} />
            <p className={s.infoBoxText}>
              Customers will only see{" "}
              <span className={s.infoBoxStrong}>available days</span> and times
              when booking.
            </p>
          </div>
        </section>

        {/* =========================================================================
            COLUMNA DERECHA: Edición de slots de tiempo para el día seleccionado
            ========================================================================= */}
        <section className={s.rightSection}>

          {/* Cabecera de la sección de slots */}
          <div className={s.rightTopBar}>
            <div className={s.rightTopLeft}>
              <div className={s.rightTopIconContainer}>
                <CalendarDays className={s.rightTopCalendarIcon} />
              </div>

              <div>
                <h2 className={s.rightDayName}>{days[selectedDay]}</h2>
                <p className={s.rightSummaryText}>
                  {currentDaySummary?.slots?.length || 0} saved time{" "}
                  {currentDaySummary?.slots?.length === 1 ? "window" : "windows"}
                </p>
              </div>
            </div>

            <button type="button" onClick={addSlot} className={s.addWindowButton}>
              <Plus className={s.addWindowIcon} />
              Add window
            </button>
          </div>

          {/* Lista de tarjetas de slots editables */}
          <div className={s.slotsContainer}>
            {slots.map((slot, index) => (
              <div key={`${index}-${slot.startTime}`} className={s.slotCard}>
                <div className={s.slotGrid}>
                  {/* Input de Hora de Inicio */}
                  <label className={s.slotLabel}>
                    Start
                    <div className={s.timeInputContainer}>
                      <Clock className={s.timeInputClockIcon} />
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(event) =>
                          updateSlot(index, "startTime", event.target.value)
                        }
                        className={s.timeInput}
                      />
                    </div>
                  </label>

                  {/* Input de Hora de Fin */}
                  <label className={s.slotLabel}>
                    End
                    <div className={s.timeInputContainer}>
                      <Clock className={s.timeInputClockIcon} />
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(event) =>
                          updateSlot(index, "endTime", event.target.value)
                        }
                        className={s.timeInput}
                      />
                    </div>
                  </label>

                  {/* Botón para eliminar el slot */}
                  <button
                    type="button"
                    onClick={() => removeSlot(index)}
                    className={s.removeSlotButton}
                  >
                    <Trash2 className={s.removeSlotIcon} />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Botón secundario para añadir más slots (estilo dashed) */}
          <button type="button" onClick={addSlot} className={s.dashedAddButton}>
            <Plus className={s.dashedAddIcon} />
            Add another time window
          </button>

          {/* Botón principal de guardado */}
          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className={s.saveButton}
          >
            <Save className={s.saveIcon} />
            {loading ? "Saving..." : "Save availability"}
          </button>

          {/* Mensaje de error/éxito (fallback si el toast no es suficiente) */}
          {message && <p className={s.message}>{message}</p>}
        </section>
      </div>
    </AppLayout>
  );
}