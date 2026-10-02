/**
 * payments.js
 *
 * Capa de acceso a la API de pagos y billetera del proveedor.
 * Propósito de negocio: consultar cuánto ha ganado el proveedor (wallet),
 * guardar dónde cobrar (datos bancarios/UPI) y pedir retiros que luego
 * aprueba el admin (`paid/rejected`).
 *
 * Backend (ver `backend/routes/paymentRoute.js` + `paymentController.js`,
 * montado en `/api/payments`):
 * - `GET /` -> `getPaymentOverview` (resumen + transacciones + retiros).
 * - `PUT /payout-details` -> `updatePayoutDetails` (banco/UPI).
 * - `POST /withdrawals` (+ alias legacy `/withdrawls` con typo) -> `requestWithdrawal`.
 *
 * Auth: todas exigen JWT de proveedor. `client` (ver `api/client.js`) inyecta
 * `Authorization: Bearer <localStorage.token>` y ante un 401 limpia la sesión
 * y redirige a `/login`.
 *
 * Moneda: USD/EUR (acordado). Los `amount` viajan en minor units (cents:
 * `5000` = `50.00`). El backend valida mínimo `100` cents y que no supere
 * `summary.available` (`earned - held + reversed`).
 *
 * Uso típico: `DashboardPage` llama a `getPaymentOverview()` en la carga
 * paralela para pintar `wallet.available` y la tendencia de ingresos.
 */

import client from "./client";

// ============================================================================
// 1. RESUMEN DE PAGOS / WALLET
// ============================================================================

/**
 * Obtiene el resumen de pagos del proveedor autenticado.
 *
 * Backend `GET /payments` devuelve `{ payoutDetails, wallet, transactions[15], withdrawals[10] }`,
 * donde `wallet = { earned, withdrawOrPending, pendingWithdrawals, paidWithdrawals,
 * availableBalance, available }` (ver `backend/utils/wallet.js:getWalletSummary`).
 *
 * @returns {Promise<import('axios').AxiosResponse>} Resumen de pagos.
 * @throws {import('axios').AxiosError} 401 sin token/expirado (redirige a `/login`).
 */
export const getPaymentOverview = () => client.get("/payments");

// ============================================================================
// 2. DATOS DE COBRO (PAYOUT DETAILS)
// ============================================================================

/**
 * Guarda o actualiza los datos de cobro del proveedor (banco/UPI).
 *
 * Backend `PUT /payments/payout-details` exige `accountHolderName` + (`accountNumber` o `upiId`);
 * solo persiste `accountLast4` (enmascara la cuenta) y marca `isComplete`, necesario
 * para poder pedir retiros. 400 si faltan datos.
 *
 * @param {Object} data - Datos de cobro ({ accountHolderName, bankName, accountNumber, ifsc, upiId }).
 * @returns {Promise<import('axios').AxiosResponse>} Datos de cobro guardados.
 */
export const updatePayoutDetails = (data) => client.put("/payments/payout-details", data);

// ============================================================================
// 3. RETIROS (WITHDRAWALS)
// ============================================================================

/**
 * Solicita un retiro de fondos desde el saldo disponible de la billetera.
 *
 * Backend `POST /payments/withdrawals` valida: `payoutDetails.isComplete`,
 * mínimo `100` cents y `amount <= available`. Crea `Withdrawal(pending)` +
 * `WalletTransaction(withdrawal_hold, pending)`. El admin lo resuelve después
 * (`processing/paid` o `rejected` + `withdrawal_reversal`).
 *
 * @param {number} amount - Importe a retirar en cents / minor units USD-EUR (mínimo 100).
 * @returns {Promise<import('axios').AxiosResponse>} Retiro creado (201 `{ message, withdrawal }`).
 */
export const requestWithdrawal = (amount) => client.post("/payments/withdrawals", { amount });
