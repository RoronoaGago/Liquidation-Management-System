/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/api/axios";
import SchoolHeadBreadcrumb from "@/components/common/SchoolHeadBreadcrumb";
import {
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowLeft,
  Calendar,
  UserCheck,
  Clock,
  XCircle,
  RefreshCw,
  Eye,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { formatDateTime, formatCurrency } from "@/lib/helpers";
import { Skeleton } from "antd";

interface LiquidationData {
  LiquidationID: string;
  request: {
    request_id: string;
    request_monthyear: string;
    priorities: Array<{
      id: string | number;
      amount: number;
      priority: {
        expenseTitle: string;
        LOPID?: string;
      };
    }>;
  };
  refund: number;
  status: string;
  reviewed_by_district?: {
    first_name: string;
    last_name: string;
  };
  reviewed_by_liquidator?: {
    first_name: string;
    last_name: string;
  };
  reviewed_by_division?: {
    first_name: string;
    last_name: string;
  };
  date_districtApproved?: string;
  date_liquidatorApproved?: string;
  date_liquidated?: string;
}

interface Document {
  id: number;
  document_url: string;
  requirement_obj: {
    requirementTitle: string;
  };
  is_approved: boolean | null;
  reviewer_comment: string | null;
  request_priority_id: number;
  uploaded_at: string;
  file_size?: number;
}

const SchoolHeadLiquidationDetailsPage = () => {
  const { liquidationId } = useParams<{ liquidationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liquidationData, setLiquidationData] = useState<LiquidationData | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (liquidationId) {
      fetchLiquidationDetails();
    }
  }, [liquidationId]);

  const fetchLiquidationDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch detailed liquidation data
      const [liquidationDetails, documentsRes] = await Promise.all([
        api.get(`/liquidations/${liquidationId}/`),
        api.get(`/liquidations/${liquidationId}/documents/`)
      ]);
      
      setLiquidationData(liquidationDetails.data);
      setDocuments(documentsRes.data);
    } catch (error) {
      console.error("Error fetching liquidation details:", error);
      setError("Failed to load liquidation details");
      toast.error("Failed to load liquidation details");
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6">
        <SchoolHeadBreadcrumb pageTitle="Liquidation Details" liquidationId={liquidationId} backUrl="/requests-history" />

        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col gap-4">
            <Skeleton active paragraph={{ rows: 0 }} />
            <div className="flex gap-4">
              <Skeleton.Button active size="large" shape="round" />
              <Skeleton.Button active size="large" shape="round" />
            </div>
          </div>

          {/* Main Card Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-4">
              <Skeleton active paragraph={{ rows: 2 }} />
              <div className="space-y-2">
                <Skeleton active paragraph={{ rows: 0 }} />
                <Skeleton active paragraph={{ rows: 0 }} />
              </div>
            </div>
          </div>

          {/* Expenses List Skeleton */}
          <div className="space-y-4">
            <Skeleton active paragraph={{ rows: 0 }} />
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <Skeleton active avatar paragraph={{ rows: 2 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !liquidationData) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6">
        <SchoolHeadBreadcrumb pageTitle="Liquidation Details" liquidationId={liquidationId} backUrl="/requests-history" />

        <div className="max-w-4xl mx-auto mt-6">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {error ? "Unable to Load Liquidation Details" : "Liquidation Not Found"}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {error 
                ? "We encountered an issue while loading the liquidation details. Please try again or contact support if the problem persists."
                : "The requested liquidation details could not be found. This liquidation may have been removed or you may not have permission to view it."
              }
            </p>
          </div>

          {/* Error State */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                    Error Details
                  </h3>
                  <p className="text-red-700 dark:text-red-300">
                    {error || "Liquidation not found"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/requests-history")}
              startIcon={<FileText className="h-5 w-5" />}
            >
              View Request History
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate(-1)}
              startIcon={<ArrowLeft className="h-5 w-5" />}
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6">
      <SchoolHeadBreadcrumb pageTitle="Liquidation Details" liquidationId={liquidationData.LiquidationID} backUrl="/requests-history" />

      {/* Main Content */}
      <div className="space-y-6">
        {/* Request Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Liquidation Request #{liquidationData.LiquidationID}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  For {liquidationData.request?.request_monthyear || "N/A"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Liquidated
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  {formatCurrency(liquidationData.request?.priorities?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Refund Information */}
            <div className={`p-4 rounded-lg border ${
              liquidationData.refund > 0
                ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800"
                : liquidationData.refund < 0
                ? "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800"
                : "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800"
            }`}>
              <div className="flex items-start gap-3">
                {liquidationData.refund > 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : liquidationData.refund < 0 ? (
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                )}
                <div>
                  <h4 className="font-semibold mb-1">
                    {liquidationData.refund > 0
                      ? "Refund Returned to Division Office"
                      : liquidationData.refund < 0
                      ? "Over-Expenditure (No Refund Due)"
                      : "Fully Liquidated (No Refund Due)"}
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    {liquidationData.refund > 0
                      ? `Refund amount: ${formatCurrency(liquidationData.refund)}`
                      : liquidationData.refund < 0
                      ? `Over-expenditure: ${formatCurrency(Math.abs(liquidationData.refund))}`
                      : "All funds have been fully liquidated. No refund is due."}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Expenses and Documents
            </h3>
          </div>

          {liquidationData.request?.priorities?.map((priority: any, idx: number) => {
            const expenseId = priority.id || priority.priority?.LOPID || "";
            const expenseDocuments = documents.filter(
              (doc: any) => String(doc.request_priority_id) === String(expenseId)
            ) || [];
            
            return (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Expense Header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-300">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {priority.priority?.expenseTitle || "Expense"}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(priority.amount || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {expenseDocuments.length} document{expenseDocuments.length !== 1 ? 's' : ''} uploaded
                    </span>
                  </div>
                </div>

                {/* Expense Content */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                  <div className="space-y-3">
                    {/* Documents List */}
                    {expenseDocuments.length > 0 ? (
                      expenseDocuments.map((doc: any, docIdx: number) => (
                        <div key={docIdx} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg ${
                          doc.is_approved === false
                            ? "bg-red-50 dark:bg-red-900/10 border-l-4 border-red-400"
                            : "bg-gray-50 dark:bg-gray-700/30"
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {doc.is_approved === true ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : doc.is_approved === false ? (
                                <XCircle className="h-5 w-5 text-red-500" />
                              ) : (
                                <Clock className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {doc.requirement_obj?.requirementTitle || "Document"}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  doc.is_approved === true
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                                    : doc.is_approved === false
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                                }`}>
                                  {doc.is_approved === true
                                    ? "Approved"
                                    : doc.is_approved === false
                                    ? "Rejected"
                                    : "Pending"}
                                </span>
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                                  PDF
                                </span>
                              </div>
                              {doc.reviewer_comment && (
                                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded">
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {doc.reviewer_comment}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.document_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                startIcon={<Eye className="h-4 w-4" />}
                                onClick={() => window.open(doc.document_url, '_blank')}
                              >
                                View PDF
                              </Button>
                            )}
                            {doc.file_size && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({(doc.file_size / 1024 / 1024).toFixed(1)} MB)
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                        No documents uploaded for this expense
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Approval Progress Section */}
        {(liquidationData.reviewed_by_district || liquidationData.reviewed_by_liquidator || liquidationData.reviewed_by_division) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                Approval Progress
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Track the progress of this liquidation request through the approval process
              </p>
            </div>

            <div className="p-6">
              {/* Approval Steps */}
              <div className="space-y-6">
                {/* District Approval Step */}
                {liquidationData.reviewed_by_district && (
                  <div className="flex items-start gap-4 p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        District Review
                      </h4>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Approved by:</span>{" "}
                          {liquidationData.reviewed_by_district.first_name} {liquidationData.reviewed_by_district.last_name}
                        </p>
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Approved on:</span>{" "}
                          {liquidationData.date_districtApproved 
                            ? new Date(liquidationData.date_districtApproved).toLocaleDateString()
                            : "N/A"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Liquidator Approval Step */}
                {liquidationData.reviewed_by_liquidator && (
                  <div className="flex items-start gap-4 p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Liquidator Review
                      </h4>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Approved by:</span>{" "}
                          {liquidationData.reviewed_by_liquidator.first_name} {liquidationData.reviewed_by_liquidator.last_name}
                        </p>
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Approved on:</span>{" "}
                          {liquidationData.date_liquidatorApproved 
                            ? new Date(liquidationData.date_liquidatorApproved).toLocaleDateString()
                            : "N/A"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Division Approval Step */}
                {liquidationData.reviewed_by_division && (
                  <div className="flex items-start gap-4 p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Division Final Review
                      </h4>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Finalized by:</span>{" "}
                          {liquidationData.reviewed_by_division.first_name} {liquidationData.reviewed_by_division.last_name}
                        </p>
                        <p className="text-green-700 dark:text-green-300">
                          <span className="font-medium">Finalized on:</span>{" "}
                          {liquidationData.date_liquidated 
                            ? new Date(liquidationData.date_liquidated).toLocaleDateString()
                            : "N/A"
                          }
                        </p>
                        <p className="text-green-700 dark:text-green-300 font-medium">
                          🎉 Liquidation Complete!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Overall Status Summary */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Current Status
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This liquidation has been successfully completed and finalized.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      Liquidated
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolHeadLiquidationDetailsPage;
