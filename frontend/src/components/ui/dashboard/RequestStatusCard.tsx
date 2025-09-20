import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";

interface Priority {
  expenseTitle: string;
  amount: number;
  description?: string;
}

interface RequestStatusCardProps {
  request: {
    request_id: string;
    status: string;
    request_monthyear: string;
    created_at: string;
    school_name?: string;
    school_id?: string;
    division?: string;
    total_amount?: number;
    priorities?: Priority[];
  };
  getStatusBadge: (status: string) => React.ReactNode;
  getPriorityColor: (priorityName: string, fallbackIndex?: number) => string;
  onClose?: () => void;
  className?: string;
}

const RequestStatusCard: React.FC<RequestStatusCardProps> = ({
  request,
  getStatusBadge,
  getPriorityColor,
  onClose,
  className = "",
}) => {
  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Your request is currently being reviewed by the Division Superintendent.';
      case 'approved':
        return 'Your request has been approved and is ready for download.';
      case 'downloaded':
        return 'Your request has been downloaded by the Division Accountant. You can now proceed to liquidation.';
      default:
        return 'Your request status: ' + status;
    }
  };

  return (
    <Card className={`mb-6 ${className}`}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Request Overview
        </CardTitle>
        {onClose && (
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Request Status */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-800">Current MOOE Request</h3>
              {getStatusBadge(request.status)}
            </div>
            
            {/* School Information */}
            <div className="mb-4 p-3 bg-white rounded-lg border">
              <div className="text-sm text-gray-600 font-medium mb-2">School Information</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500">School Name</div>
                  <div className="font-semibold text-gray-800">{request.school_name || "San Jose Elementary School"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">School ID</div>
                  <div className="font-semibold text-gray-800">{request.school_id || "SJES-001"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Division</div>
                  <div className="font-semibold text-gray-800">{request.division || "Division of City Schools - Manila"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Request Period</div>
                  <div className="font-semibold text-gray-800">{request.request_monthyear}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-sm text-blue-600 font-medium">Request ID</div>
                <div className="text-lg font-semibold text-blue-800">{request.request_id}</div>
              </div>
              <div>
                <div className="text-sm text-blue-600 font-medium">Total Amount</div>
                <div className="text-lg font-semibold text-blue-800">
                  ₱{request.total_amount?.toLocaleString() || "250,000"}
                </div>
              </div>
              <div>
                <div className="text-sm text-blue-600 font-medium">Created</div>
                <div className="text-lg font-semibold text-blue-800">
                  {new Date(request.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            {/* Request Priorities and Amounts */}
            {request.priorities && request.priorities.length > 0 && (
              <div className="mt-4 p-4 bg-white rounded-lg border">
                <div className="text-sm text-gray-600 font-medium mb-3">Request Priorities & Amounts</div>
                <div className="space-y-3">
                  {request.priorities.map((priority, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: getPriorityColor(priority.expenseTitle, index) }}
                          ></div>
                          <span className="font-medium text-gray-800">{priority.expenseTitle}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-800">₱{priority.amount.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">
                            {((priority.amount / (request.total_amount || 250000)) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      {priority.description && (
                        <div className="text-xs text-gray-600 mt-1">
                          {priority.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">Total Amount</span>
                    <span className="text-lg font-bold text-blue-800">
                      ₱{request.total_amount?.toLocaleString() || "250,000"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 p-3 bg-white rounded border">
              <div className="text-sm text-gray-600">
                <strong>Status:</strong> {getStatusMessage(request.status)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestStatusCard;
