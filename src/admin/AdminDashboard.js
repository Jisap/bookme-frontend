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
}

export default AdminDashboardPage
