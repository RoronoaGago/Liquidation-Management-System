// pages/NotAuthorized.tsx
import { Link } from "react-router";

const NotAuthorized = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">403 - Not Authorized</h1>
      <p className="mb-4">You don't have permission to access this page.</p>
      <Link to="/" className="text-blue-500 hover:underline">
        Go back to dashboard
      </Link>
    </div>
  );
};

export default NotAuthorized;
