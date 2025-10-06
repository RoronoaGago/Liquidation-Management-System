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
      <DialogContent 
        className="w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-800 p-0 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden [&>button]:hidden xl:max-w-4xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header with celebration gradient */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-green-200 dark:border-green-800">
          <DialogHeader className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 shadow-lg">
                <Trophy className="text-2xl text-green-600 dark:text-green-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  🎉 Liquidation Complete!
                </DialogTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your liquidation request has been successfully finalized
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Summary */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                Summary
              </h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Request ID</span>
                  <span className="font-medium text-gray-900 dark:text-white">#{liquidationData.id}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Period</span>
                  <span className="font-medium text-gray-900 dark:text-white">{liquidationData.month}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
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

            {/* Right Column - Refund & Next Steps */}
            <div className="space-y-4">
              {/* Refund Information */}
              <div className={`p-4 rounded-lg border ${refundInfo.borderColor} ${refundInfo.bgColor}`}>
                <div className="flex items-start gap-3">
                  <div className="text-xl">{refundInfo.icon}</div>
                  <div>
                    <h4 className={`font-semibold text-sm mb-1 ${refundInfo.color}`}>
                      {refundInfo.title}
                    </h4>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {refundInfo.message}
                    </p>
                    {liquidationData.date_liquidated && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Finalized: {new Date(liquidationData.date_liquidated).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-2">
                  Next Steps
                </h4>
                <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• View in request history</li>
                  <li>• Download report for records</li>
                  {liquidationData.refund > 0 && (
                    <li>• Return refund to Division Office</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={onClose}
              size="sm"
              className="px-4 py-2"
            >
              Close
            </Button>
            {onViewHistory && (
              <Button
                variant="outline"
                onClick={onViewHistory}
                startIcon={<FileText className="h-4 w-4" />}
                size="sm"
                className="px-4 py-2"
              >
                View History
              </Button>
            )}
            {onDownloadReport && (
              <Button
                variant="primary"
                onClick={onDownloadReport}
                startIcon={<Download className="h-4 w-4" />}
                size="sm"
                className="px-4 py-2"
              >
                Download Report
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiquidationCompletionModal;
