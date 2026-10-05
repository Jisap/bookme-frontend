import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  ProtectedRoute,
  PublicOnlyRoute,
  AdminProtectedRoute,
  AdminPublicOnlyRoute,
} from "../App";

const renderWithRouter = (initialEntries, element) =>
  render(<MemoryRouter initialEntries={initialEntries}>{element}</MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
});

describe("ProtectedRoute", () => {
  it("redirects to /login when no token", () => {
    renderWithRouter(
      ["/profile"],
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <div>Profile Page</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    );
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("renders children when token exists", () => {
    localStorage.setItem("token", "fake-token");
    renderWithRouter(
      ["/profile"],
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <div>Profile Page</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    );
    expect(screen.getByText("Profile Page")).toBeInTheDocument();
  });
});

describe("PublicOnlyRoute", () => {
  it("redirects to / when token exists", () => {
    localStorage.setItem("token", "fake-token");
    renderWithRouter(
      ["/login"],
      <Routes>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <div>Login Page</div>
            </PublicOnlyRoute>
          }
        />
      </Routes>
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders login when no token", () => {
    renderWithRouter(
      ["/login"],
      <Routes>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <div>Login Page</div>
            </PublicOnlyRoute>
          }
        />
      </Routes>
    );
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });
});

describe("AdminProtectedRoute", () => {
  it("redirects to /admin/login when no adminToken (regression: missing leading slash)", () => {
    renderWithRouter(
      ["/admin/dashboard"],
      <Routes>
        <Route path="/admin/login" element={<div>Admin Login</div>} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <div>Admin Dashboard</div>
            </AdminProtectedRoute>
          }
        />
      </Routes>
    );
    expect(screen.getByText("Admin Login")).toBeInTheDocument();
  });

  it("renders dashboard when adminToken exists", () => {
    localStorage.setItem("adminToken", "admin-token");
    renderWithRouter(
      ["/admin/dashboard"],
      <Routes>
        <Route path="/admin/login" element={<div>Admin Login</div>} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <div>Admin Dashboard</div>
            </AdminProtectedRoute>
          }
        />
      </Routes>
    );
    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
  });
});

describe("AdminPublicOnlyRoute", () => {
  it("redirects logged admin to dashboard", () => {
    localStorage.setItem("adminToken", "admin-token");
    renderWithRouter(
      ["/admin/login"],
      <Routes>
        <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
        <Route
          path="/admin/login"
          element={
            <AdminPublicOnlyRoute>
              <div>Admin Login</div>
            </AdminPublicOnlyRoute>
          }
        />
      </Routes>
    );
    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
  });
});
