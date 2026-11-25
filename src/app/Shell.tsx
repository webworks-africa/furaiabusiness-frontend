import { useQueryClient } from "@tanstack/react-query";
import { authAdapter } from "../auth/adapter";
import { setCsrf } from "../auth/csrf";
import { clearMockIdentity } from "../auth/mockIdentity";
import { ApiError } from "../api/http";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  NavLink,
  Outlet,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Menu, X, ShieldCheck } from "lucide-react";
import { navigation } from "./navigation";
import { useSession } from "../application/queries";
import { StatePanel } from "../components/StatePanel";
import { config } from "../api/config";
import { can } from "../auth/adapter";
import { MockControls } from "../mocks/MockControls";
export function Shell() {
  const [open, setOpen] = useState(false);
  const session = useSession();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [signoutError, setSignoutError] = useState("");
  useEffect(() => {
    const end = () => {
      void cache.cancelQueries();
      cache.clear();
      setCsrf();
      clearMockIdentity();
      navigate("/login", {
        replace: true,
        state: { expired: true, returnTo: location.pathname + location.search },
      });
    };
    window.addEventListener("furaia-session-ended", end);
    return () => window.removeEventListener("furaia-session-ended", end);
  }, [cache, navigate, location.pathname, location.search]);
  useEffect(() => {
    if (!session.data) return;
    const check = () => {
      if (Date.now() + session.data.serverOffset >= session.data.deadline) {
        setCsrf();
        clearMockIdentity();
        void cache.cancelQueries();
        cache.clear();
        window.dispatchEvent(new Event("furaia-session-ended"));
      }
    };
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [session.data, cache]);
  useEffect(() => {
    if (session.error instanceof ApiError && session.error.status === 401) {
      void cache.cancelQueries();
      cache.clear();
      setCsrf();
      clearMockIdentity();
    }
  }, [session.error, cache]);
  const navigationRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const panel = navigationRef.current;
    const opener = menuRef.current;
    const focusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>("a[href], button") ?? [],
      ).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open]);
  if (session.isPending)
    return (
      <main className="standalone">
        <StatePanel />
      </main>
    );
  if (session.error instanceof ApiError && session.error.status === 401)
    return (
      <Navigate
        to="/login"
        state={{ returnTo: location.pathname + location.search, expired: true }}
        replace
      />
    );
  if (session.error)
    return (
      <main className="standalone">
        <StatePanel
          error={session.error}
          retry={() => void session.refetch()}
        />
        {import.meta.env.DEV && config.mock && <MockControls />}
      </main>
    );
  if (
    !can(session.data.permissions, "banking:read") &&
    location.pathname === "/"
  )
    return (
      <Navigate
        to={
          can(session.data.permissions, "developer:read")
            ? "/developers"
            : "/onboarding/status"
        }
        replace
      />
    );
  const adminOnly = ["/settings/workflows", "/settings/tax"].includes(
    location.pathname,
  );
  const toolRoute = [
    "/send-money",
    "/procurement",
    "/payroll",
    "/pos",
    "/loans",
  ].some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/"),
  );
  const bankingRoute = [
    "/accounts",
    "/transactions",
    "/statements",
    "/reports",
    "/payments",
    "/cards",
  ].some(
    (path) =>
      location.pathname === path || location.pathname.startsWith(path + "/"),
  );
  const developerRoute =
    location.pathname === "/developers" ||
    location.pathname.startsWith("/developers/");
  const reportRoute =
    location.pathname === "/reports" ||
    location.pathname.startsWith("/reports/");
  const paymentRoute =
    location.pathname === "/payments" ||
    location.pathname.startsWith("/payments/");
  const billingRoute = [
    "/customers",
    "/quotations",
    "/invoices",
    "/payment-links",
    "/receipts",
  ].some(
    (path) =>
      location.pathname === path || location.pathname.startsWith(path + "/"),
  );
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside
        ref={navigationRef}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        className={open ? "sidebar open" : "sidebar"}
        aria-label="Business navigation"
      >
        <div className="brand">
          <span className="brand-mark">F</span>
          <div>
            FURAIA<small>Business Portal</small>
          </div>
          <button
            className="mobile-icon"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        {navigation.map((group) => (
          <details className="nav-group" key={group.label} open>
            <summary className="nav-label">
              {group.label}
              <span aria-hidden="true">⌄</span>
            </summary>
            <nav aria-label={group.label}>
              {group.items
                .filter(
                  (i) =>
                    (i.path !== "/team-and-approvals" ||
                      can(session.data.permissions, "team:read")) &&
                    (![
                      "/send-money",
                      "/procurement",
                      "/payroll",
                      "/pos",
                      "/loans",
                    ].includes(i.path) ||
                      can(session.data.permissions, "payments:write")) &&
                    (![
                      "/customers",
                      "/quotations",
                      "/invoices",
                      "/payment-links",
                      "/receipts",
                    ].includes(i.path) ||
                      can(session.data.permissions, "billing:read")) &&
                    (i.path !== "/payments" ||
                      can(session.data.permissions, "payments:read")) &&
                    (i.path !== "/reports" ||
                      can(session.data.permissions, "reports:read")) &&
                    (i.path !== "/developers" ||
                      can(session.data.permissions, "developer:read")) &&
                    (![
                      "/",
                      "/accounts",
                      "/transactions",
                      "/payments",
                      "/cards",
                      "/reports",
                    ].includes(i.path) ||
                      can(session.data.permissions, "banking:read")),
                )
                .map((i) => (
                  <NavLink
                    end={i.path === "/"}
                    onClick={() => setOpen(false)}
                    key={i.path}
                    to={i.path}
                  >
                    <i.icon size={17} />
                    {i.label}
                  </NavLink>
                ))}
            </nav>
          </details>
        ))}
        <div className="sidebar-footer">
          <ShieldCheck size={16} />
          <div>
            {config.mock ? "Simulated environment" : "Business workspace"}
            <small>
              {config.mock
                ? "No live rails connected"
                : "Service health not connected"}
            </small>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-icon"
            ref={menuRef}
            aria-expanded={open}
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="business">
            <span className="avatar">W</span>
            <div>
              <strong>{session.data.business}</strong>
              <small>Nairobi, KE</small>
            </div>
          </div>
          <span className="environment">
            {config.mock ? "DEVELOPMENT · MOCK DATA" : "REAL API MODE"}
          </span>
          <details
            className="profile-menu"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.currentTarget.open = false;
                e.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary aria-label="Profile menu">
              <span className="avatar light">
                {session.data.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <span>
                {session.data.name}
                <small>{session.data.role}</small>
              </span>
            </summary>
            <nav aria-label="Profile actions">
              <NavLink
                to="/settings"
                onClick={(e) => {
                  const d = e.currentTarget.closest("details");
                  if (d) d.open = false;
                }}
              >
                Settings
              </NavLink>
              <button
                className="signout-button"
                onClick={async () => {
                  setSignoutError("");
                  try {
                    await authAdapter.logout();
                    await cache.cancelQueries();
                    cache.clear();
                    clearMockIdentity();
                    navigate("/login", { replace: true });
                  } catch {
                    setSignoutError("Sign out unavailable. Try again.");
                  }
                }}
              >
                Sign out
              </button>
            </nav>
          </details>
        </header>
        <main id="main" tabIndex={-1}>
          {signoutError && <p role="alert">{signoutError}</p>}
          {(adminOnly && session.data.role !== "admin") ||
          (location.pathname === "/team-and-approvals" &&
            !can(session.data.permissions, "team:read")) ||
          (toolRoute && !can(session.data.permissions, "payments:write")) ||
          (developerRoute &&
            !can(session.data.permissions, "developer:read")) ||
          (reportRoute && !can(session.data.permissions, "reports:read")) ||
          (paymentRoute && !can(session.data.permissions, "payments:read")) ||
          (bankingRoute && !can(session.data.permissions, "banking:read")) ||
          (billingRoute && !can(session.data.permissions, "billing:read")) ? (
            <StatePanel error={new ApiError(403, null)} />
          ) : (
            <Suspense fallback={<StatePanel />}>
              <Outlet />
            </Suspense>
          )}
        </main>
        {import.meta.env.DEV && config.mock && <MockControls />}
      </div>
    </>
  );
}
export function PublicShell() {
  const location = useLocation();
  const docs =
    location.pathname === "/docs" || location.pathname === "/api-banking";
  return (
    <div className="public-shell">
      <header>
        <span className="brand-mark">F</span> FURAIA{" "}
        <span className="muted">
          {docs ? "Developer hub" : "Documents & checkout"}
        </span>
        {docs && (
          <nav className="action-row" aria-label="Developer hub">
            <NavLink to="/api-banking">API banking</NavLink>
            <NavLink to="/docs">Documentation</NavLink>
            <NavLink to="/login">Sign in</NavLink>
          </nav>
        )}
      </header>
      <main>
        <Suspense fallback={<StatePanel />}>
          <Outlet />
        </Suspense>
      </main>
      <footer>
        {docs
          ? "Furaia developer reference · proposed contracts, development simulations"
          : "Payment status must be confirmed by Furaia."}
      </footer>
    </div>
  );
}
