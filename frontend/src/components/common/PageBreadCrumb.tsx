// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Link, useNavigate } from "react-router-dom";

interface BreadcrumbProps {
  pageTitle: string;
  backUrl?: string;
  liquidationId?: string;
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({
  pageTitle,
  backUrl,
  liquidationId,
}) => {
  const navigate = useNavigate();

  // Determine if we're on the details page
  const isDetailsPage = liquidationId !== undefined;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        {pageTitle}
      </h2>
      <nav>
        <ol className="flex items-center gap-1.5">
          {/* Always show Home link */}
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

          {/* Middle link - either the report page or back to report page */}
          {isDetailsPage ? (
            <li>
              <button
                onClick={() => backUrl && navigate(backUrl)}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {pageTitle.includes("District")
                  ? "District Liquidation Management"
                  : pageTitle.includes("Liquidator")
                  ? "Liquidator Review"
                  : pageTitle.includes("Division")
                  ? "Division Accountant Review"
                  : "Finalize Liquidation Report"}
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
          ) : (
            <li className="text-sm text-gray-800 dark:text-white/90">
              {pageTitle}
            </li>
          )}

          {/* Details page only - liquidation ID */}
          {isDetailsPage && (
            <li className="text-sm text-gray-800 dark:text-white/90">
              Liquidation Details: {liquidationId}
            </li>
          )}
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
