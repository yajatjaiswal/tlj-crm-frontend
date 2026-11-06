import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import SignIn from "./Pages/SignIn";
import AppLayout from "./ui/Applayout";
import Disbursed from "./Pages/disbursal/Disbursed";
import CreditAnalyst from "./Pages/credit-analyst/CreditAnalyst";
import Screener from "./Pages/screener/Screener";
import Admin from "./Pages/admin/Admin";
import Dashboard from "./Pages/admin/Dashboard";
import { store } from "./redux/store";
import { persistStore } from "redux-persist";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import MarketingLeads from "./Pages/screener/MarketingLeads";
import PartialLeads from "./Pages/screener/PartialLeads";
import AllocatedPartialLeads from "./Pages/screener/AllocatedPartialLeads";
import AllocatedMarketingLeads from "./Pages/screener/AllocatedMarketingLeads";
import CompleteLeads from "./Pages/screener/CompletedLeads";
import RejectedLeads from "./Pages/screener/RejectedLeads";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import ForgetPassword from "./Components/ForgetPassword";
import AddEmployee from "./Pages/admin/AddEmployee";
import ProtectedRoute from "./Components/ProtectedRoute";
import AssignedLeads from "./Pages/credit-analyst/AssignedLeads";
import BreRejectedLeads from "./Pages/credit-analyst/BreRejectedLeads";
import ApprovedLeads from "./Pages/credit-analyst/ApprovedLeads";
import CArejectedLeads from "./Pages/credit-analyst/CArejectedLeads";
import AuditLeads from "./Pages/credit-analyst/AuditLeads";
import AllocatedAuditLeads from "./Pages/credit-analyst/AllocatedAuditLeads";
import { Toaster } from "react-hot-toast";
import Disbursal from "./Pages/disbursal/Disbursal";
import Marketing from "./Pages/marketing/Marketing";
import { ThemeProvider } from "./context/ThemeContext";
import ConfirmationPendingDisbursal from "./Pages/disbursal/ConfirmationPendingDisbursal";
import NonContactableLeads from "./Pages/screener/NonContactableLeads";
import NonResponsiveLeads from "./Pages/screener/NonResponsiveLeads";
import NonContactableBreReLeads from "./Pages/credit-analyst/NonContactableBreReLeads";
import NonResponsiveBreReLeads from "./Pages/credit-analyst/NonResponsiveBreReLeads";
import PendingLeads from "./Pages/admin/components/PendingLeads";
import DashboardRejectedLeads from "./Pages/admin/components/DashboardRejectedLeads";
import DashboardTotalLeads from "./Pages/admin/components/DashboardTotalLeads";
import DashboardNotTakingReloanLeads from "./Pages/admin/components/DashboardNotTakingReloanLeads";
import DashboardDisbursedLeads from "./Pages/admin/components/DashboardDisbursedLeads";
import DashboardPendingSanctionAmountLeads from "./Pages/admin/components/DashboardPendingSanctionAmountLeads";
import DashboardPendingDisbursalAmountLeads from "./Pages/admin/components/DashboardPendingDisbursalAmountLeads";
import DashboardLoanAmountDistribution from "./Pages/admin/components/DashboardLoanAmountDistribution";
import DashboardAssignedLeads from "./Pages/admin/components/DashboardAssignedLeads";
import SearchResult from "./Pages/SearchResult";
import ActionPan from "./Pages/admin/ActionPan";
import DevTab from "./Pages/admin/DevTab";
import GeofenceWhitelist from "./Pages/admin/GeofenceWhitelist";
import ApprovedAuditLeads from "./Pages/credit-analyst/ApprovedAuditLeads";
import UnassignedCreditHeadAuditLeads from "./Pages/credit-analyst/UnassignedCreditHeadAuditLeads";
import AssignedCreditHeadAuditLeads from "./Pages/credit-analyst/AssignedCreditHeadAuditLeads";
import ApprovedCreditHeadAuditLeads from "./Pages/credit-analyst/ApprovedCreditHeadAuditLeads";
import RejectedAuditLeads from "./Pages/credit-analyst/RejectedAuditLeads";
import RejectedCreditHeadAuditLeads from "./Pages/credit-analyst/RejectedCreditHeadAuditLeads";
import UnservicablePincodesLeads from "./Pages/screener/UnservicablePincodesLeads";
import DisposedLeads from "./Pages/screener/DisposedLeads";
import TodayRecoveryLeads from "./Pages/screener/TodayRecoveryLeads";
import AssignedRecoveryLeads from "./Pages/screener/AssignedRecoveryLeads";
import PriorityReloanLeads from "./Pages/screener/PriorityReloanLeads";
import NotTakenReloanLeads from "./Pages/screener/NotTakenReloanLeads";
import AssignedNotTakenReloanLeads from "./Pages/screener/AssignedNotTakenReloanLeads";
import MyPerformance from "./Pages/screener/MyPerformance";
import TeamPerformance from "./Pages/screener/TeamPerformance";
import SalesOpsDashboardRedirect from "./Pages/screener/SalesOpsDashboardRedirect";
import Profile from "./Pages/Profile";
import ApplyLeaveForm from "./Pages/ApplyLeaveForm";
import LeadInformationFullPage from "./Pages/details-modal/LeadInformationFullPage";
import RepaymentLeads from "./Pages/screener/RepaymentLeads";
import SummaryDataPage from "./Pages/screener/SummaryDataPage";
import LocationSuspiciousLeads from "./Pages/quality-checker/LocationSuspiciousLeads";
import ApprovedLocationLeads from "./Pages/quality-checker/ApprovedLocationLeads";
import RejectedLocationLeads from "./Pages/quality-checker/RejectedLocationLeads";
let persistor = persistStore(store);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
  },
});

// window.addEventListener("contextmenu", (e) => e.preventDefault());
// window.addEventListener("keydown", (e) => {
//   if (e.keyCode == 123) e.preventDefault();
//   if (e.ctrlKey && e.shiftKey && e.keyCode === 73) e.preventDefault();
//   if (e.ctrlKey && e.shiftKey && e.keyCode === 74) e.preventDefault();
// });

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      <BrowserRouter>
        <Provider store={store}>
          <PersistGate persistor={persistor}>
            <ThemeProvider>
              <Routes basename="/">
                <Route index path="/login" element={<SignIn />} />
                <Route path="/" element={<Navigate to="login" replace />} />
                <Route path="/forgetpassword" element={<ForgetPassword />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* admin routes */}
                  <Route path="admin" element={<Admin />}>
                    <Route
                      index
                      element={<Navigate to="dashboard" replace />}
                    />
                    <Route index path="dashboard" element={<Dashboard />} />
                    <Route path="add-employee" element={<AddEmployee />} />
                    <Route path="action-pan" element={<ActionPan />} />
                    <Route
                      path="geofence-whitelist"
                      element={<GeofenceWhitelist />}
                    />
                    <Route path="dev-tab" element={<DevTab />} />
                    <Route path="pending-leads" element={<PendingLeads />} />
                    <Route
                      path="pending-leads/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="rejected-leads"
                      element={<DashboardRejectedLeads />}
                    />
                    <Route
                      path="rejected-leads/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="total-leads"
                      element={<DashboardTotalLeads />}
                    />
                    <Route
                      path="total-leads/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="not-taking-reloan-leads"
                      element={<DashboardNotTakingReloanLeads />}
                    />
                    <Route
                      path="disbursed-leads"
                      element={<DashboardDisbursedLeads />}
                    />
                    <Route
                      path="disbursed-leads/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="pending-sanction-amount"
                      element={<DashboardPendingSanctionAmountLeads />}
                    />
                    <Route
                      path="pending-sanction-amount/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="pending-disbursal-amount"
                      element={<DashboardPendingDisbursalAmountLeads />}
                    />
                    <Route
                      path="loan-amount-distribution"
                      element={<DashboardLoanAmountDistribution />}
                    />
                    <Route
                      path="assigned-leads"
                      element={<DashboardAssignedLeads />}
                    />
                  </Route>

                  {/* Screener Routes */}
                  <Route path="sales-ops" element={<Screener />}>
                    <Route
                      index
                      element={<Navigate to="partial" replace />}
                    />
                    <Route
                      index
                      path="marketing-leads"
                      element={<MarketingLeads />}
                    />
                    <Route path="partial" element={<PartialLeads />} />
                    <Route
                      path="allocated-partial"
                      element={<AllocatedPartialLeads />}
                    />
                    <Route
                      path="allocated-partial/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="allocated-marketing"
                      element={<AllocatedMarketingLeads />}
                    />
                    <Route
                      path="allocated-marketing/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route path="completed" element={<CompleteLeads />} />
                    <Route
                      path="completed/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route path="rejected" element={<RejectedLeads />} />
                    <Route
                      path="rejected/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="non-contactable"
                      element={<NonContactableLeads />}
                    />
                    <Route
                      path="non-responsive"
                      element={<NonResponsiveLeads />}
                    />
                    <Route path="action-pan" element={<ActionPan />} />
                    <Route
                      path="dashboard"
                      element={<SalesOpsDashboardRedirect />}
                    />
                    <Route path="pending-leads" element={<PendingLeads />} />
                    <Route
                      path="pending-leads/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="rejected-leads"
                      element={<DashboardRejectedLeads />}
                    />
                    <Route
                      path="rejected-leads/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="total-leads"
                      element={<DashboardTotalLeads />}
                    />
                    <Route
                      path="total-leads/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="not-taking-reloan-leads"
                      element={<DashboardNotTakingReloanLeads />}
                    />
                    <Route
                      path="disbursed-leads"
                      element={<DashboardDisbursedLeads />}
                    />
                    <Route
                      path="disbursed-leads/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="pending-sanction-amount"
                      element={<DashboardPendingSanctionAmountLeads />}
                    />
                    <Route
                      path="pending-sanction-amount/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="pending-disbursal-amount"
                      element={<DashboardPendingDisbursalAmountLeads />}
                    />
                    <Route
                      path="loan-amount-distribution"
                      element={<DashboardLoanAmountDistribution />}
                    />
                    <Route
                      path="unserviceable-pin-code-leads"
                      element={<UnservicablePincodesLeads />}
                    />
                    <Route
                      path="repayment-leads"
                      element={<RepaymentLeads />}
                    />
                    <Route
                      path="today-recovery-leads"
                      element={<TodayRecoveryLeads />}
                    />
                    <Route
                      path="assigned-recovery-leads"
                      element={<AssignedRecoveryLeads />}
                    />
                    <Route
                      path="priority-reloan"
                      element={<PriorityReloanLeads />}
                    />
                    <Route
                      path="priority-reloan/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="not-taken-reloan"
                      element={<NotTakenReloanLeads />}
                    />
                    <Route
                      path="not-taken-reloan/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="assigned-not-taken-reloan"
                      element={<AssignedNotTakenReloanLeads />}
                    />
                    <Route
                      path="my-performance"
                      element={<MyPerformance />}
                    />
                    <Route
                      path="team-performance"
                      element={<TeamPerformance />}
                    />
                    {/* <Route
                      path="disposed-leads"
                      element={<DisposedLeads />}
                    /> */}
                  </Route>

                  {/* Credit Head Routes */}
                  {/* <Route path="credit-head" element={<CreditHead />}> */}
                  <Route
                    path="credit-head/unassigned-audit-leads"
                    element={<UnassignedCreditHeadAuditLeads />}
                  />
                  <Route
                    path="credit-head/assigned-audit-leads"
                    element={<AssignedCreditHeadAuditLeads />}
                  />
                  <Route
                    path="credit-head/assigned-audit-leads/summary-data/:pan"
                    element={<SummaryDataPage />}
                  />
                  <Route
                    path="credit-head/approved-audit-leads"
                    element={<ApprovedCreditHeadAuditLeads />}
                  />
                  <Route
                    path="credit-head/approved-audit-leads/summary-data/:pan"
                    element={<SummaryDataPage />}
                  />
                  {/* <Route path="unassigned-audit-leads" element={<UnassignedCreditHeadAuditLeads />} /> */}
                  {/* <Route path="assigned-audit-leads" element={<AssignedCreditHeadAuditLeads />} /> */}
                  {/* <Route path="approved-audit-leads" element={<ApprovedCreditHeadAuditLeads />} /> */}
                  <Route
                    path="credit-head/rejected-audit-leads"
                    element={<RejectedCreditHeadAuditLeads />}
                  />
                  <Route
                    path="credit-head/action-pan"
                    element={<ActionPan />}
                  />

                  {/* <Route path="rejected-audit-leads" element={<RejectedAuditLeads />} /> */}
                  {/* </Route> */}

                  {/* Credit Analyst Routes */}
                  <Route path="credit-analyst" element={<CreditAnalyst />}>
                    <Route
                      index
                      element={<Navigate to="bre-rejected-app" replace />}
                    />
                    <Route
                      path="bre-rejected-app"
                      element={<BreRejectedLeads />}
                    />
                    <Route
                      path="allocated-application"
                      element={<AssignedLeads />}
                    />
                    <Route
                      path="allocated-application/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="non-contactable-bre-re"
                      element={<NonContactableBreReLeads />}
                    />
                    <Route
                      path="non-responsive-bre-re"
                      element={<NonResponsiveBreReLeads />}
                    />
                    <Route
                      path="approved-application"
                      element={<ApprovedLeads />}
                    />
                    <Route
                      path="approved-application/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="rejected-application"
                      element={<CArejectedLeads />}
                    />
                    <Route
                      path="rejected-application/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route path="audit-leads" element={<AuditLeads />} />
                    <Route
                      path="allocated-leads-audit"
                      element={<AllocatedAuditLeads />}
                    />
                    <Route
                      path="allocated-leads-audit/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="approved-leads-audit"
                      element={<ApprovedAuditLeads />}
                    />
                    <Route
                      path="approved-leads-audit/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route
                      path="rejected-leads-audit"
                      element={<RejectedAuditLeads />}
                    />
                    <Route
                      path="rejected-leads-audit/summary-data/:pan"
                      element={<SummaryDataPage />}
                    />
                    <Route path="action-pan" element={<ActionPan />} />
                    {/* <Route
                      path="approved-audit-leads"
                      element={<ApprovedAuditLeads />}
                    /> */}
                    {/* <Route
                      path="rejected-audit-leads"
                      element={<RejectedAuditLeads />}
                    /> */}
                  </Route>

                  {/* Disbursed Routes */}
                  <Route path="disbursal-head" element={<Disbursal />}>
                    <Route
                      index
                      element={<Navigate to="disbursed" replace />}
                    />
                    <Route path="disbursed" element={<Disbursed />} />
                    <Route
                      path="confirmation-pending-disbursal"
                      element={<ConfirmationPendingDisbursal />}
                    />
                    <Route path="action-pan" element={<ActionPan />} />
                  </Route>

                  <Route
                    path="quality-checker"
                    element={
                      <Navigate to="/quality-checker/location-suspicious-leads" replace />
                    }
                  />
                  <Route
                    path="quality-checker/location-suspicious-leads"
                    element={<LocationSuspiciousLeads />}
                  />
                  <Route
                    path="quality-checker/location-suspicious-leads/summary-data/:pan"
                    element={<SummaryDataPage />}
                  />
                  <Route
                    path="quality-checker/approved-location-leads"
                    element={<ApprovedLocationLeads />}
                  />
                  <Route
                    path="quality-checker/approved-location-leads/summary-data/:pan"
                    element={<SummaryDataPage />}
                  />
                  <Route
                    path="quality-checker/rejected-leads"
                    element={<RejectedLocationLeads />}
                  />
                  <Route
                    path="quality-checker/rejected-leads/summary-data/:pan"
                    element={<SummaryDataPage />}
                  />

                  {/* Marketing Routes */}
                  <Route path="marketing" element={<Marketing />}>
                    <Route
                      index
                      element={<Navigate to="marketing" replace />}
                    />
                    <Route path="action-pan" element={<ActionPan />} />
                  </Route>
                  <Route
                    path="search-result/summary-data/:pan"
                    element={
                      <ProtectedRoute>
                        <SummaryDataPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="search-result"
                    element={
                      <ProtectedRoute>
                        <SearchResult />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="search-result/:id"
                    element={
                      <ProtectedRoute>
                        <SearchResult />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="profile" element={<Profile />} />
                  <Route path="apply-leave" element={<ApplyLeaveForm />} />
                  <Route
                    path="lead-information/full-view"
                    element={<LeadInformationFullPage />}
                  />
                  <Route
                    path="summary-data/:pan"
                    element={<SummaryDataPage />}
                  />
                </Route>
              </Routes>
            </ThemeProvider>
          </PersistGate>
        </Provider>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        gutter={12}
        containerStyle={{ margin: "8px" }}
        toastOptions={{
          success: {
            duration: 3000,
          },
          error: {
            duration: 5000,
          },
          style: {
            fontSize: "16px",
            maxWidth: "500px",
            padding: "16px 24px",
            backgroundColor: "#fff",
            color: "#374151",
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
