import { Link, NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import hexagonLogo from "@/assets/hexagon_Logo.png";
import { ChrevronDown, LogOut, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getMe } from "../api/auth";
import { appLayoutStyles } from "../assets/dummyStyles";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/profile", label: "Profile" },
  { to: "/services", label: "Services" },
  { to: "/availability", label: "Availability" },
  { to: "/bookings", label: "Bookings" },
  { to: "/payments", label: "Payments" },
];


const AppLayout = ({ children }) => {

  const navigate = useNavigate();
  const hasToken = Boolean(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);


  // Detecta si el usuario hace clic fuera del menu desplegable para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, []);

  // Si existe token de usuario, carga el perfil
  useEffect(() => {
    if (hasToken) {
      getMe().then(({ data }) => setUser(data?.user).catch(() => { }))
    }
  }, [hasToken]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const displayName = user?.bussinessName || "My Business";
  const avatarInitial = displayName.slice(0, 1).toUpperCase();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  return (
    <div className={s.container}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link to="/" className={s.logoLink}>
            <img src={logo} className={s.logoImg} />
            <span className={s.logoText}>BookMe</span>
          </Link>

          {/* Navigation Desktop */}
          <nav className={s.navDesktop}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? s.navLinkActive : s.navLinkInactive
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right section */}
          <div className={s.rightSection}>
            {hasToken ? (
              <div className={s.accountMenu} ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={s.avatarButton}
                >
                  <div className={s.avatarCircle}>{avatarInitial}</div>
                  <span className={s.displayName}>{displayName}</span>
                  <ChevronDown
                    className={
                      dropdownOpen ? `${s.chevron} ${s.chevronOpen}` : s.chevron
                    }
                  />
                </button>

                {dropdownOpen && (
                  <div className={s.dropdown}>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        Logout();
                      }}
                      className={s.logoutButton}
                    >
                      <LogOut className={s.logoutIcon} />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className={s.loginLink}>
                Log in
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              className={s.mobileMenuButton}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className={s.srOnly}>Open main menu</span>
              {mobileMenuOpen ? (
                <X className={s.mobileMenuIcon} aria-hidden="true" />
              ) : (
                <SquareMenu className={s.mobileMenuIcon} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <div className={s.mobileNav}>
            <div className={s.mobileNavInner}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    isActive ? s.mobileNavLinkActive : s.mobileNavLinkInactive
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className={s.main}>{children}</main>

      <footer className={s.footerBrandSection}>
        <div className={s.footerCard}>
          <div className={s.footerCardTop}>
            <div className={s.footerBrandMark}>
              <img src={logo} className={s.footerMiniLogo} />
              <span className={s.footerBrandName}>BookMe</span>
            </div>
          </div>
          <div className={s.footerRule} />

          <div className={s.footerBottom}>
            <div className={s.footerLegalGroup}>
              <span className={s.footerCopyright}>
                © 2026 BookMe. All rights reserved.
              </span>
              <div className={s.footerLinks}>
                <Link to="/privacy" className={s.footerLink}>
                  Privacy Policy
                </Link>
                <span className={s.footerSeparator}>·</span>
                <Link to="/terms" className={s.footerLink}>
                  Terms of Service
                </Link>
              </div>
            </div>
            <div className={s.footerCreditWrapper}>
              <a
                href="https://hexagondigitalservices.com"
                target="_blank"
                rel="noreferrer"
                className={s.footerCreditLink}
              >
                <img src={hexagonLogo} className={s.footerCreditLogo} />
                <span className={s.footerCreditText}>
                  A{" "}
                  <span className={s.footerCreditName}>
                    Hexagon Digital Services
                  </span>
                </span>
              </a>
            </div>
          </div>
        </div>
        <div className={s.footerWatermarkWrapper}>
          <div className={s.footerLogoWatermark}>BookMe</div>
        </div>
      </footer>
    </div>
  );
}

export default AppLayout