import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router"; // Reuse your existing type
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "../components/ui/button/Button";
import {
  ArrowLeftIcon,
  PencilIcon,
  SendIcon,
  CheckCircleIcon,
  PrinterIcon,
  FileStackIcon,
  ArrowDownToLineIcon,
  TriangleAlertIcon,
} from "lucide-react";
import FundRequest from "./FundRequest";
import StatusBadge from "@/components/ui/badge/StatusBadge";

const RequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<FundRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock data fetch - replace with real API call
  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        const mockRequests: FundRequest[] = [
          {
            id: "REQ-2023-001",
            status: "approved",
            items: [
              {
                id: "1",
                accountCode: "5020101000",
                accountName: "5020101000 - Traveling Expenses - Local",
                amount: "5,000.00",
                description: "Field work transportation",
                dateRange: {
                  start: "2023-06-01",
                  end: "2023-06-03",
                },
                files: [],
              },
            ],
            createdAt: "2023-05-28T10:30:00Z",
            updatedAt: new Date().toISOString(),
          },
        ];

        const foundRequest = mockRequests.find((req) => req.id === id);
        if (foundRequest) {
          setRequest(foundRequest);
        } else {
          setError("Request not found");
        }
      } catch (err) {
        setError("Failed to load request");
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id, lastUpdated]);

  const handleRefresh = () => {
    setLastUpdated(new Date());
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <TriangleAlertIcon className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mt-3 text-lg font-medium text-gray-900 dark:text-white">
            {error}
          </h2>
          <div className="mt-6">
            <Button
              variant="primary"
              onClick={() => navigate("/fund-requests")}
              startIcon={<ArrowLeftIcon className="h-5 w-5 mr-2" />}
            >
              Back to Requests
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!request) return null;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header with back button and breadcrumbs */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate("/fund-requests")}
          className="mr-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <PageBreadcrumb
          // links={[
          //   { name: "Home", href: "/" },
          //   { name: "Fund Requests", href: "/fund-requests" },
          //   { name: `Request ${request.id}`, href: `#` },
          // ]}
          pageTitle={`Request ${request.id}`}
        />
      </div>

      {/* Status and refresh header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <StatusBadge status={request.status} large />
          <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
            Last updated: {new Date(request.updatedAt || "").toLocaleString()}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Refresh"
        >
          <ArrowDownToLineIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Main content area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        {/* Action buttons based on status */}
        <div className="flex flex-wrap gap-2 mb-6">
          {request.status === "draft" && (
            <>
              <Button
                variant="primary"
                startIcon={<PencilIcon className="h-5 w-5 mr-2" />}
              >
                Edit
              </Button>
              <Button
                color="success"
                startIcon={<SendIcon className="h-5 w-5 mr-2" />}
              >
                Submit for Approval
              </Button>
            </>
          )}
          {request.status === "approved" && (
            <Button
              variant="primary"
              startIcon={<CheckCircleIcon className="h-5 w-5 mr-2" />}
            >
              Initiate Liquidation
            </Button>
          )}
          <Button
            variant="outline"
            startIcon={<PrinterIcon className="h-5 w-5 mr-2" />}
          >
            Print
          </Button>
          <Button
            variant="outline"
            startIcon={<FileStackIcon className="h-5 w-5 mr-2" />}
          >
            Clone Request
          </Button>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

        {/* Tabbed interface */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("details")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "details"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300"
              }`}
            >
              Request Details
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "timeline"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300"
              }`}
            >
              Approval Timeline
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "comments"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300"
              }`}
            >
              Comments & Notes
            </button>
          </nav>
        </div>

        {/* Tab panels */}
        <div className="pt-4">
          {activeTab === "details" && (
            <div>
              <h3 className="text-lg font-medium mb-4">Expense Items</h3>
              {/* Will be replaced with ExpenseItem components */}
              <p>Expense items will go here</p>
            </div>
          )}
          {activeTab === "timeline" && (
            <div>
              <h3 className="text-lg font-medium mb-4">Approval History</h3>
              {/* Will be replaced with Timeline components */}
              <p>Approval timeline will go here</p>
            </div>
          )}
          {activeTab === "comments" && (
            <div>
              <h3 className="text-lg font-medium mb-4">Discussion</h3>
              {/* Will be replaced with Comments components */}
              <p>Comments section will go here</p>
            </div>
          )}
        </div>
      </div>

      {/* Related requests section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium mb-2">Related Requests</h3>
        <p className="text-gray-500 dark:text-gray-400">
          (Will show requests with same account codes)
        </p>
      </div>
    </div>
  );
};

export default RequestDetailPage;
