/**
 * DashboardPage.jsx
 * 
 * Página principal del panel de control (Dashboard) para proveedores de servicios.
 * Propósito: Mostrar un resumen ejecutivo del negocio, incluyendo estadísticas clave,
 * gráficos de tendencias (reservas e ingresos), servicios más populares,
 * próximas reservas e integraciones activas.
 *
 * Moneda: los importes del backend vienen en minor units (céntimos) y cada
 * reserva guarda su `currency` ("usd"/"eur"). Se formatean en USD/EUR con
 * `Intl.NumberFormat("en-US")`, igual que en el AdminDashboard.
 * 
 * Enfoque de diseño: Componentes funcionales, cálculo de estado derivado con useMemo
 * para optimizar el rendimiento, y gráficos SVG personalizados para evitar 
 * dependencias pesadas de terceros.
 */

import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

// Componentes y APIs del proyecto
import AppLayout from "../components/AppLayout";
import { getMe } from "../api/auth";
import { listBookings } from "../api/bookings";
import { getPaymentOverview } from "../api/payments";
import { listServices } from "../api/services";

// Iconos de Lucide React (ligeros y personalizables)
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Wallet,
  Copy,
  RefreshCcw,
} from "lucide-react";

// Importación de recursos estáticos (imágenes, iconos, avatares y estilos)
import logo from "../assets/logo.png";
import p1Image from "../assets/P1.png";
import whatsappLogo from "../assets/WhatsApp-Logo.wine.png";
import instaLogo from "../assets/Instagram-Glyph-Color-Logo.wine.png";
import facebookLogo from "../assets/Facebook-f_Logo-Blue-Logo.wine.png";
import gmailLogo from "../assets/gmail.webp";
import googleCalendarLogo from "../assets/Google_Calendar-Logo.wine.png";
import p5Image from "../assets/P5.png";

// Iconos de servicios (C1 a C8)
import C1 from "../assets/icons/C1.png";
import C2 from "../assets/icons/C2.png";
import C3 from "../assets/icons/C3.png";
import C4 from "../assets/icons/C4.png";
import C5 from "../assets/icons/C5.png";
import C6 from "../assets/icons/C6.png";
import C7 from "../assets/icons/C7.png";
import C8 from "../assets/icons/C8.png";

// Avatares de clientes (A1 a A16, nota: falta A14 en la importación original)
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

// Estilos extraídos a un módulo externo para mantener el componente limpio
import { dashboardPageStyles as s } from "../assets/dummyStyles";

// ============================================================================
// 1. MAPEO DE RECURSOS (Diccionarios para renderizado dinámico)
// ============================================================================

const ICON_MAP = {
  "C1.png": C1, "C2.png": C2, "C3.png": C3, "C4.png": C4,
  "C5.png": C5, "C6.png": C6, "C7.png": C7, "C8.png": C8,
};

const AVATAR_MAP = {
  "A1.png": A1, "A2.png": A2, "A3.png": A3, "A4.png": A4,
  "A5.png": A5, "A6.png": A6, "A7.png": A7, "A8.png": A8,
  "A9.png": A9, "A10.png": A10, "A11.png": A11, "A12.png": A12,
  "A13.png": A13, "A15.png": A15, "A16.png": A16,
};

// ============================================================================
// 2. FUNCIONES AUXILIARES (Pure functions para formato y lógica de negocio)
// ============================================================================

/**
 * Formatea un valor numérico expresado en céntimos (minor units) a moneda con formato local.
 *
 * @param {number} amount - Monto en céntimos (ej. 50000 = 500.00).
 * @param {string} [currency] - Código ISO de moneda (ej. "USD", "EUR").
 * @returns {string} Cadena formateada (ej. "$500.00").
 */
const formatMoney = (amount = 0, currency) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(
    (amount || 0) / 100
  );

/**
 * Convierte un objeto Date a una cadena de texto en formato "YYYY-MM-DD".
 * Útil para comparaciones de fechas y claves de agrupación.
 */
const formatLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Analiza un valor de fecha (string u objeto) y devuelve un objeto Date válido.
 * Maneja tanto formatos "YYYY-MM-DD" como fechas ISO estándar.
 */
const parseBookingDateValue = (value) => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

/**
 * Obtiene la fecha y hora exacta de una reserva.
 * Combina la fecha base con la hora de inicio si está disponible en formato "HH:mm".
 */
const getBookingDate = (booking, fallbackDate) => {
  const dateValue = parseBookingDateValue(booking.date || booking.createdAt);
  if (!dateValue) return fallbackDate;

  if (booking.date && booking.startTime && /^\d{2}:\d{2}$/.test(booking.startTime)) {
    const [hours, minutes] = booking.startTime.split(":").map(Number);
    dateValue.setHours(hours, minutes, 0, 0);
  }
  return dateValue;
};

/**
 * Genera una URL de Gmail con asunto y cuerpo prellenados para compartir el enlace de reserva.
 */
const buildGmailShareUrl = (publicLink) => {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    su: "Book a session with me",
    body: `Here is my booking link: ${publicLink}`,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
};

/**
 * Genera un atributo "d" (path) para SVG a partir de un array de coordenadas {x, y}.
 * Ejemplo: "M x1 y1 L x2 y2 L x3 y3 ..."
 */
const buildPath = (points) =>
  points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

/**
 * Construye los cubos de un periodo para las tendencias de los gráficos.
 * Cada cubo lleva su etiqueta y un predicado `matches(fecha)`.
 * @param {string} filter - 'daily' | 'weekly' | 'monthly' | 'yearly'
 * @param {Date} today - Fecha de referencia (normalizada a las 00:00).
 * @returns {Array<{label: string, short: string, matches: (d: Date) => boolean}>}
 */
const buildTrendBuckets = (filter, today) => {
  const year = today.getFullYear();
  const month = today.getMonth();

  if (filter === "daily") {
    // Un cubo por cada día del mes actual
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      label: formatLocalDateKey(new Date(year, month, i + 1)),
      short: `${i + 1}`,
      matches: (d) => d.getFullYear() === year && d.getMonth() === month && d.getDate() === i + 1,
    }));
  }

  if (filter === "weekly") {
    // Agrupación por semanas del mes actual (tramos de 7 días desde el día 1)
    const buckets = [];
    let currentWeekStart = new Date(year, month, 1);
    let weekNum = 1;
    while (currentWeekStart.getMonth() === month) {
      const start = new Date(currentWeekStart);
      const end = new Date(currentWeekStart);
      end.setDate(end.getDate() + 7);
      const num = weekNum++;
      buckets.push({
        label: `Week ${num}`,
        short: `W${num}`,
        matches: (d) => d >= start && d < end,
      });
      currentWeekStart = end;
    }
    return buckets;
  }

  if (filter === "monthly") {
    // Un cubo por cada mes del año actual
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(year, i, 1);
      return {
        label: d.toLocaleDateString("en-US", { month: "long" }),
        short: d.toLocaleDateString("en-US", { month: "short" }),
        matches: (bd) => bd.getMonth() === i && bd.getFullYear() === year,
      };
    });
  }

  if (filter === "yearly") {
    // Un cubo por cada uno de los últimos 5 años
    return Array.from({ length: 5 }, (_, i) => {
      const y = year - (4 - i);
      return {
        label: `${y}`,
        short: `${y}`,
        matches: (bd) => bd.getFullYear() === y,
      };
    });
  }

  return [];
};

/**
 * Agrupa `items` por cubo de periodo y agrega cada grupo con `aggregate`.
 * Las fechas se resuelven con `getBookingDate`, igual que hacía cada tendencia por separado.
 * @param {Array} items - Reservas a agrupar.
 * @param {string} filter - 'daily' | 'weekly' | 'monthly' | 'yearly'
 * @param {(inBucket: Array) => number} aggregate - Cómo reducir cada grupo (contar o sumar).
 * @returns {Array<{label: string, short: string, value: number}>}
 */
const generateTrendData = (items, filter, aggregate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return buildTrendBuckets(filter, today).map((bucket) => {
    const inBucket = items.filter((item) => bucket.matches(getBookingDate(item, today)));
    return { label: bucket.label, short: bucket.short, value: aggregate(inBucket) };
  });
};

// ============================================================================
// 3. COMPONENTES DE GRÁFICOS REUTILIZABLES (SVG personalizado sin librerías pesadas)
// ============================================================================

/**
 * BarChart: Gráfico de barras SVG con tooltip interactivo para ingresos.
 * @param {Array} data - Array de objetos { label, short, value } con `value` en unidades mayores (ej. dólares/euros).
 * @param {String} accent - Color principal del gradiente
 * @param {String} currency - Código ISO de moneda para formatear ticks y tooltips con Intl (ej. "USD", "EUR").
 */
const BarChart = ({ data, accent = "#7c3aed", currency = "USD" }) => {
  const [tooltip, setTooltip] = useState(null);
  const currencyCode = currency || "USD";
  const compactMoneyFmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const moneyFmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  });
  const width = 760;
  const height = 240;
  const padding = { top: 20, right: 10, bottom: 30, left: 40 };
  const values = data.map((item) => item.value);
  const maxValueOrig = Math.max(1, ...values);
  const maxValue = maxValueOrig * 1.2 || 1; // 20% de margen superior para estética
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const barWidth = (plotWidth / data.length) * 0.55;
  const spacing = (plotWidth / data.length) * 0.45;

  // Genera las etiquetas del eje Y en moneda compacta (ej. $1.5K, €2.5M) según `currency`
  const ticks = [0, 0.33, 0.66, 1].map((ratio) => ({
    y: padding.top + ratio * plotHeight,
    value: Math.round(maxValue - ratio * maxValue),
  }));

  return (
    <div className={s.barChartWrapper}>
      <svg viewBox={`0 0 ${width} ${height}`} className={s.barChartSvg}>
        {/* Eje Y */}
        {ticks.map((tick) => (
          <g key={tick.y}>
            <text x={padding.left - 10} y={tick.y + 4} textAnchor="end" className={s.barChartTickText}>
              {compactMoneyFmt.format(tick.value)}
            </text>
          </g>
        ))}

        {/* Barras */}
        {data.map((item, index) => {
          const barH = (item.value / maxValue) * plotHeight;
          const x = padding.left + index * (barWidth + spacing) + spacing / 2;
          const y = padding.top + plotHeight - barH;
          // Muestra etiqueta cada ~6 barras o en la última para evitar saturación
          const showLabel = index % Math.ceil(data.length / 6) === 0 || index === data.length - 1;

          return (
            <g key={item.label}>
              {/* Área invisible para capturar el hover del mouse de forma más amplia */}
              <rect
                x={x} y={0} width={barWidth} height={height} fill="transparent"
                className={s.barChartBarInteractive}
                onMouseEnter={() => setTooltip({ x: x + barWidth / 2, y: Math.max(y, padding.top), text: `${moneyFmt.format(item.value)} earnings on ${item.label}` })}
                onMouseLeave={() => setTooltip(null)}
              />
              {/* Barra visual con gradiente */}
              <rect
                x={x} y={Math.max(y, padding.top)} width={barWidth} height={Math.max(barH, 4)}
                fill="url(#barGradient)" rx="4"
                className={`${s.barChartBar} ${tooltip?.x === x + barWidth / 2 ? "opacity-100" : "opacity-80"}`}
              />
              {showLabel && (
                <text x={x + barWidth / 2} y={height - 5} textAnchor="middle" className={s.barChartLabel}>
                  {item.short}
                </text>
              )}
            </g>
          );
        })}
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.8" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </svg>

      {/* Tooltip flotante */}
      {tooltip && (
        <div className={s.barChartTooltip} style={{ left: `${(tooltip.x / width) * 100}%`, top: `calc(${(tooltip.y / height) * 100}% - 4px)` }}>
          {tooltip.text}
          <div className={s.barChartTooltipArrow}></div>
        </div>
      )}
    </div>
  );
};

/**
 * LineChart: Gráfico de líneas SVG con relleno de área (area chart) y tooltips.
 * Sigue una estructura similar a BarChart, pero calcula trayectorias (paths).
 * Muestra número de reservas (conteos, no importes), por eso sus ticks no llevan formato de moneda.
 */
const LineChart = ({ data, accent = "#7D57F5" }) => {
  const [tooltip, setTooltip] = useState(null);
  const width = 760;
  const height = 300;
  const padding = { top: 28, right: 26, bottom: 42, left: 42 };
  const values = data.map((item) => item.value);
  const maxValue = Math.max(1, ...values);
  const minValue = Math.min(0, ...values);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const range = Math.max(1, maxValue - minValue);

  // Mapea los datos a coordenadas X, Y dentro del área de dibujo (padding considerado)
  const points = data.map((item, index) => {
    const x = padding.left + (index / Math.max(1, data.length - 1)) * plotWidth;
    const y = padding.top + ((maxValue - item.value) / range) * plotHeight;
    return { ...item, x, y };
  });

  const linePath = buildPath(points);
  // El área se cierra bajando al fondo derecho, luego al fondo izquierdo, y cerrando (Z)
  const areaPath = `${linePath} L ${padding.left + plotWidth} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: padding.top + ratio * plotHeight,
    value: Math.round(maxValue - ratio * range),
  }));

  return (
    <div className={s.lineChartWrapper}>
      <svg viewBox={`0 0 ${width} ${height}`} className={s.lineChartSvg} role="img" aria-label="Bookings line graph">
        <defs>
          <linearGradient id="bookingLineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.15" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor={accent} floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Líneas de cuadrícula y etiquetas del eje Y */}
        {ticks.map((tick) => (
          <g key={tick.y}>
            <line x1={padding.left} x2={padding.left + plotWidth} y1={tick.y} y2={tick.y} stroke="#f1f5f9" strokeDasharray="4 4" />
            <text x={padding.left - 12} y={tick.y + 4} textAnchor="end" className={s.lineChartTickText}>
              {tick.value >= 1000000 ? `${(tick.value / 1000000).toFixed(1).replace(/\.0$/, "")}M` : tick.value >= 1000 ? `${(tick.value / 1000).toFixed(1).replace(/\.0$/, "")}K` : tick.value}
            </text>
          </g>
        ))}

        {/* Área sombreada y línea principal */}
        <path d={areaPath} fill="url(#bookingLineFill)" />
        <path d={linePath} fill="none" stroke={accent} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#softShadow)" />

        {/* Puntos interactivos sobre la línea */}
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="18" fill="transparent" className="cursor-pointer"
              onMouseEnter={() => setTooltip({ x: point.x, y: point.y, text: `${point.value} bookings on ${point.label}` })}
              onMouseLeave={() => setTooltip(null)}
            />
            <circle cx={point.x} cy={point.y} r="5" fill="white" stroke={accent} strokeWidth="3.5" className="pointer-events-none" />
            <text x={point.x} y={height - 14} textAnchor="middle" className={s.lineChartLabel}>{point.short}</text>
          </g>
        ))}
      </svg>

      {tooltip && (
        <div className={s.lineChartTooltip} style={{ left: `${(tooltip.x / width) * 100}%`, top: `calc(${(tooltip.y / height) * 100}% - 8px)` }}>
          {tooltip.text}
          <div className={s.lineChartTooltipArrow}></div>
        </div>
      )}
    </div>
  );
};

/**
 * StatusPanel: Gráfico de dona (Donut Chart) implementado puramente con CSS (conic-gradient).
 * Es una solución más ligera que SVG para este caso de uso específico.
 */
const StatusPanel = ({ confirmed, rescheduled, cancelled }) => {
  const trueTotal = confirmed + rescheduled + cancelled;
  const denominator = Math.max(1, trueTotal); // Evita división por cero
  const confPct = (confirmed / denominator) * 100;
  const reschPct = (rescheduled / denominator) * 100;

  return (
    <div className={s.statusPanelContainerFlex}>
      <div className={s.statusDonutWrapper} style={{
        background: trueTotal === 0 ? "#f1f5f9" : `conic-gradient(#7D57F5 0% ${confPct}%, #fb923c ${confPct}% ${confPct + reschPct}%, #ef4444 ${confPct + reschPct}% 100%)`,
      }}>
        <div className={s.statusDonutInner}>
          <span className={s.statusTotalNumber}>{trueTotal}</span>
          <span className={s.statusTotalLabel}>Total</span>
        </div>
      </div>

      <div className={s.statusLegendList}>
        {[
          { label: "Confirmed", value: confirmed, pct: confPct, color: "bg-gradient-to-b from-[#CBB8FF] via-[#9B7BFF] to-[#7D57F5]" },
          { label: "Rescheduled", value: rescheduled, pct: reschPct, color: "bg-[#fb923c]" },
          { label: "Cancelled", value: cancelled, pct: (cancelled / denominator) * 100, color: "bg-[#ef4444]" },
        ].map((item) => (
          <div key={item.label} className={s.statusLegendItem}>
            <div className={s.statusLegendLeft}>
              <span className={`${s.statusColorSwatch} ${item.color}`}></span>
              <span className={s.statusLegendLabel}>{item.label}</span>
            </div>
            <div className={s.statusLegendRight}>
              <span className={s.statusLegendValue}>{item.value}</span>
              <span className={s.statusLegendPercent}>{item.pct.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 4. COMPONENTE PRINCIPAL: DashboardPage
// ============================================================================

export default function DashboardPage() {
  // --- Estado ---
  const [user, setUser] = useState(null);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [graphFilter, setGraphFilter] = useState("daily"); // 'daily' | 'weekly' | 'monthly' | 'yearly'

  // --- Efecto: Carga inicial de datos en paralelo ---
  useEffect(() => {
    const loadDashboard = async () => {
      if (!localStorage.getItem("token")) return;
      // Promise.all optimiza la carga haciendo las 4 peticiones HTTP simultáneamente
      const [meResponse, servicesResponse, bookingsResponse, paymentsResponse] = await Promise.all([
        getMe(),
        listServices(),
        listBookings(),
        getPaymentOverview(),
      ]);
      setUser(meResponse.data.user);
      setServices(servicesResponse.data.services || []);
      setBookings(bookingsResponse.data.bookings || []);
      setWallet(paymentsResponse.data.wallet || null);
    };
    loadDashboard().catch(() => { }); // Silenciar errores no críticos en la carga inicial
  }, []);

  // --- Lógica de Negocio y Estado Derivado (Optimizado con useMemo) ---

  const publicLink = user?.slug ? `${window.location.origin}/book/${user.slug}` : "";

  // Filtrado de reservas por estado
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const rescheduledBookings = bookings.filter((booking) => booking.isRescheduled);
  const cancelledBookings = bookings.filter((booking) => booking.status === "cancelled" || booking.status === "payment_failed");
  const paidBookings = bookings.filter((booking) => booking.paymentStatus === "paid");

  // Moneda del dashboard: el wallet aún no expone `currency`, así que se deriva
  // de la primera reserva pagada (cada reserva guarda su `currency`: usd/eur).
  // Igual que en AdminDashboard, el formateo divide entre 100 (minor units -> major).
  const dashboardCurrency =
    wallet?.currency || paidBookings[0]?.currency || bookings[0]?.currency || "USD";

  // Cálculo de tendencia de ingresos mensuales (% de cambio respecto al mes anterior).
  // Es un porcentaje, por lo que no depende de la moneda: compara sumas en minor units tal cual vienen del backend.
  const monthlyEarningsTrend = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentEarnings = paidBookings.filter((b) => {
      const d = getBookingDate(b, today);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, b) => sum + (b.providerPayoutAmount || b.amount || 0), 0);

    const prevEarnings = paidBookings.filter((b) => {
      const d = getBookingDate(b, today);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }).reduce((sum, b) => sum + (b.providerPayoutAmount || b.amount || 0), 0);

    if (prevEarnings === 0) return currentEarnings > 0 ? 100 : 0;
    return ((currentEarnings - prevEarnings) / prevEarnings) * 100;
  }, [paidBookings]);

  // Tendencia de reservas: cuenta reservas por periodo (LineChart muestra conteos, sin moneda)
  const bookingTrend = useMemo(
    () => generateTrendData(bookings, graphFilter, (inBucket) => inBucket.length),
    [bookings, graphFilter]
  );

  // Tendencia de ingresos: suma payouts en minor units (céntimos: 50000 = 500.00 USD/EUR)
  // y divide entre 100 para que BarChart trabaje en unidades mayores con `dashboardCurrency`.
  const earningTrend = useMemo(
    () =>
      generateTrendData(
        paidBookings,
        graphFilter,
        (inBucket) =>
          inBucket.reduce((sum, b) => sum + (b.providerPayoutAmount || b.amount || 0), 0) / 100
      ),
    [paidBookings, graphFilter]
  );

  // Top 4 servicios más reservados
  const topServices = useMemo(() => {
    return services.map((service) => ({
      ...service,
      bookingCount: bookings.filter((booking) => booking.serviceId?._id === service._id || booking.service?._id === service._id).length,
    })).sort((a, b) => b.bookingCount - a.bookingCount).slice(0, 4);
  }, [services, bookings]);

  // Próximas 3 reservas (ordenadas cronológicamente, excluyendo canceladas)
  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return bookings.map((booking) => ({ ...booking, displayDate: getBookingDate(booking, now) }))
      .filter((b) => b.displayDate >= now && b.status !== "cancelled" && b.status !== "payment_failed")
      .sort((a, b) => a.displayDate - b.displayDate)
      .slice(0, 3);
  }, [bookings]);

  // --- Manejadores de Eventos ---
  const copyPublicLink = async () => {
    if (!publicLink) return;
    await navigator.clipboard.writeText(publicLink);
    setCopyMessage("Copied");
    window.setTimeout(() => setCopyMessage(""), 1800); // Resetear mensaje después de 1.8s
  };

  // ============================================================================
  // 5. RENDERIZADO DE LA INTERFAZ (UI)
  // ============================================================================
  return (
    <AppLayout>
      <div className={s.mainContainer}>
        {/* Header Section: Saludo y acciones rápidas */}
        <header>
          <h1 className={s.headerTitle}>
            {user ? (<>Welcome Back, <span className={s.gradientText}>{user.businessName || user.name}</span> <span className="ml-2">👋</span></>) : ("Good morning 👋")}
          </h1>
          <p className={s.headerSubtitle}>Here's what's happening with your business today.</p>
          <div className={s.headerButtonsContainer}>
            <Link to="/services" className={s.headerButton}>Add services</Link>
            <Link to="/availability" className={s.headerButton}>Set availability</Link>
            <Link to="/payments" className={s.headerButton}>Payment details</Link>
          </div>
        </header>

        {/* Hero Cards: Llamada a la acción y enlace público */}
        <div className={s.heroGrid}>
          <div className={s.heroCard}>
            <div className={s.heroContent}>
              <h2 className={s.heroTitle}>Grow your practice.<br />Impact more lives.</h2>
              {publicLink ? (
                <a href={publicLink} target="_blank" rel="noreferrer" className={s.heroButton}>
                  View booking page <ArrowRight className={s.arrowIcon} />
                </a>
              ) : (
                <Link to="/profile" className={s.heroButton}>Setup booking page <ArrowRight className={s.arrowIcon} /></Link>
              )}
            </div>
            <div className={s.heroImageWrapper}>
              <img src={p1Image} alt="Hero" className={s.heroImage} />
            </div>
          </div>

          <div className={s.publicLinkCard}>
            <h3 className={s.publicLinkTitle}>Public booking link</h3>
            <div className={s.publicLinkInputContainer}>
              <span className={s.publicLinkText}>{publicLink || "Save profile to generate..."}</span>
              {publicLink && (
                <button onClick={copyPublicLink} className={s.copyButton} aria-label={copyMessage || "Copy booking link"}>
                  <Copy className={s.copyIcon} />
                </button>
              )}
            </div>
            <p className={s.publicLinkHelper}>Share your link and start getting<br />bookings instantly.</p>

            <h4 className={s.shareTitle}>Share your link</h4>
            <div className={s.socialIconsContainer}>
              <a href={`https://wa.me/?text=${encodeURIComponent("Book a session with me: " + publicLink)}`} target="_blank" rel="noreferrer" className={s.socialIconLink}>
                <img src={whatsappLogo} alt="WhatsApp" className={s.socialIconImgWhatsapp} />
              </a>
              <a href={`https://www.instagram.com/`} target="_blank" rel="noreferrer" onClick={() => copyPublicLink()} title="Link copied to clipboard for Instagram bio" className={s.socialIconLinkInstagram}>
                <img src={instaLogo} alt="Instagram" className={s.socialIconImgInstagram} />
              </a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicLink)}`} target="_blank" rel="noreferrer" className={s.socialIconLinkInstagram}>
                <img src={facebookLogo} alt="Facebook" className={s.socialIconImgFacebook} />
              </a>
              <a href={buildGmailShareUrl(publicLink)} target="_blank" rel="noreferrer" className={s.socialIconLinkInstagram}>
                <img src={gmailLogo} alt="Gmail" className={s.socialIconImgGmail} />
              </a>
              <button onClick={copyPublicLink} className={s.copySocialButton}>
                <Copy className={s.copyIcon} />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Stats Cards: Resumen numérico rápido ("Total Income" suma payouts en minor units y los formatea en dashboardCurrency) */}
        <div className={s.statsGrid}>
          {[
            { label: "Total Bookings", value: bookings.length, icon: Calendar, icfg: "text-[#7D57F5]", ibg: "bg-[#F4F0FF]" },
            { label: "Confirmed", value: confirmedBookings.length, icon: CheckCircle, icfg: "text-[#16a34a]", ibg: "bg-[#eafbef]" },
            { label: "Rescheduled", value: rescheduledBookings.length, icon: RefreshCcw, icfg: "text-[#ea580c]", ibg: "bg-[#ffedd5]" },
            { label: "Total Income", value: formatMoney(paidBookings.reduce((s, b) => s + (b.providerPayoutAmount || b.amount || 0), 0), dashboardCurrency), icon: Wallet, icfg: "text-[#16a34a]", ibg: "bg-[#eafbef]" },
          ].map((stat, i) => (
            <div key={i} className={s.statCard}>
              <div className={`${s.statIconWrapper} ${stat.ibg} ${stat.icfg}`}>
                <stat.icon className="w-[22px] h-[22px]" />
              </div>
              <div>
                <p className={s.statLabel}>{stat.label}</p>
                <h2 className={s.statValue}>{stat.value}</h2>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section: Gráficos de tendencias y estado */}
        <section className={s.chartsGrid}>
          <div className={s.chartCard}>
            <div className={s.chartHeader}>
              <h3 className={s.chartTitle}>Booking Overview</h3>
              <select value={graphFilter} onChange={(e) => setGraphFilter(e.target.value)} className={s.chartSelect}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className={s.chartOverflow}>
              <div className={s.chartInnerWrapper}>
                <LineChart data={bookingTrend} accent="#7D57F5" />
              </div>
            </div>
          </div>

          <div className={s.chartCard}>
            <h3 className={s.chartTitle}>Bookings by Status</h3>
            <div className={s.statusPanelContainer}>
              <StatusPanel confirmed={confirmedBookings.length} rescheduled={rescheduledBookings.length} cancelled={cancelledBookings.length} />
            </div>
          </div>
        </section>

        {/* Bottom Section: Top Services & Earnings Overview */}
        <section className={s.bottomGrid}>
          <div className={s.topServicesCard}>
            <div className={s.servicesHeader}>
              <h3 className={s.chartTitle}>Top Services</h3>
              <Link to="/services" className={s.viewAllLink}>View all</Link>
            </div>
            <div className={s.servicesList}>
              {topServices.map((service, index) => {
                const max = Math.max(1, ...topServices.map((i) => i.bookingCount));
                const pct = ((service.bookingCount / max) * 100).toFixed(0);
                const truePct = ((service.bookingCount / Math.max(1, bookings.length)) * 100).toFixed(0);
                const barColors = ["bg-[#7c3aed]", "bg-[#2563eb]", "bg-[#16a34a]", "bg-[#ea580c]"];
                const barColor = barColors[index % barColors.length];

                return (
                  <div key={service._id} className="flex items-center mb-6 last:mb-0">
                    <div className={`${s.serviceIconBox} mr-4`}>
                      <img src={ICON_MAP[service.icon || "C1.png"]} alt={service.name} className={s.serviceIconImg} />
                    </div>
                    <div className="flex-1 pr-6">
                      <p className="text-[14px] font-semibold text-slate-800 leading-tight">{service.name}</p>
                      <p className="text-[12px] font-medium text-slate-500 mt-1 mb-2.5">{service.bookingCount} bookings</p>
                      <div className="w-full h-[4px] bg-slate-50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%`, transition: "width 1s ease-out" }}></div>
                      </div>
                    </div>
                    <span className="text-[13px] font-semibold text-slate-600 text-right min-w-[36px]">{truePct}%</span>
                  </div>
                );
              })}
              {topServices.length === 0 && (
                <p className="text-[13px] font-medium text-slate-500 text-center pt-10">Add services to start tracking demand.</p>
              )}
            </div>
          </div>

          <div className={s.earningsCard}>
            <div className={s.earningsHeader}>
              <h3 className={s.chartTitle}>Earnings Overview</h3>
              <select value={graphFilter} onChange={(e) => setGraphFilter(e.target.value)} className={s.earningsSelect}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className={s.earningsAmountRow}>
              {/* Saldo disponible del wallet (minor units) formateado en la moneda del dashboard (USD/EUR) */}
              <h2 className={s.earningsAmount}>{formatMoney(wallet?.available || 0, dashboardCurrency)}</h2>
              <div className={s.earningsTrendContainer}>
                <span className={monthlyEarningsTrend >= 0 ? s.earningsTrendUp : s.earningsTrendDown}>
                  <ArrowRight className={`${s.trendArrow} ${monthlyEarningsTrend >= 0 ? "-rotate-45" : "rotate-45"} mr-1`} />
                  {Math.abs(monthlyEarningsTrend).toFixed(1)}%
                </span>
                <span className={s.trendLabel}>from last month</span>
              </div>
            </div>
            <div className={s.chartOverflow}>
              <div className={s.chartInnerWrapper}>
                <BarChart data={earningTrend} accent="#7c3aed" currency={dashboardCurrency} />
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Bookings & Integrations */}
        <section className={s.bottomGrid}>
          <div className={s.upcomingCard}>
            <div className={s.upcomingHeader}>
              <h3 className={s.chartTitle}>Upcoming Bookings</h3>
              <Link to="/bookings" className={s.viewAllLink}>View all</Link>
            </div>
            <div className={s.upcomingList}>
              {upcomingBookings.map((booking) => {
                const isConfirmed = booking.status === "confirmed";
                const badgeColors = isConfirmed ? s.badgeConfirmed : s.badgePending;
                const date = booking.displayDate;
                return (
                  <div key={booking._id} className={s.bookingRow}>
                    <div className={s.bookingLeft}>
                      <div className={s.avatarBox}>
                        <img src={AVATAR_MAP[booking.customerAvatar || "A1.png"]} alt={booking.customerName} className={s.avatarImg} />
                      </div>
                      <div>
                        <p className={s.bookingCustomerName}>{booking.customerName || "Guest"}</p>
                        <p className={s.bookingServiceName}>{booking.service?.name || "Service"}</p>
                      </div>
                    </div>
                    <div className={s.bookingRight}>
                      <div className={s.bookingDateTimeWrapper}>
                        <div className={s.bookingDate}>
                          <Calendar className={s.calendarIconSmall} /> {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <div className={s.bookingTime}>
                          <Clock className={s.clockIconSmall} /> {booking.startTime && booking.endTime ? `${booking.startTime} - ${booking.endTime}` : date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <span className={`${s.bookingBadgeBase} ${badgeColors}`}>{isConfirmed ? "Confirmed" : "Pending"}</span>
                    </div>
                  </div>
                );
              })}
              {upcomingBookings.length === 0 && (
                <p className="text-[13px] font-medium text-slate-500 text-center pt-8">No upcoming bookings.</p>
              )}
            </div>
          </div>

          <div className={s.integrationsCard}>
            <h3 className={s.integrationsTitle}>Integrations</h3>
            <div className={s.integrationsList}>
              <div className={s.integrationItem}>
                <div className={s.integrationIconBox}>
                  <img src={googleCalendarLogo} alt="Google Calendar" className={s.integrationIconImgDefault} />
                </div>
                <div>
                  <p className={s.integrationName}>Google Calendar</p>
                  <div className={s.integrationStatus}>
                    <CheckCircle className={s.checkIcon} /> <span className={s.statusText}>Connected</span>
                  </div>
                </div>
              </div>
              <div className={s.integrationItem}>
                <div className={s.integrationIconBox}>
                  <img src={gmailLogo} alt="Gmail" className={s.integrationIconImgGmail} />
                </div>
                <div>
                  <p className={s.integrationName}>Gmail</p>
                  <div className={s.integrationStatus}>
                    <CheckCircle className={s.checkIconSmall} /> <span className={s.statusTextSmall}>Connected</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={s.integrationsImageWrapper}>
              <img src={p5Image} alt="Integration visual" className={s.integrationsImage} />
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}