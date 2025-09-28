/* eslint-disable @typescript-eslint/no-unused-vars */
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RequireAuth from "./components/RequireAuth";
import AppLayout from "./layout/AppLayout";
// import NotAuthorized from "./pages/NotAuthorized";
import SignIn from "./pages/AuthPages/SignIn";

// Pages
import Home from "./pages/Dashboard/Home";
import ManageUsers from "./pages/ManageUsers";

import RequestDetailPage from "./pages/RequestDetailPage";
// import Liquidation from "./pages/Liquidation";
// import StudentPerformanceReport from "./pages/StudentPerformanceReport";
import UserProfile from "./pages/UserProfiles";
// import MyClasses from "./pages/MyClasses";
import ManageListOfPrioritiesPage from "./pages/ManageListOfPrioritiesPage";
import NotAuthorized from "./pages/NotAuthorized";
import FundRequestApproval from "./pages/FundRequestApproval";
import ListOfPrioritiesPage from "./pages/MOOERequestPage";
import ManageSchools from "./pages/ManageSchools";
import PriortySubmissionsPage from "./pages/PriortySubmissionsPage";
import LiquidationPage from "./pages/LiquidationPage";
import ApprovedRequestPage from "./pages/ApprovedRequestPage";
import ManageRequirementsPage from "./pages/ManageRequirementsPage";
import MOOERequestPage from "./pages/MOOERequestPage";
import MOOERequestHistory from "./pages/MOOERequestHistory";
import LiquidationReportPage from "./pages/LiquidationReportPage";
import LiquidatorsPage from "./pages/LiquidatorsPage";
import ResourceAllocation from "./pages/ResourceAllocation";
import LiquidationDetailsPage from "./pages/LiquidationDetailsPage";
import LiquidationReminder from "./components/LiquidationReminder";
import BudgetAllocationNotification from "./components/BudgetAllocationNotification";
import SetupModal from "./components/common/SetupModal";
import SchoolHeadDashboard from "./pages/SchoolHeadDashboard"; // Add this import
import ManageDistricts from "./pages/ManageDistricts";
import AdminDashboard from "./pages/AdminDashboard";
import LiquidatorReviewPage from "./pages/LiquidatorReviewPage";
import DivisionReviewPage from "./pages/DivisionReviewPage";
import BackupRestorePage from "./pages/BackupRestorePage";
import GenerateAgeingReport from "./pages/GenerateAgeingReport";
import GenerateLiquidationReport from "./pages/GenerateLiquidationReport";
import AuditLogPage from "./pages/AuditLogPage";
import HelpCenter from "./pages/HelpCenter";
import HelpArticlePage from "./pages/HelpArticlePage";
import ContextualHelpButton from "./components/help/ContextualHelpButton";
import DynamicContextualHelp from "./components/help/DynamicContextualHelpComponent";
import { HelpProvider } from "./context/HelpContext";

const App = () => {
  const { setupFlowActive, user } = useAuth();
  return (
    <>
      <HelpProvider>
        {/* Main application routes */}
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<SignIn />} />
          <Route path="/not-authorized" element={<NotAuthorized />} />
          {/* Protected routes within AppLayout */}
          <Route element={<AppLayout />}>
            {/* Common routes accessible to all authenticated users */}
            <Route element={<RequireAuth />}>
              <Route
                path="/"
                element={user?.role === "admin" ? <AdminDashboard /> : <Home />}
              />
              <Route path="/profile" element={<UserProfile />} />
            </Route>

            {/* Admin-only routes */}
            <Route element={<RequireAuth allowedRoles={["admin"]} />}>
              <Route path="/users" element={<ManageUsers />} />

              <Route
                path="/list-of-priorities"
                element={<ManageListOfPrioritiesPage />}
              />
              <Route
                path="/requirements"
                element={<ManageRequirementsPage />}
              />
              <Route path="/school-districts" element={<ManageDistricts />} />
              <Route path="/report/aging" element={<GenerateAgeingReport />} />
              <Route
                path="/report/liquidation"
                element={<GenerateLiquidationReport />}
              />
              <Route path="/backup-restore" element={<BackupRestorePage />} />
              <Route path="/audit-logs" element={<AuditLogPage />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route path="/help" element={<HelpCenter />} />
              <Route
                path="/help/article/:articleId"
                element={<HelpArticlePage />}
              />
            </Route>

            <Route element={<RequireAuth allowedRoles={["district_admin"]} />}>
              <Route path="/pre-auditing" element={<LiquidationReportPage />} />
            </Route>

            {/* School Head-only routes */}
            <Route element={<RequireAuth allowedRoles={["school_head"]} />}>
              <Route
                path="/prepare-list-of-priorities"
                element={<MOOERequestPage />}
              />
              <Route
                path="/requests-history"
                element={<MOOERequestHistory />}
              />
              {/* <Route
                path="/list-of-priorities"
                element={<ListOfPrioritiesPage />}
              /> */}
              {/* <Route
                path="/fund-request/request-list"
                element={<RequestsList />}
              /> */}
            </Route>

            <Route element={<RequireAuth allowedRoles={["superintendent"]} />}>
              <Route
                path="/schools-priorities-submissions"
                element={<PriortySubmissionsPage />}
              />
              {/* <Route
                path="/fund-request/request-list"
                element={<RequestsList />}
              /> */}
              {/* <Route path="/liquidation" element={<Liquidation />} /> */}
            </Route>
            {/* Liquidators routes */}
            {/* <Route element={<RequireAuth allowedRoles={["liquidator"]} />}>
              <Route
                path="/liquidation-approval"
                element={<FundRequestApproval />}
              />
            </Route> */}
            <Route element={<RequireAuth allowedRoles={["liquidator"]} />}>
              <Route
                path="/liquidation-finalize"
                element={<LiquidatorReviewPage />}
              />
            </Route>

            {/* Division Accountant routes */}
            <Route element={<RequireAuth allowedRoles={["accountant"]} />}>
              <Route
                path="/approved-requests"
                element={<ApprovedRequestPage />}
              />
              <Route path="/division-review" element={<DivisionReviewPage />} />
            </Route>

            {/* Shared route for liquidation details - accessible by multiple roles */}
            <Route
              element={
                <RequireAuth
                  allowedRoles={["district_admin", "liquidator", "accountant"]}
                />
              }
            >
              <Route
                path="/liquidations/:liquidationId"
                element={<LiquidationDetailsPage />}
              />
            </Route>

            {/* Shared routes for multiple roles */}
            <Route
              element={<RequireAuth allowedRoles={["admin", "school_head"]} />}
            >
              <Route
                path="/fund-requests/:id"
                element={<RequestDetailPage />}
              />
              <Route
                path="/prepare-list-of-priorities"
                element={<ListOfPrioritiesPage />}
              />
            </Route>
            <Route
              element={
                <RequireAuth allowedRoles={["school_admin", "school_head"]} />
              }
            >
              <Route path="/liquidation" element={<LiquidationPage />} />
            </Route>
            <Route
              element={<RequireAuth allowedRoles={["admin", "accountant"]} />}
            >
              <Route path="/schools" element={<ManageSchools />} />
              <Route
                path="/resource-allocation"
                element={<ResourceAllocation />}
              />
            </Route>
          </Route>
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <SetupModal />
        <LiquidationReminder />
        <BudgetAllocationNotification />
        {/* Enhanced contextual help - replaces the old ContextualHelpButton */}
        <DynamicContextualHelp variant="floating" showQuickTips={true} />
      </HelpProvider>
    </>
  );
};

export default App;
