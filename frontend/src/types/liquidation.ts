// types/liquidation.ts
export interface LiquidationRequest {
  request_id: string;
  request_monthyear: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    school?: {
      schoolId: string;
      schoolName: string;
    };
  };
  downloaded_at: string | null;
  last_reminder_sent: string | null;
  demand_letter_sent: boolean;
  demand_letter_date: string | null;
}

export interface LiquidationPriority {
  id: number;
  priority: {
    LOPID: number;
    expenseTitle: string;
    category: string;
  };
  amount: number;
}

export interface LiquidationDocument {
  id: number;
  document_name: string;
  document_file: string;
  uploaded_at: string;
  is_approved: boolean;
}

export interface LiquidationManagement {
  LiquidationID: number;
  request: LiquidationRequest;
  status: 'draft' | 'submitted' | 'resubmit' | 'liquidated' | 'rejected';
  remaining_days: number | null;
  liquidation_deadline: string | null;
  rejection_comment: string | null;
  submitted_at: string;
  reviewed_at_district: string | null;
  reviewed_at_liquidator: string | null;
  reviewed_at_division: string | null;
  reviewed_by_district: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  reviewed_by_liquidator: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  reviewed_by_division: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  liquidation_priorities: LiquidationPriority[];
  documents: LiquidationDocument[];
  reviewer_comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface UrgentLiquidationsSummary {
  total_urgent: number;
  overdue: number;
  critical: number;
  warning: number;
}

export interface UrgentLiquidationsResponse {
  liquidations: LiquidationManagement[];
  summary: UrgentLiquidationsSummary;
  last_checked: string;
}

export interface LiquidationReminderData {
  liquidation: LiquidationManagement;
  urgencyLevel: 'overdue' | 'critical' | 'warning';
  daysRemaining: number;
}

// Utility types for the reminder component
export type LiquidationStatus = LiquidationManagement['status'];
export type UrgencyLevel = 'overdue' | 'critical' | 'warning';

// API response types
export interface ApiErrorResponse {
  error: string;
  detail?: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
}
