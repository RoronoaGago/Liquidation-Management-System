import { useEffect, useState } from "react";

import Button from "../components/ui/button/Button";
import {
  CheckCircleIcon,
  XCircleIcon,
  CircleFadingArrowUpIcon,
  FileTextIcon,
  UserIcon,
} from "lucide-react";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { useParams } from "react-router";
import { toast } from "react-toastify";

const FundRequestApproval = () => {
  const { id } = useParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [request, setRequest] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("approval");
  const [userRole, setUserRole] = useState<
    "district" | "liquidator" | "accountant"
  >("district");

  // Mock data fetch
  useEffect(() => {
    const fetchRequest = async () => {
      try {
        // In real app, fetch request and user role from API
        const mockRequest = {
          id,
          status: "submitted",
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          history: [
            {
              event: "Submitted",
              timestamp: new Date().toISOString(),
              user: "Requester",
              comment: "Initial submission",
            },
          ],
        };
        setRequest(mockRequest);

        // Determine user role (mock implementation)
        setUserRole("district"); // Default, replace with actual logic
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        toast.error("Failed to load request data");
      }
    };

    fetchRequest();
  }, [id]);

  const handleDecision = async (
    decision: "approve" | "reject" | "request-changes"
  ) => {
    if (!request) return;

    setIsSubmitting(true);
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update request status
      const newStatus =
        decision === "approve"
          ? "approved"
          : decision === "reject"
          ? "rejected"
          : "submitted";

      setRequest({
        ...request,
        status: newStatus,
        history: [
          ...request.history,
          {
            event:
              decision === "approve"
                ? "Approved"
                : decision === "reject"
                ? "Rejected"
                : "Changes Requested",
            timestamp: new Date().toISOString(),
            user: "Approver",
            comment: comment || "No comment provided",
          },
        ],
      });

      toast.success(`Request ${newStatus} successfully`);
      setComment("");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Failed to process decision");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Request #{request.id}</h2>
          <div className="flex items-center mt-2">
            <StatusBadge status={request.status} large />
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <CircleFadingArrowUpIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("approval")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "approval"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300"
            }`}
          >
            Approval Actions
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "history"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300"
            }`}
          >
            History
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === "approval" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {userRole === "accountant"
                ? "Liquidation Notes"
                : "Approval Comments"}
            </label>
            <textarea
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter your comments..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              color="success"
              onClick={() => handleDecision("approve")}
              disabled={isSubmitting}
              startIcon={<CheckCircleIcon className="h-5 w-5 mr-2" />}
            >
              Approve
            </Button>

            <Button
              color="danger"
              onClick={() => handleDecision("reject")}
              disabled={isSubmitting}
              startIcon={<XCircleIcon className="h-5 w-5 mr-2" />}
            >
              Reject
            </Button>

            <Button
              variant="outline"
              onClick={() => handleDecision("request-changes")}
              disabled={isSubmitting}
              startIcon={<FileTextIcon className="h-5 w-5 mr-2" />}
            >
              Request Changes
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {request.history.map((item: any, index: number) => (
            <div key={index} className="flex items-start">
              <div className="flex-shrink-0 pt-1">
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-gray-500" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{item.event}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  By {item.user}
                </p>
                {item.comment && (
                  <div className="mt-1 text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {item.comment}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FundRequestApproval;
