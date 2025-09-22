import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Badge from '@/components/ui/badge/Badge';
import { CheckCircle, Clock, Download, FileText, AlertCircle, XCircle } from 'lucide-react';

interface MOOERequestStatusTrackerProps {
  className?: string;
  requestStatus?: {
    hasPendingRequest: boolean;
    hasActiveLiquidation: boolean;
    pendingRequest?: {
      request_id: string;
      status: string;
      request_monthyear: string;
      created_at: string;
      school_name?: string;
      school_id?: string;
      division?: string;
      total_amount?: number;
      priorities?: {
        expenseTitle: string;
        amount: number;
        description?: string;
      }[];
    };
    activeLiquidation?: {
      LiquidationID: string;
      status: string;
      created_at: string;
    };
  };
}

interface StatusStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'completed' | 'current' | 'upcoming' | 'error';
  date?: string;
  details?: string;
}

const MOOERequestStatusTracker: React.FC<MOOERequestStatusTrackerProps> = ({ 
  className = '', 
  requestStatus 
}) => {
  // Generate status steps based on real data
  const generateStatusSteps = (): StatusStep[] => {
    if (!requestStatus) {
      // No request data - show initial state
      return [
        {
          id: 'prepare',
          title: 'Prepare Request',
          description: 'Create your MOOE request with priorities and amounts',
          icon: FileText,
          status: 'current',
          details: 'Click "New MOOE Request" to get started'
        },
        {
          id: 'submit',
          title: 'Submit for Review',
          description: 'Request will be submitted to Division Superintendent',
          icon: Clock,
          status: 'upcoming',
          details: 'Available after creating request'
        },
        {
          id: 'approval',
          title: 'Approval Process',
          description: 'Under review by Division Superintendent',
          icon: AlertCircle,
          status: 'upcoming',
          details: 'Review typically takes 3-5 business days'
        },
        {
          id: 'download',
          title: 'Download & Cash Advance',
          description: 'Download approved request and receive cash advance',
          icon: Download,
          status: 'upcoming',
          details: 'Available after approval'
        },
        {
          id: 'liquidation',
          title: 'Liquidation Process',
          description: 'Submit liquidation with supporting documents',
          icon: CheckCircle,
          status: 'upcoming',
          details: 'Submit within 30 days of receiving cash advance'
        }
      ];
    }

    const pendingRequest = requestStatus.pendingRequest;
    const activeLiquidation = requestStatus.activeLiquidation;
    
    // Determine current status based on request data
    let currentStep = 'prepare';
    if (pendingRequest) {
      switch (pendingRequest.status) {
        case 'pending':
          currentStep = 'approval';
          break;
        case 'approved':
          currentStep = 'download';
          break;
        case 'downloaded':
          currentStep = 'download'; // Keep at download step when downloaded
          break;
        case 'rejected':
          currentStep = 'error';
          break;
        default:
          currentStep = 'submit';
      }
    }

    const steps: StatusStep[] = [
      {
        id: 'prepare',
        title: 'Prepare Request',
        description: 'Create your MOOE request with priorities and amounts',
        icon: FileText,
        status: pendingRequest ? 'completed' : 'current',
        date: pendingRequest ? new Date(pendingRequest.created_at).toLocaleDateString() : undefined,
        details: pendingRequest ? `Request ${pendingRequest.request_id} created successfully` : 'Click "New MOOE Request" to get started'
      },
      {
        id: 'submit',
        title: 'Submit for Review',
        description: 'Request submitted to Division Superintendent',
        icon: Clock,
        status: pendingRequest && currentStep !== 'prepare' ? 'completed' : currentStep === 'submit' ? 'current' : 'upcoming',
        date: pendingRequest ? new Date(pendingRequest.created_at).toLocaleDateString() : undefined,
        details: pendingRequest ? 'Request submitted successfully' : 'Available after creating request'
      },
      {
        id: 'approval',
        title: 'Approval Process',
        description: 'Under review by Division Superintendent',
        icon: AlertCircle,
        status: currentStep === 'approval' ? 'current' : 
                currentStep === 'download' ? 'completed' : 'upcoming',
        date: pendingRequest && currentStep !== 'prepare' ? new Date(pendingRequest.created_at).toLocaleDateString() : undefined,
        details: currentStep === 'approval' ? 'Review in progress - typically takes 3-5 business days' :
                currentStep === 'download' ? 'Request approved successfully' :
                'Review typically takes 3-5 business days'
      },
      {
        id: 'download',
        title: 'Download & Cash Advance',
        description: 'Download approved request and receive cash advance',
        icon: Download,
        status: currentStep === 'download' ? 'current' : 'upcoming',
        details: currentStep === 'download' ? 'Ready for download and cash advance' :
                'Available after approval'
      }
    ];

    // Handle error state
    if (currentStep === 'error') {
      steps[2].status = 'error';
      steps[2].details = 'Request was rejected - please review and resubmit';
    }

    return steps;
  };

  const statusSteps = generateStatusSteps();

  const getStatusIcon = (step: StatusStep) => {
    const IconComponent = step.icon;
    const baseClasses = "h-5 w-5";
    
    switch (step.status) {
      case 'completed':
        return <IconComponent className={`${baseClasses} text-green-600`} />;
      case 'current':
        return <IconComponent className={`${baseClasses} text-blue-600 animate-pulse`} />;
      case 'error':
        return <XCircle className={`${baseClasses} text-red-600`} />;
      default:
        return <IconComponent className={`${baseClasses} text-gray-400`} />;
    }
  };

  const getStatusBadge = (status: StatusStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'current':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          MOOE Request Status Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {statusSteps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Connection line */}
              {index < statusSteps.length - 1 && (
                <div className="absolute left-6 top-8 w-0.5 h-16 bg-gray-200" />
              )}
              
              <div className="flex items-start gap-4">
                {/* Status icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                  {getStatusIcon(step)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      {step.title}
                    </h3>
                    {getStatusBadge(step.status)}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {step.description}
                  </p>
                  
                  {step.date && (
                    <p className="text-xs text-gray-500 mb-1">
                      {step.status === 'completed' ? 'Completed' : 
                       step.status === 'current' ? 'Started' : 'Expected'}: {step.date}
                    </p>
                  )}
                  
                  {step.details && (
                    <p className="text-xs text-gray-500 italic">
                      {step.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Current Status Summary
          </h4>
          <p className="text-sm text-blue-700">
            {!requestStatus ? (
              "You haven't created any MOOE requests yet. Click 'New MOOE Request' to get started with your first request."
            ) : requestStatus.pendingRequest ? (
              requestStatus.pendingRequest.status === 'pending' ? (
                `Your MOOE request ${requestStatus.pendingRequest.request_id} is currently under review by the Division Superintendent. You will be notified once it has been approved or if any additional information is required.`
              ) : requestStatus.pendingRequest.status === 'approved' ? (
                `Your MOOE request ${requestStatus.pendingRequest.request_id} has been approved and is ready for download and cash advance.`
              ) : requestStatus.pendingRequest.status === 'downloaded' ? (
                `Your MOOE request ${requestStatus.pendingRequest.request_id} has been downloaded and cash advance received. The request process is now complete.`
              ) : requestStatus.pendingRequest.status === 'rejected' ? (
                `Your MOOE request ${requestStatus.pendingRequest.request_id} was rejected. Please review the feedback and resubmit your request.`
              ) : (
                `Your MOOE request ${requestStatus.pendingRequest.request_id} status: ${requestStatus.pendingRequest.status}.`
              )
            ) : (
              "You don't have any active requests at the moment."
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MOOERequestStatusTracker;
