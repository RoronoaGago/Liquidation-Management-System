import { Link } from "react-router";
import { AlertTriangle, Home } from "lucide-react";
import Button from "@/components/ui/button/Button";

const NotAuthorized = () => {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          403 - Access Denied
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You don't have permission to access this resource. Please contact your
          administrator if you believe this is an error.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            variant="primary"
            size="md"
            startIcon={<Home className="h-5 w-5" />}
          >
            <Link to="/">Return to Home</Link>
          </Button>

          {/* <Button asChild variant="outline" size="md">
            <Link to="/contact">Contact Support</Link>
          </Button> */}
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          Need help? Email us at{" "}
          <a
            href="mailto:support@mooe-system.edu"
            className="text-brand-500 hover:underline"
          >
            janlesterrivera@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default NotAuthorized;
