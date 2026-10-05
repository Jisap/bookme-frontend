import { describe, it, expect } from "vitest";
import {
  formatMoney,
  transactionLabel,
  transactionAmount,
} from "../pages/PaymentsPage";

describe("formatMoney", () => {
  it("formats minor units to major (paise/cents -> rupees)", () => {
    // 50000 minor units = 500.00
    const formatted = formatMoney(50000, "INR");
    expect(formatted).toContain("500");
  });

  it("defaults to 0", () => {
    expect(formatMoney(undefined)).toContain("0");
  });
});

describe("transactionAmount", () => {
  it("negates withdrawal_hold", () => {
    expect(transactionAmount({ type: "withdrawal_hold", amount: 1000 })).toBe(-1000);
  });

  it("keeps payout positive", () => {
    expect(transactionAmount({ type: "booking_payout", amount: 900 })).toBe(900);
  });
});

describe("transactionLabel", () => {
  it("labels stripe payout", () => {
    expect(
      transactionLabel({
        type: "booking_payout",
        description: "Booking payout for Stripe session xyz",
      })
    ).toBe("Booking payment received");
  });

  it("labels withdrawal_hold", () => {
    expect(transactionLabel({ type: "withdrawal_hold" })).toBe("Withdrawal requested");
  });

  it("labels withdrawal_reversal", () => {
    expect(transactionLabel({ type: "withdrawal_reversal" })).toBe("Withdrawal returned");
  });

  it("falls back to description or type", () => {
    expect(transactionLabel({ type: "custom", description: "Custom desc" })).toBe("Custom desc");
    expect(transactionLabel({ type: "custom" })).toBe("custom");
  });
});
