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

import NotAuthorized from "./pages/NotAuthorized";
import ManageExpenseAccounts from "./pages/ManageExpenseAccounts";
import FundRequestApproval from "./pages/FundRequestApproval";
import ListOfPrioritiesPage from "./pages/FundRequest";
import ManageSchools from "./pages/ManageSchools";

const App = () => {
  return (
    <Router>
      <AuthProvider>
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
                path="/expense-accounts"
                element={<ManageExpenseAccounts />}
              />
            </Route>

            {/* School Head-only routes */}
            <Route element={<RequireAuth allowedRoles={["school_head"]} />}>
              <Route
                path="/list-of-priorities"
                element={<ListOfPrioritiesPage />}
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

            {/* Teacher-only routes */}
            <Route element={<RequireAuth allowedRoles={["teacher"]} />}>
              {/* <Route path="/classes" element={<MyClasses />} />
              <Route
                path="/generate-report/student-performance"
                element={<StudentPerformanceReport />}
              /> */}
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
