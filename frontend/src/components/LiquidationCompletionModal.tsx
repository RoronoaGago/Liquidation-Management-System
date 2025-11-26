import React from "react";
import { CheckCircle, Trophy, Download, FileText, Calendar, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Button from "./ui/button/Button";
import { formatCurrency } from "@/lib/helpers";

interface LiquidationCompletionModalProps {
  visible: boolean;
  onClose: () => void;
  liquidationData: {
    id: string;
    month: string;
    totalAmount: number;
    refund: number;
    date_liquidated?: string | null;
    reviewed_by_division?: {
      first_name: string;
      last_name: string;
      position?: string;
    } | null;
  };
  onViewHistory?: () => void;
  onDownloadReport?: () => void;
}

const LiquidationCompletionModal: React.FC<LiquidationCompletionModalProps> = ({
  visible,
  onClose,
  liquidationData,
  onViewHistory,
  onDownloadReport,
}) => {
  const getRefundMessage = () => {
    if (liquidationData.refund > 0) {
      return {
        type: "refund",
        title: "Refund Due to Division Office",
        message: `You must return ${formatCurrency(liquidationData.refund)} to the Division Office.`,
        icon: "💰",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/10",
        borderColor: "border-green-200 dark:border-green-800",
      };
    } else if (liquidationData.refund < 0) {
      return {
        type: "over-expenditure",
        title: "Over-Expenditure (No Refund Due)",
        message: `You spent ${formatCurrency(Math.abs(liquidationData.refund))} more than requested.`,
        icon: "⚠️",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-900/10",
        borderColor: "border-amber-200 dark:border-amber-800",
      };
    } else {
      return {
        type: "fully-liquidated",
        title: "Fully Liquidated (No Refund Due)",
        message: "All funds have been fully liquidated. No refund is due.",
        icon: "✅",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-900/10",
        borderColor: "border-blue-200 dark:border-blue-800",
      };
    }
  };

  const refundInfo = getRefundMessage();

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl rounded-2xl bg-white dark:bg-gray-800 p-0 overflow-hidden shadow-2xl border-0 lg:max-w-6xl [&>button]:hidden">
        {/* Header Section */}
        <div className="relative bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 px-8 py-6 border-b border-gray-100 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                Liquidation Complete!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Your liquidation request has been successfully finalized
              </p>
            </div>
          </div>
        </div>

        {/* Content Section - Two Column Layout */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Summary */}
            <div className="flex flex-col gap-6">
              {/* Summary Card */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600 flex flex-col" style={{minHeight: '300px'}}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Liquidation Summary
                  </h4>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Request ID</span>
                      <span className="font-medium text-gray-900 dark:text-white">#{liquidationData.id}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Period</span>
                      <span className="font-medium text-gray-900 dark:text-white">{liquidationData.month}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Amount</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(liquidationData.totalAmount)}</span>
                    </div>
                    
                    {liquidationData.reviewed_by_division && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Finalized by</span>
                        <span className="font-medium text-gray-900 dark:text-white text-right">
                          {liquidationData.reviewed_by_division.first_name} {liquidationData.reviewed_by_division.last_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Next Steps Notice */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4" style={{minHeight: '120px'}}>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h6 className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-1">
                      Next Steps
                    </h6>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• View this liquidation in your request history</li>
                      {/* <li>• Download the report for your records</li> */}
                      {liquidationData.refund > 0 && (
                        <li>• Return the refund amount to the Division Office</li>
                      )}
                    </ul>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        Action items completed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Financial Summary */}
            <div className="flex flex-col gap-6">
              {/* Financial Summary Card */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600 flex flex-col" style={{minHeight: '300px'}}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    liquidationData.refund > 0
                      ? "bg-green-100 dark:bg-green-900/30"
                      : liquidationData.refund < 0
                      ? "bg-red-100 dark:bg-red-900/30"
                      : "bg-blue-100 dark:bg-blue-900/30"
                  }`}>
                    <CheckCircle className={`h-5 w-5 ${
                      liquidationData.refund > 0
                        ? "text-green-600 dark:text-green-400"
                        : liquidationData.refund < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-blue-600 dark:text-blue-400"
                    }`} />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Financial Summary
                  </h4>
                </div>
                
                <div className={`p-6 rounded-lg border-2 ${refundInfo.borderColor} ${refundInfo.bgColor} flex-1 flex flex-col`}>
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-3 ${refundInfo.color}`}>
                      {liquidationData.refund > 0 
                        ? formatCurrency(liquidationData.refund)
                        : liquidationData.refund < 0
                        ? formatCurrency(Math.abs(liquidationData.refund))
                        : "₱0.00"
                      }
                    </div>
                    <h5 className={`font-semibold text-base mb-3 ${refundInfo.color}`}>
                      {refundInfo.title}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                      {refundInfo.message}
                    </p>
                    {liquidationData.date_liquidated && (
                      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Finalized: {new Date(liquidationData.date_liquidated).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Completion Status Card */}
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4" style={{minHeight: '120px'}}>
                <div className="flex items-start gap-3">
                  <Trophy className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h6 className="font-medium text-green-800 dark:text-green-200 text-sm mb-1">
                      Completion Status
                    </h6>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your liquidation has been successfully processed and approved by all required authorities.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        All approvals completed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="bg-gray-50 dark:bg-gray-700/50 px-8 py-6 border-t border-gray-200 dark:border-gray-600">
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Close
            </Button>
            {onViewHistory && (
              <Button
                variant="primary"
                onClick={onViewHistory}
                startIcon={<FileText className="h-4 w-4" />}
                className="w-full sm:w-auto order-3 sm:order-2"
              >
                View History
              </Button>
            )}
            {/* {onDownloadReport && (
              <Button
                variant="primary"
                onClick={onDownloadReport}
                startIcon={<Download className="h-4 w-4" />}
                className="w-full sm:w-auto order-1 sm:order-3"
              >
                Download Report
              </Button>
            )} */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiquidationCompletionModal;
