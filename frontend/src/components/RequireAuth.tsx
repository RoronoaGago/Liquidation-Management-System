import React, { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/context/AuthContext";

interface RequireAuthProps {
  allowedRoles?: string[];
}

const RequireAuth: React.FC<RequireAuthProps> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, user, userRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If allowedRoles is provided, check if user has required role
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    // Redirect to not-authorized or home page
    // return <Navigate to="/not-authorized" state={{ from: location }} replace />;
    // Alternatively, you could redirect to home:
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
