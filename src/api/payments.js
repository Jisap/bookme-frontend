import client from "./client";

/**
 * Capa de acceso a la API de pagos y billetera del proveedor.
 * Usa la instancia centralizada `client` (baseURL `VITE_API_URL`, token `localStorage.token`).
 */

/**
 * Obtiene el resumen de pagos del proveedor autenticado:
 * datos de cobro, saldo de billetera, transacciones y retiros recientes.
 * @returns {Promise<import('axios').AxiosResponse>} Resumen de pagos.
 */
export const getPaymentOverview = () => client.get("/payments");

/**
 * Guarda o actualiza los datos de cobro del proveedor (banco/UPI).
 * @param {Object} data - Datos de cobro ({ accountHolderName, bankName, accountNumber, ifsc, upiId }).
 * @returns {Promise<import('axios').AxiosResponse>} Datos de cobro guardados.
 */
export const updatePayoutDetails = (data) => client.put("/payments/payout-details", data);

/**
 * Solicita un retiro de fondos desde el saldo disponible de la billetera.
 * @param {number} amount - Importe a retirar en cents / minor units USD-EUR (mínimo 100).
 * @returns {Promise<import('axios').AxiosResponse>} Retiro creado.
 */
export const requestWithdrawal = (amount) => client.post("/payments/withdrawals", { amount });