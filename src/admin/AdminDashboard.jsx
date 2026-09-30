import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAdminDashboard, updateWithdrawalStatus, adminLogout } from "../api/admin";
import {
  Users,
  Wallet,
  TrendingUp,
  DollarSign,
  Landmark,
  CheckCircle,
  XOctagon,
  Clock,
  UserCheck,
  ShieldCheck,
  CalendarCheck,
  X
} from "lucide-react";
import logo from "../assets/logo.png";
import { adminDashboardPageStyles as s } from "../assets/dummyStyles";

/**
 * Formatea un valor numérico expresado en céntimos (minor units) a moneda con formato local.
 * 
 * @param {number} amount - Monto en céntimos (ej. 50000 = 500.00).
 * @param {string} [currency] - Código ISO de moneda.
 * @returns {string} Cadena formateada (ej. "$500.00").
 */
const formatMoney = (amount = 0, currency) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(
    (amount || 0) / 100
  );

// Lista de posibles estados a los que se puede transicionar una solicitud de retiro
const withdrawalStatuses = ["processing", "paid", "rejected"];

// Estados terminales o finales: una vez alcanzados, la solicitud no puede modificarse más
const terminalWithdrawalStatuses = ["paid", "rejected"];

/**
 * Determina si el estado de un retiro ya es terminal/definitivo.
 * @param {string} status - Estado de la solicitud.
 * @returns {boolean}
 */
const isTerminalWithdrawalStatus = (status) =>
  terminalWithdrawalStatuses.includes(status);

/**
 * Convierte un texto a formato Capitalizado (primera letra mayúscula).
 * @param {string} status - Texto a formatear.
 * @returns {string}
 */
const formatStatusLabel = (status = "") =>
  status ? `${status.slice(0, 1).toUpperCase()}${status.slice(1)}` : "";

/**
 * Componente principal del Panel de Control de Administración (Admin Dashboard).
 * Permite visualizar métricas globales, listado de usuarios, solicitudes de retiros
 * con confirmación modal y las reservas pagadas más recientes.
 */
const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState(null);
  const [updatingWithdrawalId, setUpdatingWithdrawalId] = useState("");
  const [pendingWithdrawalAction, setPendingWithdrawalAction] = useState(null);

  /**
   * Maneja errores de autenticación (401/403) limpiando la sesión y redirigiendo al login.
   * @param {Object} error - Error de Axios.
   * @returns {boolean} true si fue un error de autenticación gestionado.
   */
  const handleAuthError = (error) => {
    if ([401, 403].includes(error.response?.status)) {
      adminLogout();
      navigate("/admin/login");
      return true;
    }
    return false;
  };

  // Auto-dismiss banner messages after 5 seconds
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => {
      setMessage(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [message]);

  // Cierra el modal con la tecla Escape
  useEffect(() => {
    if (!pendingWithdrawalAction) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !updatingWithdrawalId) {
        setPendingWithdrawalAction(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingWithdrawalAction, updatingWithdrawalId]);

  // Efecto para validar autenticación y cargar datos iniciales del panel
  useEffect(() => {
    if (!localStorage.getItem("adminToken")) {
      navigate("/admin/login");
      return undefined;
    }

    let isActive = true;

    getAdminDashboard()
      .then((response) => {
        if (isActive) {
          setDashboard(response.data);
        }
      })
      .catch((error) => {
        if (isActive) {
          if (handleAuthError(error)) return;
          setDashboard(null);
          setMessage({
            text: error.response?.data?.message || "Failed to load dashboard information.",
            type: "error",
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [navigate]);

  /**
   * Abre el modal de confirmación para cambiar el estado de un retiro.
   * @param {Object} withdrawal - Objeto con la información del retiro.
   * @param {'processing' | 'paid' | 'rejected'} status - Nuevo estado solicitado.
   */
  const requestWithdrawalStatusChange = (withdrawal, status) => {
    if (withdrawal.status === status || isTerminalWithdrawalStatus(withdrawal.status)) {
      return;
    }
    setPendingWithdrawalAction({ withdrawal, status });
  };

  /**
   * Cierra el modal de confirmación si no hay una actualización en curso.
   */
  const closeWithdrawalConfirm = () => {
    if (updatingWithdrawalId) return;
    setPendingWithdrawalAction(null);
  };

  /**
   * Ejecuta la petición al backend para actualizar el estado del retiro.
   */
  const changeWithdrawalStatus = async () => {
    if (!pendingWithdrawalAction) return;

    const { withdrawal, status } = pendingWithdrawalAction;
    setUpdatingWithdrawalId(withdrawal._id);

    try {
      const { data } = await updateWithdrawalStatus(withdrawal._id, { status });
      if (data?.withdrawal) {
        setDashboard((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            summary: data.summary || prev.summary,
            withdrawals: (prev.withdrawals || []).map((item) =>
              item._id === data.withdrawal._id ? data.withdrawal : item
            ),
          };
        });
      } else {
        // Si no viene data.withdrawal, recargar el dashboard completo
        getAdminDashboard()
          .then((res) => setDashboard(res.data))
          .catch(() => { });
      }

      setMessage({
        text: data?.message || `Withdrawal marked as ${formatStatusLabel(status)}`,
        type: "success",
      });
    } catch (error) {
      if (!handleAuthError(error)) {
        setMessage({
          text: error.response?.data?.message || "Could not update withdrawal status",
          type: "error",
        });
      }
    } finally {
      setUpdatingWithdrawalId("");
      setPendingWithdrawalAction(null);
    }
  };

  /**
   * Cierra la sesión de administración y redirige al inicio de sesión.
   */
  const logout = () => {
    adminLogout();
    navigate("/admin/login");
  };

  const summary = dashboard?.summary || {};
  const dashboardCurrency = summary.currency || "USD";
  const pendingWithdrawal = pendingWithdrawalAction?.withdrawal;
  const isConfirmingWithdrawal =
    Boolean(pendingWithdrawal && updatingWithdrawalId === pendingWithdrawal._id);
  const WithdrawalConfirmIcon =
    pendingWithdrawalAction?.status === "rejected" ? XOctagon : ShieldCheck;

  // Clases dinámicas basadas en los estilos del tema
  const getPayoutStatusClass = (isComplete) =>
    isComplete ? s.userPayoutReady : s.userPayoutPending;

  const getWithdrawalStatusClass = (status) =>
    s.withdrawalStatusColors?.[status] || s.withdrawalStatusDefault;

  const getBookingStatusClass = (status) =>
    s.bookingStatusColors?.[status] || s.bookingStatusDefault;

  // Configuración de tarjetas métricas (KPIs)
  const statCards = [
    {
      label: "Total Users",
      value: summary.users || 0,
      icon: Users,
      bg: s.statBg1,
      c: s.statColor1,
    },
    {
      label: "Paid Bookings",
      value: summary.paidBookings || 0,
      icon: CheckCircle,
      bg: s.statBg2,
      c: s.statColor2,
    },
    {
      label: "Gross Revenue",
      value: formatMoney(summary.grossRevenue, dashboardCurrency),
      icon: TrendingUp,
      bg: s.statBg3,
      c: s.statColor3,
    },
    {
      label: "Platform Fees",
      value: formatMoney(summary.platformFees, dashboardCurrency),
      icon: DollarSign,
      bg: s.statBg4,
      c: s.statColor4,
    },
    {
      label: "Provider Payouts",
      value: formatMoney(summary.providerPayouts, dashboardCurrency),
      icon: Wallet,
      bg: s.statBg5,
      c: s.statColor5,
    },
    {
      label: "Withdrawal Holds",
      value: formatMoney(summary.withdrawalHolds, dashboardCurrency),
      icon: Landmark,
      bg: s.statBg6,
      c: s.statColor6,
    },
  ];

  return (
    <div className={s.pageContainer}>
      {/* Barra de navegación superior (Header) */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.logoRow}>
            <img
              src={logo}
              alt="BookMe Logo"
              className={s.logoImg}
            />

            <span className={s.logoText}>
              Book<span className={s.logoAccent}>Me</span> Admin
            </span>
          </div>

          <div className={s.headerActions}>
            <Link to="/" className={s.clientAppLink}>
              Client App
            </Link>

            <button type="button" onClick={logout} className={s.logoutButton}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal del dashboard */}
      <main className={s.main}>
        {/* Sección Hero con títulos y banners de mensaje */}
        <section className={s.heroSection}>
          <div>
            <h1 className={s.heroTitle}>
              Platform <span className={s.heroTitleAccent}>Overview</span>
            </h1>

            <p className={s.heroSubtitle}>
              Platform metrics, user activity, and withdrawal management.
            </p>
          </div>

          <div className={s.adminAccessCard}>
            <div className={s.adminAccessIconWrap}>
              <ShieldCheck className={s.adminAccessIcon} />
            </div>
            <div>
              <p className={s.adminAccessTitle}>Admin Access Required</p>
              <p className={s.adminAccessText}>Restricted area · actions are logged</p>
            </div>
          </div>
        </section>

        {message && (
          <div
            role={message.type === "error" ? "alert" : "status"}
            className={message.type === "error" ? s.messageBannerError : s.messageBannerSuccess}
          >
            {message.text}
          </div>
        )}


        {/* Cuadrícula de Tarjetas Métricas (KPIs) */}
        <section className={s.statsGrid}>
          {statCards.map((stat) => (
            <div key={stat.label} className={s.statCard}>
              <div className={`${s.statIconContainer} ${stat.bg} ${stat.c}`}>
                <stat.icon className={s.statIcon} />
              </div>

              <div>
                <p className={s.statLabel}>{stat.label}</p>
                <p className={s.statValue}>{stat.value}</p>
              </div>
            </div>
          ))}
        </section>


        {/* Sección de Tablas: Usuarios Registrados y Solicitudes de Retiro */}
        <section className={s.tablesGrid}>
          {/* Tabla de Usuarios Registrados */}
          <div className={s.tableCard}>
            <div className={s.tableHeader}>
              <h2 className={s.tableTitle}>
                <UserCheck className={s.tableTitleIcon} /> Registered Providers
              </h2>
            </div>

            <div className={s.tableScrollContainer}>
              <table className={s.table}>
                <thead>
                  <tr className={s.tableHeadRow}>
                    <th className={s.th}>Business</th>
                    <th className={s.th}>Email</th>
                    <th className={s.th}>Booking Link</th>
                    <th className={s.th}>Status</th>
                  </tr>
                </thead>

                <tbody className={s.tbody}>
                  {(dashboard?.users || []).map((user) => (
                    <tr key={user._id} className={s.tr}>
                      <td className={s.td}>
                        <div className={s.userBusinessName}>
                          {user.businessName || user.name}
                        </div>
                      </td>
                      <td className={s.tdMuted}>{user.email}</td>
                      <td className={s.tdMuted}>{user.slug}</td>
                      <td className={s.td}>
                        <span
                          className={`${s.payoutStatusBadge} ${getPayoutStatusClass(
                            user.payoutDetails?.isComplete
                          )}`}
                        >
                          {user.payoutDetails?.isComplete ? "Ready" : "Pending Details"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {dashboard && dashboard.users?.length === 0 && (
                    <tr>
                      <td colSpan="4" className={s.emptyTableCell}>
                        No registered providers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tarjeta de Solicitudes de Retiro de Fondos */}
          <div className={s.withdrawalCard}>
            <div className={s.tableHeader}>
              <h2 className={s.tableTitle}>
                <Clock className={s.tableTitleIcon} /> Withdrawal Requests
              </h2>
            </div>

            <div className={s.withdrawalList}>
              {(dashboard?.withdrawals || []).map((withdrawal) => {
                const isWithdrawalLocked = isTerminalWithdrawalStatus(withdrawal.status);

                return (
                  <div key={withdrawal._id} className={s.withdrawalItem}>
                    <div className={s.withdrawalItemHeader}>
                      <div>
                        <p className={s.withdrawalProviderName}>
                          {withdrawal.userId?.businessName || withdrawal.userId?.name || "Provider"}
                        </p>

                        <p className={s.withdrawalProviderEmail}>
                          {withdrawal.userId?.email || "No email available"}
                        </p>
                      </div>

                      <div className={s.withdrawalAmountCol}>
                        <span className={s.withdrawalAmount}>
                          {formatMoney(withdrawal.amount, withdrawal.currency)}
                        </span>

                        <div className={s.withdrawalStatusWrap}>
                          <span
                            className={`${s.withdrawalStatusBadge} ${getWithdrawalStatusClass(
                              withdrawal.status
                            )}`}
                          >
                            {withdrawal.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Información de la cuenta de destino del pago (Snapshot) */}
                    <div className={s.withdrawalAccountInfo}>
                      <Landmark className={s.withdrawalAccountIcon} />
                      <span>
                        {withdrawal.payoutSnapshot?.bankName || "Bank Connection"}{" "}•{" "}
                        {withdrawal.payoutSnapshot?.accountLast4
                          ? `•••• ${withdrawal.payoutSnapshot?.accountLast4}`
                          : withdrawal.payoutSnapshot?.upiId || "No details"
                        }
                      </span>
                    </div>

                    {/* Botones de acción para cambiar de estado */}
                    <div className={s.withdrawalActions}>
                      {withdrawalStatuses.map((statusOption) => {
                        const isActive = withdrawal.status === statusOption;
                        const isUpdatingThisWithdrawal = updatingWithdrawalId === withdrawal._id;
                        const isDisabled = isWithdrawalLocked || isActive || Boolean(updatingWithdrawalId);

                        return (
                          <button
                            key={statusOption}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => requestWithdrawalStatusChange(withdrawal, statusOption)}
                            className={`${s.withdrawalActionBtn} ${isActive
                              ? s.withdrawalActionBtnActive
                              : s.withdrawalActionBtnInactive
                              }`}
                          >
                            {isUpdatingThisWithdrawal && pendingWithdrawalAction?.status === statusOption
                              ? "Updating..."
                              : formatStatusLabel(statusOption)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {dashboard && (!dashboard.withdrawals || dashboard.withdrawals.length === 0) && (
                <div className={s.emptyWithdrawals}>
                  <div className={s.emptyWithdrawalsIconCircle}>
                    <Clock className={s.emptyWithdrawalsIcon} />
                  </div>
                  <p className={s.emptyWithdrawalsText}>No withdrawal requests at this moment.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Sección de Reservas Pagadas Recientes - siempre visible, incluso sin registros */}
        <section className={s.recentBookingsCard}>
            <div className={s.tableHeader}>
              <h2 className={s.tableTitle}>
                <CalendarCheck className={s.tableTitleIcon} /> Recent Paid Bookings
              </h2>
            </div>

            <div className={s.tableScrollContainer}>
              <table className={s.table}>
                <thead>
                  <tr className={s.tableHeadRow}>
                    <th className={s.th}>Customer</th>
                    <th className={s.th}>Provider</th>
                    <th className={s.th}>Service</th>
                    <th className={s.th}>Date & Time</th>
                    <th className={s.th}>Gross</th>
                    <th className={s.th}>Fees</th>
                    <th className={s.th}>Provider Share</th>
                    <th className={s.th}>Status</th>
                  </tr>
                </thead>
                <tbody className={s.tbody}>
                  {(dashboard?.recentBookings || []).map((booking) => (
                    <tr key={booking._id} className={s.tr}>
                      <td className={s.td}>
                        <div className={s.customerName}>
                          {booking.customerName}
                        </div>
                        <div className={s.customerEmail}>{booking.customerEmail}</div>
                      </td>
                      <td className={s.tdMuted}>
                        {booking.userId?.businessName || booking.userId?.name || "Provider"}
                      </td>
                      <td className={s.tdBold}>{booking.serviceId?.name || "Service"}</td>
                      <td className={s.tdMuted}>
                        {booking.date} · {booking.startTime} - {booking.endTime}
                      </td>
                      <td className={s.tdBold}>{formatMoney(booking.amount, booking.currency)}</td>
                      <td className={s.tdFees}>
                        {formatMoney(booking.platformFeeAmount, booking.currency)}
                      </td>
                      <td className={s.tdEarnings}>
                        {formatMoney(booking.providerPayoutAmount, booking.currency)}
                      </td>
                      <td className={s.td}>
                        <span
                          className={`${s.bookingStatusBadge} ${getBookingStatusClass(
                            booking.status
                          )}`}
                        >
                          {booking.status ? booking.status.replace(/_/g, " ") : "confirmed"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {dashboard && (!dashboard.recentBookings || dashboard.recentBookings.length === 0) && (
                    <tr>
                      <td colSpan="8" className={s.emptyTableCell}>
                        No paid bookings found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </section>
      </main>

      {/* Modal de Confirmación para Cambio de Estado de Retiro */}
      {pendingWithdrawalAction && (
        <div className={s.confirmModalOverlay} onClick={closeWithdrawalConfirm}>
          <div
            className={s.confirmModal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            <div className={s.confirmModalIconRow}>
              <div className={s.confirmModalIconWrap}>
                <WithdrawalConfirmIcon className={s.confirmModalIcon} />
              </div>
              <button
                type="button"
                onClick={closeWithdrawalConfirm}
                disabled={isConfirmingWithdrawal}
                className={s.confirmModalCloseBtn}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 id="confirm-modal-title" className={s.confirmModalTitle}>
              Confirm {formatStatusLabel(pendingWithdrawalAction.status)}
            </h3>

            <p className={s.confirmModalText}>
              {pendingWithdrawalAction.status === "rejected"
                ? "Rejecting this withdrawal will automatically reverse the hold and restore the funds back into the provider's wallet."
                : `Are you sure you want to mark this withdrawal of ${formatMoney(
                  pendingWithdrawal?.amount,
                  pendingWithdrawal?.currency
                )} as "${formatStatusLabel(pendingWithdrawalAction.status)}"?`}
            </p>

            <div className={s.confirmModalMeta}>
              <span>
                Provider: {pendingWithdrawal?.userId?.businessName || pendingWithdrawal?.userId?.name || "Provider"}
              </span>
              <span>{formatMoney(pendingWithdrawal?.amount, pendingWithdrawal?.currency)}</span>
            </div>

            <div className={s.confirmModalActions}>
              <button
                type="button"
                disabled={isConfirmingWithdrawal}
                onClick={closeWithdrawalConfirm}
                className={s.confirmModalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConfirmingWithdrawal}
                onClick={changeWithdrawalStatus}
                className={s.confirmModalConfirmBtn}
              >
                {isConfirmingWithdrawal ? "Updating..." : `Yes, Mark as ${formatStatusLabel(pendingWithdrawalAction.status)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;

