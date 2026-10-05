import { useEffect, useMemo, useState } from "react";
import p3Image from "../assets/P3.png";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import {
  getPaymentOverview,
  requestWithdrawal,
  updatePayoutDetails,
} from "../api/payments";
import {
  Wallet,
  TrendingUp,
  Clock,
  ArrowDownToLine,
  Building2,
  CreditCard,
  Save,
  ExternalLink,
  IndianRupee,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { paymentsPageStyles as s } from "../assets/dummyStyles";

// -----------------------------------------------------------------------------
// FUNCIONES AUXILIARES (HELPERS)
// -----------------------------------------------------------------------------

/**
 * Formatea una cantidad de dinero a formato de moneda local (INR).
 * NOTA: Se divide por 100 porque es una práctica estándar en el backend 
 * almacenar la moneda en su unidad más pequeña (ej. paisas o céntimos) 
 * para evitar errores de precisión con números decimales (punto flotante).
 */
export const formatMoney = (amount = 0, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(
    amount / 100
  );

/**
 * Determina la etiqueta legible para una transacción basándose en su tipo y descripción.
 */
export const transactionLabel = (transaction) => {
  if (transaction.type === "booking_payout") {
    if (
      transaction.description &&
      transaction.description.includes("Booking payout for Stripe session")
    ) {
      return "Booking payment received";
    }
    return transaction.description || "Booking payout";
  }

  if (transaction.type === "withdrawal_hold") return "Withdrawal requested";
  if (transaction.type === "withdrawal_reversal") return "Withdrawal returned";

  if (
    transaction.description &&
    transaction.description.toLowerCase().includes("booking payout for stripe session")
  ) {
    return "Booking payment received";
  }
  return transaction.description || transaction.type;
};

/**
 * Calcula el monto de la transacción para su visualización.
 * Las retencidas de retiro (withdrawal_hold) se muestran como negativas.
 */
export const transactionAmount = (transaction) => {
  if (transaction.type === "withdrawal_hold")
    return -Math.abs(transaction.amount || 0);
  return transaction.amount || 0;
};

// -----------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// -----------------------------------------------------------------------------

export default function PaymentsPage() {
  // --- ESTADO PRINCIPAL ---
  // Datos completos del overview (wallet, payoutDetails, transactions)
  const [overview, setOverview] = useState(null);

  // Mensajes de éxito o error para mostrar al usuario
  const [message, setMessage] = useState("");

  // Estado de carga global para deshabilitar botones durante peticiones a la API
  const [loading, setLoading] = useState(false);

  // Valor temporal del input de retiro
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Estado del formulario de detalles de pago
  const [form, setForm] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
  });

  // --- ESTADO DERIVADO (useMemo) ---
  // Se usan useMemo para evitar recálculos innecesarios en cada renderizado 
  // y para proporcionar valores por defecto seguros si `overview` es null.

  const wallet = useMemo(
    () =>
      overview?.wallet || {
        available: 0,
        earned: 0,
        pendingWithdrawals: 0,
        paidWithdrawals: 0,
      },
    [overview]
  );

  const payoutDetails = useMemo(
    () => overview?.payoutDetails || { isComplete: false, accountLast4: null },
    [overview]
  );

  // Calcula el monto disponible en rupias (formato decimal) para el placeholder del input
  const availableRupees = useMemo(() => {
    const rupees = (wallet.available || 0) / 100;
    return rupees > 0 ? rupees.toFixed(2) : "0.00";
  }, [wallet]);

  // ---------------------------------------------------------------------------
  // EFECTOS SECUNDARIOS (EFFECTS)
  // ---------------------------------------------------------------------------

  /**
   * Carga los datos iniciales de la página de pagos.
   * Verifica la autenticación antes de hacer la petición a la API.
   */
  const loadOverview = async () => {
    if (!localStorage.getItem("token")) {
      setMessage("Please log in to manage payment details");
      return;
    }

    try {
      const { data } = await getPaymentOverview();
      setOverview(data);

      // Pre-rellena el formulario con los datos existentes (si los hay)
      setForm((prev) => ({
        ...prev,
        accountHolderName: data.payoutDetails?.accountHolderName || "",
        bankName: data.payoutDetails?.bankName || "",
        ifsc: data.payoutDetails?.ifsc || "",
        upiId: data.payoutDetails?.upiId || "",
        // Nota: No pre-rellenamos accountNumber por seguridad (solo se muestra el último dígito)
      }));
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not load payment details"
      );
    }
  };

  // Ejecuta la carga de datos al montar el componente
  useEffect(() => {
    loadOverview();
  }, []);

  // ---------------------------------------------------------------------------
  // MANEJADORES DE EVENTOS (HANDLERS)
  // ---------------------------------------------------------------------------

  /**
   * Manejador genérico para actualizar el estado del formulario cuando cambia un input.
   */
  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  /**
   * Envía los detalles de pago actualizados al servidor.
   */
  const savePayoutDetails = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data } = await updatePayoutDetails(form);

      // Actualiza el estado local con los nuevos detalles (ej. el nuevo accountLast4)
      setOverview((prev) => ({ ...prev, payoutDetails: data.payoutDetails }));

      // SEGURIDAD/UX: Limpiamos el número de cuenta completo del estado local después de guardar,
      // ya que el backend solo debería almacenar/devolver los últimos 4 dígitos.
      setForm((prev) => ({ ...prev, accountNumber: "" }));

      setMessage(data.message);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not save payout details"
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Envía una solicitud de retiro al servidor.
   */
  const submitWithdrawal = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Convertimos el monto a la unidad más pequeña (paisas) multiplicando por 100
      const amount = Math.round(Number(withdrawAmount) * 100);
      const { data } = await requestWithdrawal(amount);

      setMessage(data.message);
      setWithdrawAmount(""); // Limpiar el input después de una solicitud exitosa

      // Recargamos el overview para reflejar el nuevo saldo disponible y la transacción pendiente
      await loadOverview();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not request withdrawal"
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
      <section className={s.mainGrid}>

        {/* =========================================================================
            COLUMNA IZQUIERDA: Resumen de cartera y solicitud de retiro
            ========================================================================= */}
        <div className={s.leftColumn}>

          {/* Encabezado e ilustración */}
          <div className={s.leftTopArea}>
            <div>
              <p className={s.pageLabel}>Payments</p>
              <h1 className={s.mainHeading}>
                Track <span className={s.gradientEarnings}>earnings</span>
                <br />
                and request withdrawals.
              </h1>
              <p className={s.subText}>
                Customer payments land with the platform first. A 10% platform
                fee is deducted, then the remaining balance becomes available
                here.
              </p>
            </div>
            <div className={s.illustrationContainer}>
              <img
                src={p3Image}
                alt="Illustration"
                className={s.illustrationImg}
              />
            </div>
          </div>

          {/* Tarjetas de resumen de la cartera (Wallet) */}
          <div className={s.walletCardsGrid}>
            {/* Tarjeta 1: Saldo disponible */}
            <div className={s.walletCard}>
              <div className={s.walletCardHeader}>
                <div className={s.walletIconBoxAvailable}>
                  <Wallet className="h-4 w-4 text-emerald-600" />
                </div>
                <span className={s.walletCardLabel}>Available</span>
              </div>
              <h2 className={s.walletAmount}>
                {formatMoney(wallet.available)}
              </h2>
            </div>

            {/* Tarjeta 2: Total ganado */}
            <div className={s.walletCard}>
              <div className={s.walletCardHeader}>
                <div className={s.walletIconBoxEarned}>
                  <TrendingUp className="h-4 w-4 text-[#7D57F5]" />
                </div>
                <span className={s.walletCardLabel}>Total earned</span>
              </div>
              <h2 className={s.walletAmount}>{formatMoney(wallet.earned)}</h2>
            </div>

            {/* Tarjeta 3: Retiros pendientes y pagados */}
            <div className={s.walletCard}>
              <div className={s.walletCardHeader}>
                <div className={s.walletIconBoxPending}>
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <span className={s.walletCardLabel}>Pending payouts</span>
              </div>
              <h2 className={s.walletAmount}>
                {formatMoney(wallet.pendingWithdrawals)}
              </h2>
              <p className={s.paidOutText}>
                Paid out: {formatMoney(wallet.paidWithdrawals)}
              </p>
            </div>
          </div>

          {/* Sección de formulario de retiro */}
          <section className={s.withdrawSection}>
            <h2 className={s.withdrawTitle}>
              <ArrowDownToLine className={s.withdrawIcon} />
              Withdraw balance
            </h2>
            <form onSubmit={submitWithdrawal} className={s.withdrawForm}>
              <div className={s.withdrawInputContainer}>
                <IndianRupee className={s.withdrawInputIcon} />
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                  placeholder={availableRupees}
                  className={s.withdrawInput}
                />
              </div>
              <button
                type="submit"
                // Deshabilitado si está cargando o si el usuario no ha configurado sus detalles de pago
                disabled={loading || !payoutDetails.isComplete}
                className={s.requestButton}
              >
                <ArrowDownToLine className={s.requestButtonIcon} />
                Request
              </button>
            </form>

            {/* Advertencia condicional si faltan datos de pago */}
            {!payoutDetails.isComplete && (
              <p className={s.withdrawWarning}>
                Save payout details before requesting a withdrawal.
              </p>
            )}
          </section>
        </div>

        {/* =========================================================================
            COLUMNA DERECHA: Formulario de detalles de pago e historial de actividad
            ========================================================================= */}
        <div className={s.rightColumn}>

          {/* Formulario de detalles de pago */}
          <section className={s.payoutDetailsSection}>
            <h2 className={s.payoutTitle}>
              <Building2 className={s.payoutTitleIcon} />
              Payout details
            </h2>
            <p className={s.payoutDescription}>
              We store only masked account information. Use Stripe Connect or a
              payout provider before moving real money in production.
            </p>
            <form onSubmit={savePayoutDetails} className={s.payoutForm}>
              <label className={s.inputLabel}>
                Account holder
                <input
                  name="accountHolderName"
                  value={form.accountHolderName}
                  onChange={handleChange}
                  className={s.textInput}
                  required
                />
              </label>
              <label className={s.inputLabel}>
                Bank name
                <input
                  name="bankName"
                  value={form.bankName}
                  onChange={handleChange}
                  className={s.textInput}
                  required
                />
              </label>
              <label className={s.inputLabel}>
                Account number
                <input
                  name="accountNumber"
                  value={form.accountNumber}
                  onChange={handleChange}
                  placeholder={
                    payoutDetails.accountLast4
                      ? `Saved ending in ${payoutDetails.accountLast4}`
                      : "Enter full account number"
                  }
                  className={s.textInput}
                  required
                />
              </label>

              <div className={s.payoutGridTwoCol}>
                <label className={s.inputLabel}>
                  IFSC
                  <input
                    name="ifsc"
                    value={form.ifsc}
                    onChange={handleChange}
                    className={s.textInput}
                    required
                  />
                </label>
                <label className={s.inputLabel}>
                  UPI ID
                  <input
                    name="upiId"
                    value={form.upiId}
                    onChange={handleChange}
                    className={s.textInput}
                  />
                </label>
              </div>

              <button type="submit" disabled={loading} className={s.saveButton}>
                <Save className={s.saveIcon} />
                {loading ? "Saving..." : "Save payout details"}
              </button>

              {/* Caja de mensajes para feedback de éxito/error */}
              {message && <p className={s.messageBox}>{message}</p>}
            </form>
          </section>

          {/* Historial de actividad reciente */}
          <section className={s.recentActivitySection}>
            <div className={s.recentActivityHeader}>
              <h2 className={s.recentActivityTitle}>
                <CreditCard className={s.recentActivityTitleIcon} />
                Recent activity
              </h2>
              <Link to="/bookings" className={s.bookingsLink}>
                Bookings
                <ExternalLink className={s.bookingsLinkIcon} />
              </Link>
            </div>

            <div className={s.transactionList}>
              {(overview?.transactions || []).map((transaction) => {
                const amount = transactionAmount(transaction);
                const isNegative = amount < 0;

                return (
                  <div key={transaction._id} className={s.transactionItem}>
                    <div className={s.transactionLeft}>
                      {/* Icono dinámico según si el saldo suma o resta */}
                      <div
                        className={
                          isNegative
                            ? s.transactionIconBoxNegative
                            : s.transactionIconBoxPositive
                        }
                      >
                        {isNegative ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4" />
                        )}
                      </div>
                      <span className={s.transactionLabel}>
                        {transactionLabel(transaction)}
                      </span>
                    </div>

                    {/* Monto formateado con color dinámico (rojo para negativo, verde/gris para positivo) */}
                    <strong
                      className={
                        isNegative
                          ? s.transactionAmountNegative
                          : s.transactionAmountPositive
                      }
                    >
                      {formatMoney(amount)}
                    </strong>
                  </div>
                );
              })}

              {/* Estado vacío si no hay transacciones */}
              {overview && overview.transactions?.length === 0 && (
                <p className={s.emptyText}>No wallet activity yet.</p>
              )}
            </div>
          </section>
        </div>
      </section>
    </AppLayout>
  );
}