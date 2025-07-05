/* eslint-disable @typescript-eslint/no-unused-vars */
import { Link, useNavigate } from "react-router-dom";

interface BreadcrumbProps {
  pageTitle: string;
  backUrl?: string;
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle, backUrl }) => {
  const navigate = useNavigate();

  // Dynamic button text based on pageTitle
  let buttonText = "Home";
  if (pageTitle === "District Liquidation Management") {
    buttonText = "District Liquidation Management";
  } else if (pageTitle === "Finalize Liquidation Report") {
    buttonText = "Finalize Liquidation Report";
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        {pageTitle}
      </h2>
      <nav>
        <ol className="flex items-center gap-1.5">
          <li>
            <button
              onClick={() => (backUrl ? navigate(backUrl) : navigate("/"))}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {buttonText}
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
          <li className="text-sm text-gray-800 dark:text-white/90">
            {pageTitle}
          </li>
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
