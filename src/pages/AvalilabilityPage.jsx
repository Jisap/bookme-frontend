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

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const dayIcons = [
  Sun,
  CalendarDays,
  CalendarDays,
  CalendarDays,
  CalendarDays,
  CalendarDays,
  Sun,
];

const defaultSlot = { startTime: "09:00", endTime: "17:00" };

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [slots, setSlots] = useState([defaultSlot]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const showToast = useToast();

  const getSlotsForDays = (items, day) => {
    const dayAvailability = items.find((item) => item.dayOfWeek === day);
    return dayAvailability?.slots?.length
      ? dayAvailability.slots
      : [defaultSlot];
  };

  const currentDaySummary = useMemo(
    () => availability.find((item) => item.dayOfWeek === selectedDay),
    [availability, selectedDay],
  );

  useEffect(() => {
    const loadInitialAvailability = async () => {
      try {
        const { data } = await listAvailability();
        const items = data.availability || [];
        setAvailability(items);
        setSlots(getSlotsForDays(items, selectedDay));
      } catch (error) {
        setMessage(
          error.response?.data?.message || "Could not load availability",
        );
      }
    };

    loadInitialAvailability();
  }, [selectedDay]);
  const updateSlot = (index, field, value) => {
    let newSlot = { ...slots[index], [field]: value };

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

    const isOverlapping = slots.some((slot, i) => {
      if (i === index) return false;
      return (
        slot.startTime < newSlot.endTime && newSlot.startTime < slot.endTime
      );
    });

    if (isOverlapping) {
      showToast(
        "Overlap detected: Time falls within an existing slot.",
        "error",
      );
      return;
    }

    setSlots((prev) =>
      prev.map((slot, slotIndex) => (slotIndex === index ? newSlot : slot)),
    );
  };

  const addSlot = () => {
    if (slots.length === 0) {
      setSlots([defaultSlot]);
      return;
    }

    const sorted = [...slots].sort((a, b) =>
      a.endTime.localeCompare(b.endTime),
    );
    const latest = sorted[sorted.length - 1];

    const [h, m] = latest.endTime.split(":");
    let startH = parseInt(h, 10);

    if (startH >= 23) {
      showToast("Cannot add slot: No more hours available.", "error");
      return;
    }
    let endH = startH + 1;

    const newStart = `${String(startH).padStart(2, "0")}:${m}`;
    const newEnd = `${String(endH).padStart(2, "0")}:${m}`;

    setSlots((prev) => [...prev, { startTime: newStart, endTime: newEnd }]);
  };

  const removeSlot = (index) => {
    setSlots((prev) => prev.filter((_, slotIndex) => slotIndex !== index));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    try {
      const { data } = await saveAvailability({
        dayOfWeek: selectedDay,
        slots,
      });
      setAvailability((prev) => {
        const withoutDay = prev.filter(
          (item) => item.dayOfWeek !== selectedDay,
        );
        return [...withoutDay, data.availability].sort(
          (a, b) => a.dayOfWeek - b.dayOfWeek,
        );
      });
      showToast("Availability saved");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Could not save availability",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${String(displayHour).padStart(2, "0")}:${m} ${ampm}`;
  };
  return (
    <AppLayout>
      <div className={s.mainGrid}>
        {/* Left day selector */}
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
              <img src={p5Image} className={s.illustrationImg} />
            </div>
          </div>

          <div className={s.dayListContainer}>
            {days.map((day, index) => {
              const Icon = dayIcons[index];
              const isSelected = selectedDay === index;
              const hasSaved = availability.some(
                (item) => item.dayOfWeek === index && item.slots?.length > 0,
              );
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setSelectedDay(index);
                    setSlots(getSlotsForDays(availability, index));
                  }}
                  className={
                    isSelected ? s.dayButtonActive : s.dayButtonInactive
                  }
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
                      className={
                        isSelected ? s.dayLabelActive : s.dayLabelInactive
                      }
                    >
                      {day}
                    </span>
                  </div>

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

          <div className={s.infoBox}>
            <Clock className={s.infoBoxIcon} />
            <p className={s.infoBoxText}>
              Customers will only see{" "}
              <span className={s.infoBoxStrong}>available days</span> and times
              when booking.
            </p>
          </div>
        </section>

        {/* Right time slots */}
        <section className={s.rightSection}>
          <div className={s.rightTopBar}>
            <div className={s.rightTopLeft}>
              <div className={s.rightTopIconContainer}>
                <CalendarDays className={s.rightTopCalendarIcon} />
              </div>
              <div>
                <h2 className={s.rightDayName}>{days[selectedDay]}</h2>
                <p className={s.rightSummaryText}>
                  {currentDaySummary?.slots?.length || 0} saved time{" "}
                  {currentDaySummary?.slots?.length === 1
                    ? "window"
                    : "windows"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={addSlot}
              className={s.addWindowButton}
            >
              <Plus className={s.addWindowIcon} />
              Add window
            </button>
          </div>

          <div className={s.slotsContainer}>
            {slots.map((slot, index) => (
              <div key={`${index}-${slot.startTime}`} className={s.slotCard}>
                <div className={s.slotGrid}>
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

          <button type="button" onClick={addSlot} className={s.dashedAddButton}>
            <Plus className={s.dashedAddIcon} />
            Add another time window
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className={s.saveButton}
          >
            <Save className={s.saveIcon} />
            {loading ? "Saving..." : "Save availability"}
          </button>

          {message && <p className={s.message}>{message}</p>}
        </section>
      </div>
    </AppLayout>
  );
}