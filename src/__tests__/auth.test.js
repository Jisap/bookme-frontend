import { describe, it, expect } from "vitest";
import { getPostAuthRedirect } from "../pages/AuthPage";

describe("getPostAuthRedirect", () => {
  it("returns / when no origin (direct login)", () => {
    expect(getPostAuthRedirect(undefined)).toBe("/");
    expect(getPostAuthRedirect(null)).toBe("/");
  });

  it("restores origin pathname with search", () => {
    expect(
      getPostAuthRedirect({ pathname: "/profile", search: "?calendar=connected" })
    ).toBe("/profile?calendar=connected");
  });

  it("handles pathname without search", () => {
    expect(getPostAuthRedirect({ pathname: "/bookings", search: "" })).toBe("/bookings");
    expect(getPostAuthRedirect({ pathname: "/payments" })).toBe("/payments");
  });
});
