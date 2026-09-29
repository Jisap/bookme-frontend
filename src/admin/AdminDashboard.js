import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAdminDashboard, updateWithdrawalStatus } from "../api/admin";
import {
  Users,
  Wallet,
  TrendingUp,
  IndianRupee,
  Landmark,
  CheckCircle,
  XOctagon,
  Clock,
  UserCheck,
  ShieldCheck
} from "lucide-react"
import logo from "../assets/logo.png"
import { adminDashboardPageStyles as s } from "../assets/dummyStyles";


const formatMoney = (amount = 0, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { styles: "currency", currency }).format( //dividir entre 100 ya que esta en centimos de rupia
    amount / 100
  );

const withdrawalStatuses = ["processing", "paid", "rejected"];//estados para los botones de actualizar
const terminalWithdrawalStatuses = ["paid", "rejected"];//estados para los botones que indican que la solicitud ha terminado

const isTerminalWithdrawalStatus = (status) =>
  terminalWithdrawalStatuses.includes(status);//verificar si el estado es terminal

const formatStatusLabel = (status = "") =>
  status ? `${status.slice(0, 1).toUpperCase()}${status.slice(1)}` : "";  //formatar el estado para que se muestre con la primera letra mayuscula



const AdminDashboardPage = () => {

  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState("");
  const [updatingWithdrawalId, setUpdatingWithdrawalId] = useState("");
  const [pendingWithdrawalAction, setPendingWithdrawalAction] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem("adminToken")) {
      navigate("/admin/login");
      return undefined;
    }

    let isActive = true;

    getAdminDashboard()
      .then((response) => {
        if (isActive) {
          setDashboard(response.data)
        }
      })
      .catch((error) => {
        if (isActive) {
          setDashboard(null);
          setMessage(error.response?.data?.message || "Error while fetching dashboard");
        }
      });

    return () => {
      isActive = false;
    }
  }, [navigate]);

  const requestWithdrawalStatusChange = (withdrawal, status) => {
    if (withdrawal.status === status || isTerminalWithdrawalStatus(withdrawal.status)) {
      return
    }

    setPendingWithdrawalAction({ withdrawal, status })
  }

  const closeWithdrawalConfirm = () => {
    if (updatingWithdrawalId) return;
    setPendingWithdrawalAction(null)
  }

  const changeWithdrawalStatus = async () => {
    if (!pendingWithdrawalAction) return;

    const { withdrawal, status } = pendingWithdrawalAction;
    setUpdatingWithdrawalId(withdrawal._id);

    try {
      const { data } = await updateWithdrawalStatus(withdrawal._id, { status });
      setDashboard((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          summary: data.summary || prev.summary,
          withdrawals: prev.withdrawals.map((withdrawal) =>
            withdrawal._id === data.withdrawal._id
              ? data.withdrawal
              : withdrawal,
          ),
        };
      });
      setMessage(data.message || `Withdrawal marked as ${status}`);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not update withdrawal",
      );
    } finally {
      setUpdatingWithdrawalId("");
      setPendingWithdrawalAction(null);
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  const summary = dashboard?.summary || {};
  const pendingWithdrawal = pendingWithdrawalAction?.withdrawal;
  const WithdrawalConfirmIcon =
    pendingWithdrawalAction?.status === "rejected" ? XOctagon : ShieldCheck;
  const isConfirmingWithdrawal =
    pendingWithdrawal && updatingWithdrawalId === pendingWithdrawal._id;

  // Helpers for dynamic classes from styles
  const getPayoutStatusClass = (isComplete) =>
    isComplete ? s.userPayoutReady : s.userPayoutPending;

  const getWithdrawalStatusClass = (status) =>
    s.withdrawalStatusColors[status] || s.withdrawalStatusDefault;

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
      value: formatMoney(summary.grossRevenue),
      icon: TrendingUp,
      bg: s.statBg3,
      c: s.statColor3,
    },
    {
      label: "Platform Fees",
      value: formatMoney(summary.platformFees),
      icon: IndianRupee,
      bg: s.statBg4,
      c: s.statColor4,
    },
    {
      label: "Provider Payouts",
      value: formatMoney(summary.providerPayouts),
      icon: Wallet,
      bg: s.statBg5,
      c: s.statColor5,
    },
    {
      label: "Withdrawal Hold",
      value: formatMoney(summary.withdrawalHolds),
      icon: Landmark,
      bg: s.statBg6,
      c: s.statColor6,
    },
  ];

  return (
    <div className={s.pageContainer}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.logoRow}>
            <img
              src={logo}
              alt="BookMe Logo"
              className={s.logoImg}
            />

            <Link to="/admin/dashboard" className={s.headerActions}>
              Client App
            </Link>

            <button type="button" onClick={logout} className={s.logoutButton}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className={s.main}>
        <section>
          <div>
            <h1></h1>
            <p></p>
          </div>

          {message && <div className={s.messageBanner}>{message}</div>}
        </section>

        <section className={s.statsGrid}>
          {statCards.map((stat, i) => {
            <div key={i} className={s.statCard}>
              <div className={`${s.statIconContainer} ${stat.bg} ${stat.c}`}>
                <stat.icon className={s.statIcon} />
              </div>

              <div>
                <p className={s.statLabel}>
                  {stat.label}
                </p>

                <p className={s.statValue}>
                  {stat.value}
                </p>
              </div>
            </div>
          })}
        </section>

        <section>

        </section>
      </main>
    </div>
  )
}

export default AdminDashboardPage
