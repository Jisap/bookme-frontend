import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login, register, requestRegistrationOtp, verifyRegistrationOtp } from "../api/auth";
import logo from "../assets/logo.png"
import { ArrowRight, BadgeCheck, Building2, CalendarDays, Lock, Mail, Shield, User, Zap } from "lucide-react";
import { authPageStyles } from "../assets/dummyStyles"

const initialForm = {
  name: "",
  email: "",
  password: "",
  businessName: "",
  emailOtp: ""
};



const AuthPage = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSentTo, setOtpSentTo] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  const isRegister = mode === "register";
  const formLocation = location.state?.form;
  const redirectTo = formLocation
    ? `${formLocation.pathname}${formLocation.search || ""}`
    : "/profile"

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const interval = setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prev - 1;
      }, 1000);

      return () => clearInterval(interval)
    }, [otpCooldown]);
  });

  const handleChange = async (event) => {
    const { name, value } = event.target;

    if (name === "emailOtp") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
      setForm((prev) => ({ ...prev, emailOtp: digitsOnly }));
      if (otpVerified) setOtpVerified(false);

      if (digitsOnly.length === 6 && form.email) {
        try {
          await verifyRegistrationOtp({
            email: form.email,
            emailOtp: digitsOnly
          });
          setOtpVerified(true);
          setMessage("Email verified successfully");
        } catch (error) {
          setOtpVerified(false);
          setMessage(error?.response?.data?.message || "Invalid OTP");
        }
      }

      return;
    }

    if (name === "email") {
      setOtpVerified(false);
      setOtpSentTo("");
      setForm((prev) => ({
        ...prev,
        email: value,
        emailOtp: "",
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  const sendOtp = async () => {
    if (!form.email) {
      setMessage("Enter your email first");
      return;
    }

    setOtpLoading(true);
    setMessage("");
    try {
      await requestRegistrationOtp(form.email);
      setOtpSentTo(form.email.trim().toLowerCase());
      setOtpVerified(false);
      setOtpCooldown(30);
      setMessage("Verification code sent to your email");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Could not send code");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const payload = isRegister
        ? form
        : { email: form.email, password: form.password }

      const { data } = await (isRegister ? register(payload) : login(payload));
      if (data.token) {
        localStorage.setItem("token", data.token)
      }
      navigate(redirectTo, { replace: true });
      return;
    } catch (error) {

    }
  }
}

export default AuthPage



