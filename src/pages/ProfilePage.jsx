/**
 * ProfilePage.jsx
 *
 * Página de perfil / personalización de la experiencia pública de reserva.
 * Propósito: permitir al proveedor editar sus datos de negocio (nombre,
 * descripción, zona horaria, color de acento y tema de marca), copiar su
 * enlace público de reserva (`/book/:slug`), gestionar integraciones
 * (Stripe, Google Calendar, emails) y previsualizar en vivo cómo verá el
 * cliente su página de reserva.
 *
 * Flujo OAuth Calendar: tras volver de Google, la URL trae `?calendar=connected`
 * o un valor de error. Ese query param se lee con `useSearchParams` y se
 * convierte en mensaje inicial mediante `getCalendarMessage()`.
 *
 * Contratos API:
 * - `getMe()` -> GET `/auth/me` (requiere `localStorage.token`).
 * - `updateProfile(form)` -> PUT `/auth/profile` con { businessName,
 *   businessDescription, timezone, brandTheme, brandAccent }.
 *   (Corregido: `src/api/auth.js` exportaba `UpdateProfile` en mayúscula,
 *   lo que rompía este import en minúsculas; ahora exporta `updateProfile`
 *   con alias legacy `UpdateProfile`.)
 * - `getGoogleConnectUrl()` -> GET `/integrations/google/connect`, devuelve
 *   `{ url }` de autorización OAuth a la que se redirige con `window.location.href`.
 *
 * Enfoque de diseño: componente funcional con estado local (`useState`) + carga
 * inicial en `useEffect`. Sin `useMemo`: los valores derivados (link público,
 * estilos de tema, banner) se calculan en cada render porque son baratos.
 * Estilos centralizados en `profilePageStyles as s` (dummyStyles) + variables
 * CSS `--brand-accent` / `--brand-panel` para el preview en vivo.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Layout general de la app (sidebar + contenedor)
import AppLayout from "../components/AppLayout";

// APIs del proyecto
import { getMe, updateProfile } from "../api/auth";
import { getGoogleConnectUrl } from "../api/integration";

// Iconos de Lucide React (ligeros y personalizables)
import {
  Copy,
  BadgeCheck,
  Users,
  Globe,
  Save,
  Wand2,
  CalendarDays,
  Shield,
  BellRing,
  Zap,
  Clock,
  IndianRupee,
} from "lucide-react";

// Importación de recursos estáticos (logos de integraciones, ilustración y banners por tema)
import googleCalendarLogo from "../assets/Google_Calendar-Logo.wine.png";
import stripeLogo from "../assets/stripeicon.jpeg";
import gmailLogo from "../assets/gmail.webp";
import p2Image from "../assets/P2.png";
import greenBanner from "../assets/green.png";
import purpleBanner from "../assets/purple.png";
import redBanner from "../assets/red.png";
import whiteBanner from "../assets/white.png";
import yellowBanner from "../assets/yellow.png";

// Opciones de tema, helper de estilos por tema y diccionario de clases de esta página
import {
  brandThemeOptions,
  getBrandThemeStyle,
  profilePageStyles as s,
} from "../assets/dummyStyles";

// ============================================================================
// 1. FUNCIONES AUXILIARES Y MAPEO DE RECURSOS (fuera del componente)
// ============================================================================

/**
 * Traduce el query param `?calendar=` (retorno del OAuth de Google) a mensaje legible.
 *
 * @param {string|null} value - Valor de `searchParams.get("calendar")`.
 * @returns {string} Mensaje de éxito, de error, o "" si no hay parámetro.
 */
const getCalendarMessage = (value) => {
  if (value === "connected") return "Google Calendar connected successfully";
  if (value) return "Google Calendar connection was not completed";
  return "";
};

/**
 * Mapa tema -> imagen de banner del preview.
 * Debe mantenerse sincronizado con los `id` de `brandThemeOptions`
 * (emerald, indigo, rose, amber, slate) en `dummyStyles`.
 */
const themeBannerImages = {
  emerald: greenBanner,
  indigo: purpleBanner,
  rose: redBanner,
  amber: yellowBanner,
  slate: whiteBanner,
};

// ============================================================================
// 2. COMPONENTE PRINCIPAL: ProfilePage
// ============================================================================

export default function ProfilePage() {
  // --- Estado: query params del retorno OAuth ---
  // `calendarNotice` es "connected" | código de error | null.
  const [searchParams] = useSearchParams();
  const calendarNotice = searchParams.get("calendar");

  // --- Estado: formulario editable del negocio ---
  // Se inicializa con defaults y se hidrata con `getMe()` en el efecto.
  const [form, setForm] = useState({
    businessName: "",
    businessDescription: "",
    timezone: "Asia/Kolkata",
    brandTheme: "emerald",
    brandAccent: "#6C47FF",
    duration: 900, // Duración por defecto en minutos (ej. 900 = 15h, usado solo en preview)
  });

  // --- Estado: datos y UI ---
  const [user, setUser] = useState(null); // Usuario/proveedor cargado del backend (incluye `slug`)
  const [loading, setLoading] = useState(false); // Guardando perfil (deshabilita botón Save)
  const [connectingCalendar, setConnectingCalendar] = useState(false); // Redirigiendo a OAuth de Google
  const [message, setMessage] = useState(getCalendarMessage(calendarNotice)); // Banner global (éxito/error)
  const [copyMessage, setCopyMessage] = useState(""); // Feedback temporal del botón "Copy link"

  // --- Estado derivado (recalculado en cada render, sin useMemo por ser barato) ---

  // Enlace público de reserva. Si aún no hay `slug`, se muestra solo el origin como fallback.
  const publicLink = user?.slug
    ? `${window.location.origin}/book/${user.slug}`
    : `${window.location.origin}`;

  // Objeto de estilos del tema activo { bg, gradient, panel, accent... } (con fallback a emerald).
  const dynamicThemeUI = getBrandThemeStyle(form.brandTheme);

  // Variables CSS inyectadas vía `style={brandStyleVars}` en la zona inferior:
  // `--brand-accent` tiñe botones/avatar, `--brand-panel` tiñe el fondo del preview.
  const brandStyleVars = {
    "--brand-accent": form.brandAccent || dynamicThemeUI.accent,
    "--brand-panel": dynamicThemeUI.panel,
  };

  // Banner decorativo del preview según tema seleccionado.
  const previewBannerImage = themeBannerImages[form.brandTheme] || greenBanner;

  // --- Efecto: carga inicial del perfil ---
  useEffect(() => {
    const loadUser = async () => {
      // Sin token no hay sesión: se avisa y no se llama a la API.
      if (!localStorage.getItem("token")) {
        setMessage("Please log in before editing your profile");
        return;
      }

      try {
        const { data } = await getMe();
        const nextUser = data?.user;

        if (!nextUser) {
          setMessage("Could not load profile details");
          return;
        }

        // Hidrata usuario + formulario con fallbacks para primera configuración.
        setUser(nextUser);
        setForm({
          businessName: nextUser.businessName || "Mental Clinic",
          businessDescription: nextUser.businessDescription || "",
          timezone: nextUser.timezone || "Asia/Kolkata",
          brandTheme: nextUser.brandTheme || "emerald",
          brandAccent: nextUser.brandAccent || "#6C47FF",
          duration: nextUser.duration || 900,
        });
      } catch (error) {
        setMessage(
          error.response?.data?.message || "Could not load profile details",
        );
      }
    };

    loadUser();
    // Array vacío: solo se ejecuta una vez al montar (los mensajes OAuth ya vienen en el estado inicial).
  }, []);

  // --- Manejadores de eventos ---

  /**
   * Handler genérico de inputs controlados (input, textarea, select, color).
   * Usa `event.target.name` como clave del objeto `form`.
   */
  const handleChange = (event) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  /**
   * Selecciona un tema de marca: actualiza `brandTheme` y sincroniza
   * `brandAccent` con el acento por defecto de ese tema.
   * @param {{ id: string, accent: string }} theme - Opción de `brandThemeOptions`.
   */
  const chooseTheme = (theme) => {
    setForm((prev) => ({
      ...prev,
      brandTheme: theme.id,
      brandAccent: theme.accent,
    }));
  };

  /**
   * Copia el enlace público al portapapeles y muestra "Copied!" durante 1.8s.
   * Se envuelve en try/catch: `navigator.clipboard` falla en contextos no
   * seguros (http) o sin permiso, y sin esto dejaba una promesa rechazada.
   */
  const copyPublicLink = async () => {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopyMessage("Copied!");
      window.setTimeout(() => setCopyMessage(""), 1800); // Resetear mensaje después de 1.8s
    } catch {
      setCopyMessage("Copy failed");
      window.setTimeout(() => setCopyMessage(""), 1800);
    }
  };

  /**
   * Guarda el perfil: PUT `/auth/profile` con todo el objeto `form`.
   * Actualiza `user` con la respuesta y muestra banner de éxito/error.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!localStorage.getItem("token")) {
      setMessage("Please log in before editing your profile");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data } = await updateProfile(form);
      setUser(data.user);
      setMessage("Profile updated successfully");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inicia el flujo OAuth de Google Calendar: pide la URL de autorización
   * al backend y redirige el navegador. Si falla, libera el botón Manage.
   */
  const connectGoogleCalendar = async () => {
    setConnectingCalendar(true);
    setMessage("");

    try {
      const { data } = await getGoogleConnectUrl();
      window.location.href = data.url;
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Could not start Google Calendar connection",
      );
      setConnectingCalendar(false);
    }
  };

  /**
   * Elige el estilo del banner de mensajes: verde si contiene "success"/"updated", rojo en otro caso.
   * @param {string} msg - Mensaje actual.
   * @returns {string} Clase CSS de `profilePageStyles`.
   */
  const getMessageBannerClass = (msg) => {
    if (!msg) return "";
    return msg.toLowerCase().includes("success") || msg.includes("updated")
      ? s.messageBannerSuccess
      : s.messageBannerError;
  };

  // ============================================================================
  // 3. RENDERIZADO DE LA INTERFAZ (UI)
  // ============================================================================
  return (
    <AppLayout>
      <div className={s.pageLayout}>
        {/* COLUMNA IZQUIERDA: cabecera + enlace público + integraciones */}
        <div className={s.leftColumn}>
          {/* Header & Illustration: título con gradientes + imagen P2 decorativa */}
          <div className={s.headerRow}>
            <div className={s.headerTextBlock}>
              <h3 className={s.profileLabel}>Profile</h3>
              <h1 className={s.mainHeading}>
                Shape your{" "}
                <span className={s.headingGradientPublic}>public</span>
                <br />
                <span className={s.headingGradientBooking}>
                  booking{" "}
                  <span className={s.headingGradientBookingInner}>
                    experience
                  </span>
                </span>
              </h1>
              <p className={s.subHeading}>
                Personalize your booking page, connect your tools, and share
                your link with confidence.
              </p>
            </div>
            <div className={s.illustrationContainer}>
              <img
                src={p2Image}
                alt="Profile illustration"
                className={s.illustrationImg}
              />
            </div>
          </div>

          {/* Public Booking Link Card: barra con URL + doble botón de copiar + indicador "live" */}
          <div className={s.linkCard}>
            <h4 className={s.linkCardTitle}>Public booking link</h4>
            <div className={s.linkRow}>
              <div className={s.linkBar}>
                <span className={s.linkText}>{publicLink}</span>
                <button
                  onClick={copyPublicLink}
                  className={s.linkCopyButtonSmall}
                >
                  <Copy className={s.iconSmall} />
                </button>
              </div>
              <button onClick={copyPublicLink} className={s.linkCopyButtonMain}>
                <Wand2 className={s.iconSmall} />
                {copyMessage || "Copy link"}
              </button>
            </div>
            <div className={s.linkLiveIndicator}>
              <BadgeCheck className={s.iconSmall} />
              <span>Your link is live and ready to share!</span>
            </div>
          </div>

          {/* Integrations Grid: 3 tarjetas (Stripe y Emails son estáticas; Calendar sí conecta vía OAuth) */}
          <div className={s.integrationsGrid}>
            {/* Stripe: estado visual fijo "Configured", sin acción */}
            <div className={s.integrationCard}>
              <div className={s.integrationHeader}>
                <div className={s.integrationLogoBox}>
                  <img
                    src={stripeLogo}
                    alt="Stripe"
                    className={s.integrationLogoImg}
                  />
                </div>
                <span className={s.integrationLabel}>Stripe</span>
              </div>
              <h4 className={s.integrationStatusConfigured}>
                Configured <BadgeCheck className={s.integrationCheckIcon} />
              </h4>
              <p className={s.integrationDesc}>
                Collect payments securely via Stripe.
              </p>
              <div className={s.integrationInfoPill}>
                Platform payment gateway
              </div>
            </div>

            {/* Google Calendar: botón Manage -> `connectGoogleCalendar()` (OAuth redirect) */}
            <div className={s.integrationCard}>
              <div className={s.integrationHeader}>
                <div className={s.integrationLogoBox}>
                  <img
                    src={googleCalendarLogo}
                    alt="Calendar"
                    className={s.integrationLogoImg}
                  />
                </div>
                <span className={s.integrationLabel}>Calendar</span>
              </div>
              <h4 className={s.integrationStatusConnected}>
                Connected <BadgeCheck className={s.integrationCheckIcon} />
              </h4>
              <p className={s.integrationDesc}>
                Bookings will sync automatically.
              </p>
              <button
                onClick={connectGoogleCalendar}
                disabled={connectingCalendar}
                className={s.integrationManageButton}
              >
                {connectingCalendar ? "Wait..." : "Manage"}
              </button>
            </div>

            {/* Email Notifications: estado visual fijo "Configured", sin acción */}
            <div className={s.integrationCard}>
              <div className={s.integrationHeader}>
                <div className={s.integrationLogoBox}>
                  <img
                    src={gmailLogo}
                    alt="Emails"
                    className={s.integrationLogoImg}
                  />
                </div>
                <span className={s.integrationLabel}>Emails</span>
              </div>
              <h4 className={s.integrationStatusConfigured}>
                Configured <BadgeCheck className={s.integrationCheckIcon} />
              </h4>
              <p className={s.integrationDesc}>
                Customers receive email updates.
              </p>
              <div className={s.integrationInfoPill}>
                Automatic booking emails
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: formulario "Business details" (nombre, descripción, timezone, acento, tema, save) */}
        <div className={s.rightColumn}>
          <div className={s.formHeader}>
            <div className={s.formHeaderIcon}>
              <Users className={s.formHeaderUserIcon} />
            </div>
            <div>
              <h2 className={s.formTitle}>Business details</h2>
              <p className={s.formSubtitle}>Update your profile info</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={s.form}>
            {/* Business Name: input controlado -> `form.businessName` */}
            <div>
              <label className={s.inputLabel}>Business Name</label>
              <div className={s.inputWrapper}>
                <input
                  name="businessName"
                  value={form.businessName}
                  onChange={handleChange}
                  className={s.textInput}
                />
                <Globe className={s.inputIconRight} />
              </div>
            </div>

            {/* Business Description: textarea controlada -> `form.businessDescription` */}
            <div>
              <label className={s.inputLabel}>Business Description</label>
              <textarea
                name="businessDescription"
                value={form.businessDescription}
                onChange={handleChange}
                rows={3}
                className={s.textareaInput}
              />
            </div>

            <div className={s.twoColGrid}>
              {/* Timezone: select con 3 opciones fijas -> `form.timezone` */}
              <div>
                <label className={s.inputLabel}>Timezone</label>
                <div className={s.inputWrapper}>
                  <Globe className={s.inputIconLeft} />
                  <select
                    name="timezone"
                    value={form.timezone}
                    onChange={handleChange}
                    className={s.selectInput}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </div>
              </div>

              {/* Accent Color: doble input sincronizado (color picker + texto HEX) -> `form.brandAccent` */}
              {/* CORREGIDO: guard `(form.brandAccent || "#6C47FF")` — el input
                                `type="color"` exige un hex válido y `.toUpperCase()` rompía
                                si el backend devolvía null/undefined. */}
              <div>
                <label className={s.inputLabel}>Accent color</label>
                <div className={s.colorInputRow}>
                  <input
                    name="brandAccent"
                    type="color"
                    value={form.brandAccent || "#6C47FF"}
                    onChange={handleChange}
                    className={s.colorPicker}
                  />
                  <input
                    name="brandAccent"
                    type="text"
                    value={(form.brandAccent || "#6C47FF").toUpperCase()}
                    onChange={handleChange}
                    className={s.colorTextInput}
                  />
                </div>
              </div>
            </div>

            {/* Theme: swatches de `brandThemeOptions`; el activo va en negro (`themeBtnActive`) */}
            <div>
              <label className={s.inputLabel}>Theme</label>
              <div className={s.themeSwatches}>
                {brandThemeOptions.map((theme) => {
                  const isSelected = form.brandTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => chooseTheme(theme)}
                      className={
                        isSelected ? s.themeBtnActive : s.themeBtnInactive
                      }
                    >
                      <span className={`${s.themeSwatch} ${theme.swatch}`} />
                      {theme.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save Button: submit del form, deshabilitado mientras `loading` */}
            <button type="submit" disabled={loading} className={s.saveButton}>
              <Save className={s.saveButtonIcon} />
              {loading ? "Saving..." : "Save profile settings"}
            </button>
            {/* Banner de feedback: éxito (verde) o error (rojo) según `getMessageBannerClass()` */}
            {message && (
              <div
                className={`${s.messageBanner} ${getMessageBannerClass(
                  message,
                )}`}
              >
                <BadgeCheck className={s.messageBannerIcon} />
                {message}
              </div>
            )}
          </form>
        </div>

        {/* ZONA INFERIOR FULL WIDTH (ocupa 2 columnas): preview público + vista de cliente */}
        {/* `style={brandStyleVars}` propaga las variables CSS del tema a todos los hijos */}
        <div className={s.bottomFullWidth} style={brandStyleVars}>
          {/* Public Preview Block: banner con imagen enmascarada + avatar con inicial + descripción */}
          <div className={s.previewContainer}>
            <div className={s.previewBanner}>
              <div className={s.previewBannerBg}>
                <img
                  src={previewBannerImage}
                  alt="3D Illustration"
                  className={s.previewBannerImg}
                  style={{
                    // Fundido lateral de la imagen (transparente -> negro al 80%)
                    WebkitMaskImage:
                      "linear-gradient(to right, transparent, black 80%)",
                    maskImage:
                      "linear-gradient(to right, transparent, black 80%)",
                  }}
                />
                <div className={s.previewBannerOverlay} />
              </div>

              <div className={s.previewBannerContent}>
                <div className={s.previewAvatarRow}>
                  <div className={s.previewAvatar}>
                    {(form.businessName || "M").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className={s.previewLabel}>Public preview</div>
                    <h2 className={s.previewTitle}>
                      {form.businessName || "Mental Clinic"}
                    </h2>
                  </div>
                </div>
                {form.businessDescription && (
                  <p className={s.previewDesc}>{form.businessDescription}</p>
                )}
              </div>
            </div>

            {/* Overlapping White feature card: 4 ventajas solapadas sobre el banner */}
            <div className={s.previewFeatureCard}>
              <div className={s.featureItem}>
                <div className={s.featureIconBox}>
                  <CalendarDays className={s.featureIcon} />
                </div>
                <div>
                  <h5 className={s.featureTitle}>Easy Booking</h5>
                  <p className={s.featureText}>
                    Book your session in just a few clicks.
                  </p>
                </div>
              </div>
              <div className={s.featureItem}>
                <div className={s.featureIconBox}>
                  <Shield className={s.featureIcon} />
                </div>
                <div>
                  <h5 className={s.featureTitle}>Secure Payments</h5>
                  <p className={s.featureText}>
                    Powered by Stripe for safe transactions.
                  </p>
                </div>
              </div>
              <div className={s.featureItem}>
                <div className={s.featureIconBox}>
                  <BellRing className={s.featureIcon} />
                </div>
                <div>
                  <h5 className={s.featureTitle}>Instant Updates</h5>
                  <p className={s.featureText}>
                    Get email & calendar reminders.
                  </p>
                </div>
              </div>
              <div className={s.featureItem}>
                <div className={s.featureIconBox}>
                  <Zap className={s.featureIcon} />
                </div>
                <div>
                  <h5 className={s.featureTitle}>Hassle-free</h5>
                  <p className={s.featureText}>
                    Manage bookings anytime, anywhere.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer View Section: mini-maqueta de la tarjeta de reserva con tema + acento aplicados */}
          <div className={s.customerViewContainer}>
            <div className={s.customerViewLabel}>Customer view</div>

            <div className={`${s.customerViewCard} ${dynamicThemeUI.bg}`}>
              <div
                className={`${s.customerViewOverlay} ${dynamicThemeUI.gradient}`}
              />
              <div className={s.customerViewContent}>
                <div
                  className={s.customerAvatar}
                  style={{ backgroundColor: form.brandAccent || "#6C47FF" }}
                >
                  {(form.businessName || "M").slice(0, 1).toUpperCase()}
                </div>
                <h3 className={s.customerName}>
                  {form.businessName || "Mental Clinic"}
                </h3>
                <div className={s.customerMeta}>
                  <span className={s.customerMetaItem}>
                    <Clock className={s.customerMetaIcon} /> 60 min
                  </span>
                  <span className={s.customerMetaItem}>
                    <IndianRupee className={s.customerMetaIcon} />{" "}
                    {form.duration || 900}
                  </span>
                </div>
                <div className={s.customerTimeslotSection}>
                  <div className={s.timeslotLabel}>Select Time</div>
                  <button
                    className={s.timeslotActiveBtn}
                    style={{ backgroundColor: form.brandAccent || "#6C47FF" }}
                  >
                    10:00 AM
                  </button>
                  <button className={s.timeslotInactiveBtn}>11:30 AM</button>
                </div>
              </div>
            </div>

            <div className={s.customerViewHint}>
              <Wand2 className={s.hintIcon} />
              <span>
                Preview your public booking page.
                <br />
                Accent color applies to buttons.
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
