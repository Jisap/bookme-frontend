import { useEffect, useState } from "react";
import p7Image from "../assets/P7.png";
import AppLayout from "../components/AppLayout";
import {
  listBookings,
  rescheduleBooking,
  updateBookingStatus,
} from "../api/bookings";
import {
  CalendarDays,
  Clock,
  BadgeCheck,
  XCircle,
  CreditCard,
  ExternalLink,
  Filter,
  MoreVertical,
  Plus,
  Calendar,
  Info,
  Trash2,
  RefreshCcw,
  Check,
} from "lucide-react";
import A1 from "../assets/avatars/A1.png";
import A2 from "../assets/avatars/A2.png";
import A3 from "../assets/avatars/A3.png";
import A4 from "../assets/avatars/A4.png";
import A5 from "../assets/avatars/A5.png";
import A6 from "../assets/avatars/A6.png";
import A7 from "../assets/avatars/A7.png";
import A8 from "../assets/avatars/A8.png";
import A9 from "../assets/avatars/A9.png";
import A10 from "../assets/avatars/A10.png";
import A11 from "../assets/avatars/A11.png";
import A12 from "../assets/avatars/A12.png";
import A13 from "../assets/avatars/A13.png";
import A15 from "../assets/avatars/A15.png";
import A16 from "../assets/avatars/A16.png";
import { bookingsPageStyles as s } from "../assets/dummyStyles";

const AVATAR_MAP = {
  "A1.png": A1,
  "A2.png": A2,
  "A3.png": A3,
  "A4.png": A4,
  "A5.png": A5,
  "A6.png": A6,
  "A7.png": A7,
  "A8.png": A8,
  "A9.png": A9,
  "A10.png": A10,
  "A11.png": A11,
  "A12.png": A12,
  "A13.png": A13,
  "A15.png": A15,
  "A16.png": A16,
};

const statuses = ["", "confirmed", "rescheduled", "cancelled"];

export default function BookingPage() {
  const [bookings, setBookings] = useState([]);
  const [filters, setFilters] = useState({ date: "", status: "" });
  const [message, setMessage] = useState("");
  const [reschedules, setReschedules] = useState({});
  const [cancelModalBookingId, setCancelModalBookingId] = useState(null);
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState(null);

  const formatTimestamp = (value) => {
    if (!value) return "Not available";
    return new Intl.DateTimeFormat("en-In", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  };

  const fetchBookings = async (nextFilters) => {
    try {
      const params = {};
      if (nextFilters.date) params.date = nextFilters.date;
      if (nextFilters.status) params.status = nextFilters.status;

      const { data } = await listBookings(params);
      setBookings(data.bookings || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could Not Load Bookings");
    }
  };

  const loadBookings = () => fetchBookings(filters);

  useEffect(() => {
    const loadFilteredBookings = async () => {
      await fetchBookings(filters);
    };

    loadFilteredBookings();
  }, [filters]);

  const setStatus = async (bookings, status) => {
    await updateBookingStatus(bookings._id, status);
    loadBookings();
  };

  const updateRecheduleDraft = (booking, key, value) => {
    setReschedules((prev) => ({
      ...prev,
      [booking._id]: {
        date: booking.date,
        startTime: booking.startTime,
        endtime: booking.endtime,
        ...prev[booking._id],
        [key]: value,
      },
    }));
  };

  const submitReschedule = async (booking) => {
    const draft = {
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      ...reschedules[booking._id],
    };

    try {
      const { data } = await rescheduleBooking(booking._id, draft);
      setMessage(
        data.email?.skipped
          ? `Booking rescheduled, but email was skipped: ${data.email.reason}`
          : "Booking rescheduled. Customer notification and calendar update were triggered.",
      );
      setReschedules((prev) => ({ ...prev, [booking._id]: undefined }));
      loadBookings();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not reschedule booking",
      );
    }
  };

  const getBannerVariant = (msg) =>
    msg.toLowerCase().includes("triggered") ||
      msg.toLowerCase().includes("success")
      ? s.messageBannerSuccess
      : s.messageBannerInfo;

  return (
    <AppLayout>
      <section className={s.headerSection}>
        <div className={s.headerLeftArea}>
          <div>
            <p className={s.bookingLabel}>Bookings</p>
            <h1 className={s.mainHeading}>
              Manage customer{" "}
              <span className={s.mainHeadingGradient}>appointments</span>
            </h1>
            <p className={s.subText}>
              Review payments, calendar sync, and appointment status from one
              calm workspace.
            </p>
          </div>
          <div className={s.illustrationContainer}>
            <img src={p7Image} className={s.illustrationImg} />
          </div>
        </div>

        <div className={s.filterRow}>
          <div className={s.filterDateContainer}>
            <CalendarDays className={s.filterIcon} />
            <input
              type="date"
              value={filters.date}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, date: event.target.value }))
              }
              className={s.filterDateInput}
              placeholder="Select Date"
            />
          </div>
          <div className={s.filterStatusContainer}>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
              className={s.filterStatusSelect}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status ? status.replace("_", " ") : "All Statuses"}
                </option>
              ))}
            </select>
            <Filter className={s.filterSelectIcon} />
          </div>
        </div>
      </section>

      {message && (
        <div className={`${s.messageBanner} ${getBannerVariant(message)}`}>
          <Info className="w-4 h-4" />
          {message}
        </div>
      )}

      {/* Booking cards */}
      <section className={s.bookingListSection}>
        {bookings.length === 0 && (
          <div className={s.emptyStateContainer}>
            <CalendarDays className={s.emptyStateIcon} />
            <p className={s.emptyStateText}>No bookings match these filters.</p>
          </div>
        )}

        {bookings.map((booking) => (
          <article key={booking._id} className={s.cardContainer}>
            <div className={s.cardInnerLayout}>
              {/* Left: booking info */}
              <div className={s.cardLeftBlock}>
                <div className={s.badgesContainer}>
                  <span
                    className={`${s.statusBadgeBase} ${s.statusBadgeClassMap[booking.status] || s.statusBadgeClassMap.default}`}
                  >
                    <Check className={s.badgeIcon} />
                    {booking.status.replace("_", " ")}
                  </span>
                  <span
                    className={`${s.paymentBadgeBase} ${s.paymentBadgeClassMap[booking.paymentStatus] || s.paymentBadgeClassMap.default}`}
                  >
                    <CreditCard className={s.badgeIcon} />
                    Payment:{" "}
                    {booking.paymentStatus?.replace("_", " ") || "Not Required"}
                  </span>
                  {booking.rescheduleCount > 0 && (
                    <span
                      className={`${s.paymentBadgeBase} bg-orange-100 text-orange-700 ml-2`}
                    >
                      <RefreshCcw className={s.badgeIcon} />
                      Rescheduled ({booking.rescheduleCount})
                    </span>
                  )}
                </div>

                <div className={s.customerInfoRow}>
                  <div className={s.customerAvatarContainer}>
                    <img
                      src={AVATAR_MAP[booking.customerAvatar || "A1.png"]}
                      alt={booking.customerName}
                      className={s.customerAvatarImg}
                    />
                  </div>
                  <div>
                    <h2 className={s.customerName}>{booking.customerName}</h2>
                    <p className={s.customerEmail}>{booking.customerEmail}</p>
                  </div>
                </div>

                <div className={s.bookingDetailsRow}>
                  <div className={s.bookingDetailsIconContainer}>
                    <CalendarDays className={s.bookingDetailsIcon} />
                  </div>
                  <div className={s.bookingDetailsTextContainer}>
                    <p className={s.bookingDateTimeText}>
                      {booking.date} • {booking.startTime} - {booking.endTime}
                    </p>
                    <div className={s.bookingServiceRow}>
                      <div className={s.bookingServiceDot}></div>
                      <p className={s.bookingServiceText}>
                        {booking.serviceId?.name || "Meeting"}
                        {booking.notes ? ` • ${booking.notes}` : " • GGH"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={s.timestampsContainer}>
                  <span className={s.timestampSpan}>
                    <Clock className={s.timestampIcon} />
                    Created: {formatTimestamp(booking.createdAt)}
                  </span>
                  <span className={s.timestampSpan}>
                    <RefreshCcw className={s.timestampIcon} />
                    Last updated: {formatTimestamp(booking.updatedAt)}
                  </span>
                </div>

                <div className={s.calendarSyncRow}>
                  <Calendar className={s.timestampIcon} />
                  Calendar:{" "}
                  {booking.googleEventId ? "Synced to Google" : "Not synced"}
                </div>

                {booking.customerCalendarUrl ? (
                  <a
                    href={booking.customerCalendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={s.calendarLinkButton}
                  >
                    Customer calendar link
                    <ExternalLink className={s.calendarLinkIcon} />
                  </a>
                ) : (
                  <span className={s.calendarLinkUnavailable}>
                    Calendar link unavailable
                    <ExternalLink className={s.calendarLinkIcon} />
                  </span>
                )}
              </div>

              {/* Right: action buttons */}
              <div className={s.cardRightBlock}>
                <div className={s.actionButtonsContainer}>
                  {booking.status !== "cancelled" &&
                    booking.status !== "payment_failed" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setRescheduleModalBooking(booking)}
                          className={s.rescheduleButton}
                        >
                          <CalendarDays className={s.actionIcon} />
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelModalBookingId(booking._id)}
                          className={s.cancelButton}
                        >
                          <XCircle className={s.actionIcon} />
                          Cancel
                        </button>
                      </>
                    )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Modals */}
      {cancelModalBookingId && (
        <div className={s.modalOverlay}>
          <div className={s.modalContent}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Cancel Booking</h2>
              <button
                onClick={() => setCancelModalBookingId(null)}
                className={s.modalCloseBtn}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className={s.modalBody}>
              <p className={s.modalMessage}>
                Are you sure you want to cancel this booking? This action cannot
                be undone, and the customer will be notified.
              </p>
            </div>
            <div className={s.modalFooter}>
              <button
                onClick={() => setCancelModalBookingId(null)}
                className={s.modalButtonSecondary}
              >
                Keep Booking
              </button>
              <button
                onClick={() => {
                  setStatus({ _id: cancelModalBookingId }, "cancelled");
                  setCancelModalBookingId(null);
                }}
                className={s.modalButtonDanger}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleModalBooking && (
        <div className={s.modalOverlay}>
          <div className={s.modalContent}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Reschedule Booking</h2>
              <button
                onClick={() => {
                  setRescheduleModalBooking(null);
                  setReschedules((prev) => ({
                    ...prev,
                    [rescheduleModalBooking._id]: undefined,
                  }));
                }}
                className={s.modalCloseBtn}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className={s.modalBody}>
              <div className={s.rescheduleGrid}>
                <div className={s.rescheduleInputContainer}>
                  <CalendarDays className={s.rescheduleInputIcon} />
                  <input
                    type="date"
                    value={
                      reschedules[rescheduleModalBooking._id]?.date ??
                      rescheduleModalBooking.date
                    }
                    onChange={(event) =>
                      updateRescheduleDraft(
                        rescheduleModalBooking,
                        "date",
                        event.target.value,
                      )
                    }
                    className={s.rescheduleInputField}
                  />
                </div>
                <div className={s.rescheduleInputContainer}>
                  <Clock className={s.rescheduleInputIcon} />
                  <input
                    type="time"
                    value={
                      reschedules[rescheduleModalBooking._id]?.startTime ??
                      rescheduleModalBooking.startTime
                    }
                    onChange={(event) =>
                      updateRescheduleDraft(
                        rescheduleModalBooking,
                        "startTime",
                        event.target.value,
                      )
                    }
                    className={s.rescheduleInputField}
                  />
                </div>
                <div className={s.rescheduleInputContainer}>
                  <Clock className={s.rescheduleInputIcon} />
                  <input
                    type="time"
                    value={
                      reschedules[rescheduleModalBooking._id]?.endTime ??
                      rescheduleModalBooking.endTime
                    }
                    onChange={(event) =>
                      updateRescheduleDraft(
                        rescheduleModalBooking,
                        "endTime",
                        event.target.value,
                      )
                    }
                    className={s.rescheduleInputField}
                  />
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button
                onClick={() => {
                  setRescheduleModalBooking(null);
                  setReschedules((prev) => ({
                    ...prev,
                    [rescheduleModalBooking._id]: undefined,
                  }));
                }}
                className={s.modalButtonSecondary}
              >
                Discard
              </button>
              <button
                onClick={() => {
                  submitReschedule(rescheduleModalBooking);
                  setRescheduleModalBooking(null);
                }}
                className={s.modalButtonPrimary}
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}