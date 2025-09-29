import React from "react";
import { Button } from "@/components/ui/button";
import { X, FileText } from "lucide-react";

interface DownloadedRequestPopupProps {
  isOpen: boolean;
  requestId: string;
  onClose: () => void;
  onGoToLiquidation: () => void;
  className?: string;
}

const DownloadedRequestPopup: React.FC<DownloadedRequestPopupProps> = ({
  isOpen,
  requestId,
  onClose,
  onGoToLiquidation,
  className = "",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            MOOE Request Downloaded
          </h3>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4">
          {/* School Information */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600 font-medium mb-2">School Information</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-blue-500">School Name</div>
                <div className="font-semibold text-blue-800">San Jose Elementary School</div>
              </div>
              <div>
                <div className="text-xs text-blue-500">Request ID</div>
                <div className="font-semibold text-blue-800">{requestId}</div>
              </div>
              <div>
                <div className="text-xs text-blue-500">Period</div>
                <div className="font-semibold text-blue-800">January 2025</div>
              </div>
              <div>
                <div className="text-xs text-blue-500">Total Amount</div>
                <div className="font-semibold text-blue-800">₱250,000</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Status</div>
            <div className="text-lg font-semibold text-green-800">
              Downloaded by Division Accountant
            </div>
          </div>

          {/* Quick Priority Overview */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 font-medium mb-2">Request Priorities</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>School Supplies</span>
                <span className="font-semibold">₱75,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Facility Repairs</span>
                <span className="font-semibold">₱90,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Office Supplies</span>
                <span className="font-semibold">₱40,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Teacher Training</span>
                <span className="font-semibold">₱30,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Maintenance</span>
                <span className="font-semibold">₱15,000</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Your MOOE request has been downloaded by the Division Accountant. 
            You can now proceed to the liquidation process to upload supporting documents and complete the liquidation.
          </div>
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={onGoToLiquidation}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              Go to Liquidation
            </Button>
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadedRequestPopup;
