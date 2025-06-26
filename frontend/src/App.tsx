import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "./context/AuthContext";
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
import { ToastContainer } from "react-toastify";
import LiquidationReportPage from "./pages/LiquidationReportPage";
import LiquidatorsPage from "./pages/LiquidatorsPage";

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored" // optional - match your app's theme
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<SignIn />} />
          <Route path="/not-authorized" element={<NotAuthorized />} />

          {/* Protected routes within AppLayout */}
          <Route element={<AppLayout />}>
            {/* Common routes accessible to all authenticated users */}
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Home />} />
              <Route path="/profile" element={<UserProfile />} />
            </Route>

            {/* Admin-only routes */}
            <Route element={<RequireAuth allowedRoles={["admin"]} />}>
              {/* <Route path="/users" element={<ManageUsers />} /> */}
              <Route path="/schools" element={<ManageSchools />} />
              <Route
                path="/list-of-priorities"
                element={<ManageListOfPrioritiesPage />}
              />
              <Route
                path="/requirements"
                element={<ManageRequirementsPage />}
              />
            </Route>

            <Route element={<RequireAuth allowedRoles={["district_admin"]} />}>
              {/* <Route path="/users" element={<ManageUsers />} /> */}
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
              <Route path="/liquidation" element={<LiquidationPage />} />
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
            <Route element={<RequireAuth allowedRoles={["liquidator"]} />}>
              <Route
                path="/fund-request-approval"
                element={<FundRequestApproval />}
              />
            </Route>
            <Route element={<RequireAuth allowedRoles={["liquidator"]} />}>
              <Route
                path="/liquidation-approval"
                element={<LiquidatorsPage />}
              />
            </Route>

            {/* Teacher-only routes */}
            <Route element={<RequireAuth allowedRoles={["accountant"]} />}>
              {/* <Route path="/classes" element={<MyClasses />} /> */}
              <Route
                path="/approved-requests"
                element={<ApprovedRequestPage />}
              />
            </Route>

            {/* Shared routes for multiple roles */}
            <Route
              element={<RequireAuth allowedRoles={["admin", "school_head"]} />}
            >
              <Route path="/users" element={<ManageUsers />} />
              <Route
                path="/fund-requests/:id"
                element={<RequestDetailPage />}
              />
              <Route
                path="/prepare-list-of-priorities"
                element={<ListOfPrioritiesPage />}
              />
            </Route>
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
