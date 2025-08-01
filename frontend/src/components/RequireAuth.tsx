import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/context/AuthContext";

interface RequireAuthProps {
  allowedRoles?: string[];
}

const RequireAuth: React.FC<RequireAuthProps> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
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
  if (allowedRoles && (!user?.role || !allowedRoles.includes(user.role))) {
    console.log(user?.role);
    console.log(allowedRoles);
    // Redirect to not-authorized or home page
    // return <Navigate to="/not-authorized" state={{ from: location }} replace />;
    // Alternatively, you could redirect to home:
    return <Navigate to="/not-authorized" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
