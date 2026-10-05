import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock all heavy pages with light stubs so App routing can be tested in jsdom
vi.mock("../admin/AdminDashboard", () => ({ default: () => <div>Admin Dashboard</div> }));
vi.mock("../admin/AdminLoginPage", () => ({ default: () => <div>Admin Login</div> }));
vi.mock("../pages/AuthPage", () => ({ default: () => <div>Auth Page</div> }));
vi.mock("../pages/DashboardPage", () => ({ default: () => <div>Dashboard</div> }));
vi.mock("../pages/ProfilePage", () => ({ default: () => <div>Profile Page</div> }));
vi.mock("../pages/BookingPage", () => ({ default: () => <div>Bookings Page</div> }));
vi.mock("../pages/PublicBookingPage", () => ({ default: () => <div>Public Booking</div> }));
vi.mock("../pages/BookingSuccessPage", () => ({ default: () => <div>Booking Success</div> }));
vi.mock("../pages/BookingCancelledPage", () => ({ default: () => <div>Booking Cancelled</div> }));
vi.mock("../pages/PaymentsPage", () => ({ default: () => <div>Payments Page</div> }));
vi.mock("../pages/ServicesPage", () => ({ default: () => <div>Services Page</div> }));
vi.mock("../pages/AvailabilityPage", () => ({ default: () => <div>Availability Page</div> }));
vi.mock("../pages/PrivacyPolicyPage", () => ({ default: () => <div>Privacy Policy</div> }));
vi.mock("../pages/TermsOfServicePage", () => ({ default: () => <div>Terms of Service</div> }));

import App from "../App";

const renderApp = (route) => {
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
};

beforeEach(() => {
  localStorage.clear();
});

describe("App routes", () => {
  it("renders public booking page without auth", () => {
    renderApp("/book/some-slug");
    expect(screen.getByText("Public Booking")).toBeInTheDocument();
  });

  it("renders booking success/cancelled without auth", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/booking/success"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("Booking Success")).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter initialEntries={["/booking/cancelled"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("Booking Cancelled")).toBeInTheDocument();
  });

  it("renders privacy and terms without auth (regression: missing routes)", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter initialEntries={["/terms"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
  });

  it("protects dashboard: redirects to login without token", () => {
    renderApp("/");
    expect(screen.getByText("Auth Page")).toBeInTheDocument();
  });

  it("renders dashboard with token", () => {
    localStorage.setItem("token", "t");
    renderApp("/");
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("redirects unknown routes to / (catch-all)", () => {
    localStorage.setItem("token", "t");
    renderApp("/ruta-que-no-existe-xyz");
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("redirects /admin to dashboard when admin logged in", () => {
    localStorage.setItem("adminToken", "a");
    renderApp("/admin");
    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
  });
});
