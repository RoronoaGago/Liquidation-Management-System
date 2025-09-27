import api from './api';

export interface SchoolHeadDashboardData {
  liquidationProgress: {
    priorities: PriorityProgress[];
    totalPriorities: number;
    completedPriorities: number;
    completionPercentage: number;
  };
  financialMetrics: {
    totalDownloadedAmount: number;
    totalLiquidatedAmount: number;
    liquidationPercentage: number;
    remainingAmount: number;
  };
  recentLiquidations: LiquidationItem[];
  priorityBreakdown: PriorityBreakdownItem[];
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
  frequentlyUsedPriorities?: {
    priority: string;
    frequency: number;
    totalAmount: number;
    lastUsed: string;
  }[];
  recentRequests?: {
    request_id: string;
    status: string;
    request_monthyear: string;
    created_at: string;
    total_amount: number;
    priorities: {
      expenseTitle: string;
      amount: number;
    }[];
  }[];
}

export interface PriorityProgress {
  priorityId: string;
  priorityName: string;
  status: "not_started" | "in_progress" | "completed";
  documentsRequired: number;
  documentsUploaded: number;
  completionPercentage: number;
}

export interface LiquidationItem {
  id: string;
  priorityName: string;
  amount: number;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  date: string;
}

export interface PriorityBreakdownItem {
  priority: string;
  amount: number;
  percentage: number;
  color: string;
  name: string;
}

export const dashboardService = {
  // Get school head dashboard data
  getSchoolHeadDashboard: async (): Promise<SchoolHeadDashboardData> => {
    const response = await api.get('/api/school-head-dashboard/');
    return response.data;
  },

  // Check pending requests
  checkPendingRequests: async () => {
    const response = await api.get('/api/check-pending-requests/');
    return response.data;
  },

  // Get next available month for request
  getNextAvailableMonth: async () => {
    const response = await api.get('/api/requests/next-available-month/');
    return response.data;
  },

  // Check request eligibility
  checkRequestEligibility: async (month?: string) => {
    const params = month ? { month } : {};
    const response = await api.get('/api/requests/check-eligibility/', { params });
    return response.data;
  },

  // Get user requests
  getUserRequests: async () => {
    const response = await api.get('/api/user-requests/');
    return response.data;
  },

  // Get user liquidations
  getUserLiquidations: async () => {
    const response = await api.get('/api/liquidation/');
    return response.data;
  },

  // Get notifications
  getNotifications: async () => {
    const response = await api.get('/api/notifications/');
    return response.data;
  },

  // Mark notification as read
  markNotificationAsRead: async (notificationId: number) => {
    const response = await api.patch(`/api/notifications/${notificationId}/read/`);
    return response.data;
  }
};

export default dashboardService;
