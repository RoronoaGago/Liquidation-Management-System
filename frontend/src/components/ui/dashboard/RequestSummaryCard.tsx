import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Badge from '@/components/ui/badge/Badge';
import { FileText, Calendar, User, Download, CheckCircle } from 'lucide-react';
import { SchoolHeadDashboardData } from '@/api/dashboardService';

interface RequestSummaryCardProps {
  request: NonNullable<SchoolHeadDashboardData['requestStatus']>['pendingRequest'];
  getStatusBadge: (status: string) => React.ReactNode;
  getPriorityColor: (priorityName: string, fallbackIndex?: number) => string;
  onClose: () => void;
}

const RequestSummaryCard: React.FC<RequestSummaryCardProps> = ({
  request,
  getStatusBadge,
  getPriorityColor,
  onClose
}) => {
  if (!request) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalAmount = request.priorities?.reduce((sum, priority) => sum + parseFloat(priority.amount.toString()), 0) || 0;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Request Summary
          </div>
          {getStatusBadge(request.status)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Request Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Request ID</div>
              <div className="text-lg font-semibold text-blue-800">
                {request.request_id}
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Month/Year</div>
              <div className="text-lg font-semibold text-green-800">
                {request.request_monthyear}
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Total Amount</div>
              <div className="text-lg font-semibold text-purple-800">
                ₱{totalAmount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Request Timeline
            </h4>
            
            <div className="space-y-3">
              {/* Submitted */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Request Submitted</div>
                  <div className="text-sm text-gray-500">
                    {formatDate(request.created_at)}
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
              </div>

              {/* Approved - Show if status is approved or downloaded */}
              {(request.status === 'approved' || request.status === 'downloaded') && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Request Approved</div>
                    <div className="text-sm text-gray-500">
                      Approved by Division Superintendent
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                </div>
              )}

              {/* Downloaded - Show if status is downloaded */}
              {request.status === 'downloaded' && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Download className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Request Downloaded</div>
                    <div className="text-sm text-gray-500">
                      Downloaded by Division Accountant
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Cash advance received
                    </div>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">Completed</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Priorities Summary */}
          {request.priorities && request.priorities.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Request Priorities</h4>
              <div className="space-y-2">
                {request.priorities.map((priority, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getPriorityColor(priority.expenseTitle || 'Unknown', index) }}
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {priority.expenseTitle || 'Unknown Priority'}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      ₱{parseFloat(priority.amount.toString()).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestSummaryCard;
