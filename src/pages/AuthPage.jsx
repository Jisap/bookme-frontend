// ─────────────────────────────────────────────────────────────
// IMPORTS
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
// useLocation: lee la URL actual y el "state" recibido al navegar
// useNavigate: permite cambiar de ruta desde el código
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login, register, requestRegistrationOtp, verifyRegistrationOtp } from "../api/auth";
import logo from "../assets/logo.png";
import { ArrowRight, BadgeCheck, Building2, CalendarDays, Lock, Mail, Shield, User, Zap } from "lucide-react";
import { authPageStyles as s } from "../assets/dummyStyles";


// Valores iniciales del formulario. 
const initialForm = {
  name: "",
  email: "",
  password: "",
  businessName: "",
  emailOtp: "",
};

const AuthPage = () => {
  // ───────────────────────────────────────────────────────────
  // HOOKS DE ROUTER
  // ───────────────────────────────────────────────────────────
  const navigate = useNavigate(); // para redirigir tras el login/registro
  const location = useLocation(); // ubicación actual (/auth) + state recibido

  // ───────────────────────────────────────────────────────────
  // ESTADOS
  // ───────────────────────────────────────────────────────────
  const [mode, setMode] = useState("login");              // "login" o "register"
  const [form, setForm] = useState(initialForm);          // valores de todos los inputs
  const [loading, setLoading] = useState(false);          // true mientras se envía el formulario
  const [otpLoading, setOtpLoading] = useState(false);    // true mientras se pide el código
  const [otpSentTo, setOtpSentTo] = useState("");         // email al que se envió el último código
  const [otpVerified, setOtpVerified] = useState(false);  // true si el código es válido
  const [message, setMessage] = useState("");             // mensajes de error o éxito
  const [otpCooldown, setOtpCooldown] = useState(0);      // segundos que faltan para poder reenviar el código

  // Derivado: true cuando el formulario está en modo registro
  const isRegister = mode === "register";

  // Si ProtectedRoute mandó al usuario aquí con <Navigate to="/login" state={{ from: location }} />,
  // aquí recuperamos la ubicación de la página que intentaba ver.
  // Si entró directamente a /login, no habrá state y será undefined.
  const fromLocation = location.state?.from;

  // Destino tras autenticarse: la página de origen (con su query string) o /profile por defecto.
  const redirectTo = fromLocation
    ? `${fromLocation.pathname}${fromLocation.search || ""}`
    : "/profile";
  // ───────────────────────────────────────────────────────────
  // EFECTO: cuenta atrás para poder reenviar el código
  // ───────────────────────────────────────────────────────────
  // Se ejecuta cada vez que cambia otpCooldown. Si es mayor que 0, programa
  // un intervalo que lo reduce 1 cada segundo hasta llegar a 0.

  useEffect(() => {
    if (otpCooldown <= 0) return;

    const interval = setInterval(() => {
      setOtpCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    // Limpieza: evita intervalos duplicados al volver a ejecutarse el efecto
    return () => clearInterval(interval);
  }, [otpCooldown]);

  // ───────────────────────────────────────────────────────────
  // VERIFICACIÓN DEL CÓDIGO OTP
  // ───────────────────────────────────────────────────────────
  // Envía el código de 6 dígitos al backend para validarlo en tiempo real.
  // Si es correcto, activa otpVerified (badge verde) y permite completar el registro.
  const verifyOtpCode = async (codeToVerify) => {
    const code = (codeToVerify ?? form.emailOtp)?.toString().trim();
    if (!code || code.length !== 6) {
      setMessage("Please enter the 6-digit verification code");
      return;
    }
    if (!form.email) {
      setMessage("Enter your email first");
      return;
    }

    setOtpLoading(true);
    setMessage("Verifying code...");
    try {
      await verifyRegistrationOtp({
        email: form.email.trim().toLowerCase(),
        emailOtp: code,
      });
      setOtpVerified(true);
      setMessage("Email verified successfully");
    } catch (error) {
      setOtpVerified(false);
      setMessage(error?.response?.data?.message || "Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // MANEJADOR DE PEGADO PARA EL OTP (onPaste)
  // ───────────────────────────────────────────────────────────
  // Al copiar el código del email suelen incluirse espacios en blanco o saltos de línea.
  // Este manejador limpia caracteres no numéricos, extrae los 6 dígitos y dispara
  // la verificación inmediata sin requerir acciones adicionales del usuario.
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text") || "";
    const digitsOnly = pastedText.replace(/\D/g, "").slice(0, 6);
    if (!digitsOnly) return;
    setForm((prev) => ({ ...prev, emailOtp: digitsOnly }));
    if (otpVerified) setOtpVerified(false);
    if (digitsOnly.length === 6 && form.email) {
      verifyOtpCode(digitsOnly);
    }
  };

  // ───────────────────────────────────────────────────────────
  // MANEJADOR ÚNICO PARA TODOS LOS INPUTS
  // ───────────────────────────────────────────────────────────
  const handleChange = async (event) => {
    // name = nombre del input ("email", "password"...), value = lo que ha escrito el usuario
    const { name, value } = event.target;

    // CASO 1: el input del código OTP
    if (name === "emailOtp") {
      // Dejamos solo dígitos y máximo 6 caracteres
      const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
      setForm((prev) => ({ ...prev, emailOtp: digitsOnly }));

      // Si el usuario edita el código, deja de estar verificado
      if (otpVerified) setOtpVerified(false);

      // Cuando completa los 6 dígitos, se verifica automáticamente en el backend
      if (digitsOnly.length === 6 && form.email) {
        verifyOtpCode(digitsOnly);
      }

      return; // no seguimos a los otros casos
    }

    // CASO 2: el input del email
    // Si cambia el email, el código anterior deja de valer: se resetea todo lo del OTP.
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

    // CASO 3: cualquier otro input (name, businessName, password)
    // [name]: value es una "clave computada": actualiza solo el campo que corresponde.
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ───────────────────────────────────────────────────────────
  // ENVIAR EL CÓDIGO OTP AL EMAIL
  // ───────────────────────────────────────────────────────────
  const sendOtp = async () => {
    if (!form.email) {
      setMessage("Enter your email first");
      return;
    }

    setOtpLoading(true);
    setMessage("");
    try {
      await requestRegistrationOtp(form.email);
      // Guardamos el email normalizado para saber si luego cambia (y mostrar "Resend code")
      setOtpSentTo(form.email.trim().toLowerCase());
      setOtpVerified(false);
      setOtpCooldown(30); // bloquea el botón 30 segundos
      setMessage("Verification code sent to your email");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Could not send code");
    } finally {
      // Se ejecuta siempre, haya error o no
      setOtpLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // ENVÍO DEL FORMULARIO (login o registro)
  // ───────────────────────────────────────────────────────────
  const handleSubmit = async (event) => {
    event.preventDefault(); // evita que el navegador recargue la página
    setMessage("");

    // Validación en el frontend antes de enviar la petición al servidor:
    // Evita enviar peticiones incompletas a /api/auth/register que provocarían
    // el error 400 ("Name, email and password are required").
    if (isRegister) {
      if (!form.name.trim() || !form.email.trim() || !form.password) {
        setMessage("Name, email and password are required");
        return;
      }
      // Aseguramos que el usuario haya verificado el código de 6 dígitos antes de crear la cuenta
      if (!otpVerified) {
        setMessage("Please verify your email code first");
        return;
      }
    } else {
      // Para login solo requerimos email y contraseña
      if (!form.email.trim() || !form.password) {
        setMessage("Email and password are required");
        return;
      }
    }

    setLoading(true);

    try {
      // En registro se envía todo el formulario; en login solo email y contraseña
      const payload = isRegister
        ? form
        : { email: form.email, password: form.password };

      // Se llama a register o login según el modo y se extrae "data" de la respuesta
      const { data } = await (isRegister ? register(payload) : login(payload));

      // Si el backend devuelve un token, se guarda para mantener la sesión
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      // Redirige a la página de origen (o a /profile). Ahora ya hay token, así que
      // ProtectedRoute dejará pasar. replace: true sustituye /login en el historial,
      // de modo que el botón "atrás" no vuelva al formulario de acceso.
      navigate(redirectTo, { replace: true });
      return;
    } catch (error) {
      setMessage(error?.response?.data?.message || "Authentication Failed");
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // INTERFAZ
  // ───────────────────────────────────────────────────────────
  return (
    <div className={s.pageBg}>
      <div className={s.gridContainer}>

        {/* ===== Columna izquierda: marca y argumentos de venta ===== */}
        <section className={s.brandSection}>
          <div className={s.logoRow}>
            <img src={logo} alt="logo" className={s.logoImg} />
            <span className={s.brandName}>BookMe</span>
          </div>

          <h1 className={s.mainHeading}>
            A calm booking desk for{" "}
            <span className={s.gradientText}>small businesses</span>
          </h1>

          <p className={s.subtitle}>
            Create your business profile, add services, set availability, and share one clean booking link.
          </p>

          {/* Tres tarjetas con las ventajas del producto (mismo patrón repetido) */}
          <div className={s.featureGrid}>
            <div className={s.featureCard}>
              <div className={s.featureIconWrapPurple}>
                <CalendarDays className={s.featureIconPurple} />
              </div>
              <div>
                <p className={s.featureTitle}>Easy Setup</p>
                <p className={s.featureDesc}>Get started in minutes</p>
              </div>
            </div>

            <div className={s.featureCard}>
              <div className={s.featureIconWrapEmerald}>
                <Shield className={s.featureIconEmerald} />
              </div>
              <div>
                <p className={s.featureTitle}>Secure</p>
                <p className={s.featureDesc}>Stripe-powered payments</p>
              </div>
            </div>

            <div className={s.featureCard}>
              <div className={s.featureIconWrapAmber}>
                <Zap className={s.featureIconAmber} />
              </div>
              <div>
                <p className={s.featureTitle}>Fast</p>
                <p className={s.featureDesc}>Instant booking links</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Columna derecha: formulario ===== */}
        <section className={s.formCard}>
          {/* Título y subtítulo cambian según el modo */}
          <h2 className={s.formHeading}>
            {isRegister ? "Create account" : "Welcome back"}
          </h2>
          <p className={s.formSubtitle}>
            {isRegister
              ? "Set up your business in minutes"
              : "Log in to manage your bookings"}
          </p>

          <form onSubmit={handleSubmit} className={s.form}>

            {/* Nombre y negocio: solo aparecen al registrarse */}
            {isRegister && (
              <>
                <div>
                  <label className={s.inputLabel}>Name</label>
                  <div className={s.inputWrapper}>
                    <User className={s.inputIcon} />
                    <input
                      name="name" // este name es el que usa handleChange para saber qué campo actualizar
                      value={form.name} // input "controlado": su valor viene del estado
                      onChange={handleChange}
                      placeholder="Your full name"
                      className={s.inputField}
                    />
                  </div>
                </div>

                <div>
                  <label className={s.inputLabel}>Business Name</label>
                  <div className={s.inputWrapper}>
                    <Building2 className={s.inputIcon} />
                    <input
                      name="businessName"
                      value={form.businessName}
                      onChange={handleChange}
                      placeholder="Your business name"
                      className={s.inputField}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email: aparece en login y en registro */}
            <div>
              <label className={s.inputLabel}>Email</label>
              <div className={s.inputWrapper}>
                <Mail className={s.inputIcon} />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={s.inputField}
                />
              </div>
            </div>

            {/* Verificación por código: solo en registro */}
            {isRegister && (
              <div className={s.otpContainer}>
                <label className={s.otpLabel}>Email verification code</label>
                <div className={s.otpGrid}>
                  <input
                    name="emailOtp"
                    type="text"
                    inputMode="numeric"   // en móvil abre el teclado numérico
                    value={form.emailOtp}
                    onChange={handleChange}
                    onPaste={handleOtpPaste}
                    // Al pulsar Enter, verifica el código de inmediato
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        verifyOtpCode(form.emailOtp);
                      }
                    }}
                    className={s.otpField}
                    placeholder="Enter 6-digit code"
                    autoComplete="one-time-code" // permite autocompletar el código desde el SMS/email
                    pattern="[0-9]*"
                  />

                  {/* Si ya está verificado, botón deshabilitado con check; si tiene 6 dígitos listos, botón de verificar; si no, botón de envío/reenvío */}
                  {otpVerified ? (
                    <button type="button" disabled className={s.otpVerifiedButton}>
                      <BadgeCheck className={s.otpVerifiedIcon} />
                      Verified
                    </button>
                  ) : form.emailOtp.length === 6 && otpSentTo === form.email.trim().toLowerCase() ? (
                    <button
                      type="button"
                      onClick={() => verifyOtpCode(form.emailOtp)}
                      disabled={otpLoading}
                      className={s.otpButton}
                    >
                      {otpLoading ? "Verifying..." : "Verify code"}
                    </button>
                  ) : (
                    <button
                      type="button" // type="button" evita que dispare el submit del formulario
                      onClick={sendOtp}
                      // Deshabilitado si está enviando, no hay email o aún corre la cuenta atrás
                      disabled={otpLoading || !form.email || otpCooldown > 0}
                      className={s.otpButton}
                    >
                      {/* Texto del botón según la situación */}
                      {otpLoading
                        ? "Sending..."
                        : otpCooldown > 0
                          ? `Resend code (${otpCooldown}s)`
                          : otpSentTo === form.email.trim().toLowerCase()
                            ? "Resend code"
                            : "Send code"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Contraseña */}
            <div>
              <label className={s.inputLabel}>Password</label>
              <div className={s.inputWrapper}>
                <Lock className={s.inputIcon} />
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={s.inputField}
                />
              </div>
            </div>

            {/* Botón principal: su texto depende de loading y del modo */}
            <button type="submit" disabled={loading} className={s.submitBtn}>
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create account"
                  : "Log in"}
              <ArrowRight className={s.submitIcon} />
            </button>

            {/* Mensaje de error o éxito (solo si hay alguno) */}
            {message && <p className={s.message}>{message}</p>}
          </form>

          {/* Alterna entre login y registro sin cambiar de ruta */}
          <button
            type="button"
            onClick={() => {
              setMode(isRegister ? "login" : "register");
              setMessage(""); // limpia el mensaje anterior
            }}
            className={s.toggleMode}
          >
            {isRegister
              ? "Already have an account? Log in"
              : "Need an account? Register"}
          </button>
        </section>
      </div>

      <div className={s.footerLinks}>
        <Link to="/privacy" className={s.footerLink}>Privacy Policy</Link>
        <Link to="/terms" className={s.footerLink}>Terms of Service</Link>
      </div>
    </div>
  );
};

export default AuthPage;