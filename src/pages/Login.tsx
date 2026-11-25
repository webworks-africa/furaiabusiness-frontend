import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import {
  loginSchema,
  safeReturnTo,
  type LoginInput,
} from "../api/identityContracts";
import { authAdapter } from "../auth/adapter";
import { rememberMockIdentity } from "../auth/mockIdentity";
import { config } from "../api/config";
import { ApiError } from "../api/http";
import { useSession, keys } from "../application/queries";
import { Button } from "../components/ui/button";
export function Login() {
  const location = useLocation(),
    navigate = useNavigate(),
    cache = useQueryClient(),
    session = useSession();
  const [error, setError] = useState(""),
    [visible, setVisible] = useState(false);
  const state = location.state as {
    returnTo?: unknown;
    expired?: boolean;
  } | null;
  const target = safeReturnTo(
    state?.returnTo ?? new URLSearchParams(location.search).get("returnTo"),
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", challenge: "" },
  });
  if (session.data) return <Navigate to={target} replace />;
  return (
    <div className="login-screen">
      <aside className="login-aside">
        <div className="brand">
          <span className="brand-mark">F</span>
          <div>
            FURAIA<small>Business Portal</small>
          </div>
        </div>
        <div>
          <ShieldCheck size={32} />
          <h1>
            Built around
            <br />
            your business.
          </h1>
          <p>Your accounts, payments and business finances in one workspace.</p>
        </div>
        <small>Business and partner access · Africa/Nairobi</small>
      </aside>
      <main className="login-main">
        <div className="login-card">
          <span className="environment">
            {config.mock
              ? "DEVELOPMENT · SIMULATED IDENTITY"
              : "BUSINESS ACCESS"}
          </span>
          <h1>Sign in to Furaia</h1>
          <p>Continue to your business workspace.</p>
          {state?.expired && (
            <p role="status" className="notice">
              Sign in to continue. Your original payment reference is preserved;
              signing in does not retry a payment.
            </p>
          )}
          {!config.mock && (
            <p className="notice">
              Uses the configured identity service. Secure session and
              verification support must be supplied by your backend.
            </p>
          )}
          <form
            noValidate
            onSubmit={handleSubmit(async (values) => {
              setError("");
              try {
                const data = await authAdapter.login(values);
                await cache.cancelQueries();
                cache.clear();
                cache.setQueryData(keys.session, data);
                rememberMockIdentity(data.role);
                navigate(target, { replace: true });
              } catch (e) {
                setError(
                  e instanceof ApiError && [401, 403].includes(e.status)
                    ? "Sign-in details were not accepted. Check your identifier and verification challenge."
                    : "Sign-in service unavailable. Please try again.",
                );
              }
            })}
          >
            {error && (
              <p className="notice danger" role="alert">
                {error}
              </p>
            )}
            <label htmlFor="identifier">Sign-in identifier</label>
            <input
              id="identifier"
              autoComplete="username"
              aria-invalid={!!errors.identifier}
              aria-describedby={
                errors.identifier ? "identifier-error" : undefined
              }
              {...register("identifier")}
            />
            {errors.identifier && (
              <p id="identifier-error" role="alert">
                Enter a valid sign-in identifier.
              </p>
            )}
            <label htmlFor="challenge">Verification challenge</label>
            <div className="challenge-input">
              <input
                id="challenge"
                type={visible ? "text" : "password"}
                autoComplete="one-time-code"
                aria-invalid={!!errors.challenge}
                aria-describedby={
                  errors.challenge ? "challenge-error" : undefined
                }
                {...register("challenge")}
              />
              <button
                type="button"
                aria-label={
                  visible
                    ? "Hide verification challenge"
                    : "Show verification challenge"
                }
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.challenge && (
              <p id="challenge-error" role="alert">
                Enter a challenge of at least six characters.
              </p>
            )}
            <Button disabled={isSubmitting || session.isPending} type="submit">
              {isSubmitting ? "Verifying…" : "Sign in"}
            </Button>
          </form>
          {config.mock && (
            <details className="login-demo">
              <summary>Development sign-in details</summary>
              <p>
                Test identities only. Challenge: <strong>246810</strong>
              </p>
              <ul>
                <li>Admin: admin@business.sandbox</li>
                <li>Finance: finance@business.sandbox</li>
                <li>Developer: developer@partner.sandbox</li>
                <li>Viewer: viewer@business.sandbox</li>
              </ul>
              <p>Customer and Super Admin are reserved for the next phase.</p>
            </details>
          )}
          <Link className="registration-link" to="/register">
            Create a business account →
          </Link>
          <p className="footnote">
            No credentials are stored in localStorage. Use synthetic details in
            development.
          </p>
        </div>
      </main>
    </div>
  );
}
