import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Button from "@/components/ui/button/Button";

interface SchoolHeadBreadcrumbProps {
  pageTitle: string;
  liquidationId?: string;
  showBackButton?: boolean;
}

const SchoolHeadBreadcrumb: React.FC<SchoolHeadBreadcrumbProps> = ({
  pageTitle,
  liquidationId,
  showBackButton = true,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          {pageTitle}
        </h2>
      </div>
      <nav>
        <ol className="flex items-center gap-1.5">
          {/* Home link */}
          <li>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Home
              <svg
                className="stroke-current"
                width="17"
                height="16"
                viewBox="0 0 17 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                  stroke=""
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </li>

          {/* Request History link */}
          <li>
            <button
              onClick={() => navigate("/requests-history")}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Request History
              <svg
                className="stroke-current"
                width="17"
                height="16"
                viewBox="0 0 17 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                  stroke=""
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </li>

          {/* Current page - either the main page or details */}
          {liquidationId ? (
            <li className="text-sm text-gray-800 dark:text-white/90">
              Liquidation Details: {liquidationId}
            </li>
          ) : (
            <li className="text-sm text-gray-800 dark:text-white/90">
              {pageTitle}
            </li>
          )}
        </ol>
      </nav>
    </div>
  );
};

export default SchoolHeadBreadcrumb;
