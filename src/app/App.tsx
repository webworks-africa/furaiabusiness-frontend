import { Login } from "../pages/Login";
import { lazy, Suspense } from "react";
import { StatePanel } from "../components/StatePanel";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Shell, PublicShell } from "./Shell";
import { Overview } from "../pages/Overview";
import { AccountDetail } from "../pages/AccountDetail";
import { TransactionDetail } from "../pages/TransactionDetail";
import { Statements, StatementDetail } from "../pages/Statements";
import { Accounts } from "../pages/Accounts";
import { Transactions } from "../pages/Transactions";
import { Planned, NotFound, PublicPlanned } from "../pages/Planned";
import { navigation } from "./navigation";
const TaxSettingsPage = lazy(() =>
  import("../pages/DocumentWorkflows").then((m) => ({
    default: m.TaxSettingsPage,
  })),
);
const PublicSupplierUploadPage = lazy(() =>
  import("../pages/DocumentWorkflows").then((m) => ({
    default: m.PublicSupplierUploadPage,
  })),
);
const SupplierInvoicesPage = lazy(() =>
  import("../pages/DocumentWorkflows").then((m) => ({
    default: m.SupplierInvoicesPage,
  })),
);
const BusinessToolsPage = lazy(() =>
  import("../pages/BusinessTools").then((m) => ({
    default: m.BusinessToolsPage,
  })),
);
const SendMoneyPage = lazy(() =>
  import("../pages/BusinessTools").then((m) => ({ default: m.SendMoneyPage })),
);
const LpoPage = lazy(() =>
  import("../pages/BusinessTools").then((m) => ({ default: m.LpoPage })),
);
const CustomerStatementPage = lazy(() =>
  import("../pages/BusinessTools").then((m) => ({
    default: m.CustomerStatementPage,
  })),
);
const BusinessRegistrationPage = lazy(() =>
  import("../pages/BusinessTools").then((m) => ({
    default: m.BusinessRegistrationPage,
  })),
);
const DeveloperDocumentation = lazy(() =>
  import("../pages/DeveloperDocumentation").then((m) => ({
    default: m.DeveloperDocumentation,
  })),
);
const ApiBankingPage = lazy(() =>
  import("../pages/DeveloperDocumentation").then((m) => ({
    default: m.ApiBankingPage,
  })),
);
const OnboardingPage = lazy(() =>
  import("../pages/Onboarding").then((m) => ({ default: m.OnboardingPage })),
);
const OnboardingStatusPage = lazy(() =>
  import("../pages/OnboardingStatus").then((m) => ({
    default: m.OnboardingStatusPage,
  })),
);
const BusinessSettingsPage = lazy(() =>
  import("../pages/Settings").then((m) => ({
    default: m.BusinessSettingsPage,
  })),
);
const SecuritySettingsPage = lazy(() =>
  import("../pages/Settings").then((m) => ({
    default: m.SecuritySettingsPage,
  })),
);
const TeamPage = lazy(() =>
  import("../pages/Team").then((m) => ({ default: m.TeamPage })),
);
const ContactsPage = lazy(() =>
  import("../pages/Contacts").then((m) => ({ default: m.ContactsPage })),
);
const ContactPage = lazy(() =>
  import("../pages/Contacts").then((m) => ({ default: m.ContactPage })),
);
const BillingListPage = lazy(() =>
  import("../pages/Billing").then((m) => ({ default: m.BillingListPage })),
);
const DocumentEditorPage = lazy(() =>
  import("../pages/Billing").then((m) => ({ default: m.DocumentEditorPage })),
);
const DocumentDetailPage = lazy(() =>
  import("../pages/Billing").then((m) => ({ default: m.DocumentDetailPage })),
);
const PublicQuotationPage = lazy(() =>
  import("../pages/Billing").then((m) => ({ default: m.PublicQuotationPage })),
);
const PaymentLinksPage = lazy(() =>
  import("../pages/Collections").then((m) => ({ default: m.PaymentLinksPage })),
);
const NewPaymentLinkPage = lazy(() =>
  import("../pages/Collections").then((m) => ({
    default: m.NewPaymentLinkPage,
  })),
);
const PaymentLinkDetailPage = lazy(() =>
  import("../pages/Collections").then((m) => ({
    default: m.PaymentLinkDetailPage,
  })),
);
const ReceiptPage = lazy(() =>
  import("../pages/Collections").then((m) => ({ default: m.ReceiptPage })),
);
const PublicCheckoutPage = lazy(() =>
  import("../pages/Collections").then((m) => ({
    default: m.PublicCheckoutPage,
  })),
);
const PublicPaymentResultPage = lazy(() =>
  import("../pages/Collections").then((m) => ({
    default: m.PublicPaymentResultPage,
  })),
);
const PaymentsPage = lazy(() =>
  import("../pages/Payments").then((m) => ({ default: m.PaymentsPage })),
);
const BeneficiariesPage = lazy(() =>
  import("../pages/Payments").then((m) => ({ default: m.BeneficiariesPage })),
);
const NewPaymentPage = lazy(() =>
  import("../pages/Payments").then((m) => ({ default: m.NewPaymentPage })),
);
const PaymentDetailPage = lazy(() =>
  import("../pages/Payments").then((m) => ({ default: m.PaymentDetailPage })),
);
const CardsPage = lazy(() =>
  import("../pages/Cards").then((m) => ({ default: m.CardsPage })),
);
const CardDetailPage = lazy(() =>
  import("../pages/Cards").then((m) => ({ default: m.CardDetailPage })),
);
const CardRequestPage = lazy(() =>
  import("../pages/Cards").then((m) => ({ default: m.CardRequestPage })),
);
const ReportsHome = lazy(() =>
  import("../pages/Reports").then((m) => ({ default: m.ReportsHome })),
);
const ReportPage = lazy(() =>
  import("../pages/Reports").then((m) => ({ default: m.ReportPage })),
);
const ReportExportsPage = lazy(() =>
  import("../pages/Reports").then((m) => ({ default: m.ReportExportsPage })),
);
const ReportExportPage = lazy(() =>
  import("../pages/Reports").then((m) => ({ default: m.ReportExportPage })),
);
const DeveloperPage = lazy(() =>
  import("../pages/Developers").then((m) => ({ default: m.DeveloperPage })),
);
export function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <main className="standalone">
            <StatePanel />
          </main>
        }
      >
        <Routes>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<BusinessRegistrationPage />} />
          <Route path="partners/*" element={<LegacyBusinessEntry />} />
          <Route element={<PublicShell />}>
            <Route path="docs" element={<DeveloperDocumentation />} />
            <Route path="api-banking" element={<ApiBankingPage />} />
          </Route>
          <Route element={<Shell />}>
            <Route index element={<Overview />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="payments/new" element={<SendMoneyPage />} />
            <Route path="send-money" element={<SendMoneyPage />} />
            <Route path="send-money/:id" element={<SendMoneyPage />} />
            <Route
              path="settings/workflows"
              element={<BusinessToolsPage section="settings" />}
            />
            <Route
              path="procurement"
              element={<BusinessToolsPage section="procurement" />}
            />
            <Route path="settings/tax" element={<TaxSettingsPage />} />
            <Route
              path="procurement/invoices"
              element={<SupplierInvoicesPage />}
            />
            <Route
              path="procurement/payables"
              element={<SupplierInvoicesPage />}
            />
            <Route path="procurement/:id" element={<LpoPage />} />
            <Route
              path="payroll"
              element={<BusinessToolsPage section="payroll" />}
            />
            <Route path="pos" element={<BusinessToolsPage section="pos" />} />
            <Route
              path="loans"
              element={<BusinessToolsPage section="loans" />}
            />
            <Route
              path="customers/:id/statement"
              element={<CustomerStatementPage />}
            />
            <Route
              path="payments/beneficiaries"
              element={<BeneficiariesPage />}
            />
            <Route
              path="payments/approvals"
              element={<PaymentsPage approvals />}
            />
            <Route path="payments/:id/edit" element={<NewPaymentPage />} />
            <Route path="payments/:id" element={<PaymentDetailPage />} />
            <Route path="cards" element={<CardsPage />} />
            <Route path="cards/request" element={<CardRequestPage />} />
            <Route path="cards/:id" element={<CardDetailPage />} />
            <Route path="payment-links" element={<PaymentLinksPage />} />
            <Route path="payment-links/new" element={<NewPaymentLinkPage />} />
            <Route
              path="payment-links/:id"
              element={<PaymentLinkDetailPage />}
            />
            <Route path="receipts/:id" element={<ReceiptPage />} />
            <Route path="customers" element={<ContactsPage />} />
            <Route path="customers/:id" element={<ContactPage />} />
            {(["quotations", "invoices"] as const).map((kind) => (
              <Route key={kind} path={kind}>
                <Route index element={<BillingListPage kind={kind} />} />
                <Route
                  path="new"
                  element={<DocumentEditorPage kind={kind} />}
                />
                <Route
                  path=":id/edit"
                  element={<DocumentEditorPage kind={kind} />}
                />
                <Route
                  path=":id/convert"
                  element={<DocumentDetailPage kind={kind} />}
                />
                <Route
                  path=":id"
                  element={<DocumentDetailPage kind={kind} />}
                />
              </Route>
            ))}
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route
              path="onboarding/status"
              element={<OnboardingStatusPage />}
            />
            <Route path="settings" element={<BusinessSettingsPage />} />
            <Route
              path="settings/security"
              element={<SecuritySettingsPage />}
            />
            <Route path="team-and-approvals" element={<TeamPage />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="accounts/:id" element={<AccountDetail />} />
            <Route path="statements" element={<Statements />} />
            <Route path="statements/:id" element={<StatementDetail />} />
            <Route path="reports" element={<ReportsHome />} />
            <Route path="reports/exports" element={<ReportExportsPage />} />
            <Route path="reports/exports/:id" element={<ReportExportPage />} />
            <Route path="reports/:kind" element={<ReportPage />} />
            <Route path="developers" element={<DeveloperPage />} />
            <Route path="developers/:section" element={<DeveloperPage />} />
            <Route
              path="developers/applications/:id"
              element={<DeveloperPage />}
            />
            <Route
              path="developers/webhooks/:id/deliveries/:delivery"
              element={<DeveloperPage />}
            />
            <Route path="transactions/:id" element={<TransactionDetail />} />
            <Route path="transactions" element={<Transactions />} />
            {navigation
              .flatMap((g) => g.items)
              .filter(
                (i) =>
                  ![
                    "/",
                    "/accounts",
                    "/payments",
                    "/send-money",
                    "/procurement",
                    "/payroll",
                    "/pos",
                    "/loans",
                    "/cards",
                    "/reports",
                    "/developers",
                    "/transactions",
                    "/onboarding",
                    "/settings",
                    "/team-and-approvals",
                    "/customers",
                    "/quotations",
                    "/invoices",
                    "/payment-links",
                  ].includes(i.path),
              )
              .map((i) => (
                <Route
                  key={i.path}
                  path={i.path.slice(1)}
                  element={<Planned />}
                />
              ))}
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="public" element={<PublicShell />}>
            <Route
              path="supplier-upload/:token"
              element={<PublicSupplierUploadPage />}
            />
            <Route path="invoices/:token" element={<PublicCheckoutPage />} />
            <Route
              path="payment-links/:token"
              element={<PublicCheckoutPage />}
            />
            <Route
              path="payments/:reference"
              element={<PublicPaymentResultPage />}
            />
            <Route path="quotations/:token" element={<PublicQuotationPage />} />
            <Route path="*" element={<PublicPlanned />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function LegacyBusinessEntry() {
  const location = useLocation();
  const suffix = location.pathname.slice("/partners".length);
  return (
    <Navigate
      replace
      to={
        suffix === "/login"
          ? "/login"
          : suffix === "/applications"
            ? "/developers/applications"
            : suffix === "/credentials"
              ? "/developers/credentials"
              : suffix === "/webhooks"
                ? "/developers/webhooks"
                : suffix === "/docs"
                  ? "/developers/docs"
                  : suffix === "/overview" || !suffix || suffix === "/"
                    ? "/"
                    : suffix + location.search
      }
    />
  );
}
