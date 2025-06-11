// src/api/reportService.ts
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export interface ReportRequestParams {
  period?: 'daily' | 'weekly' | 'monthly' | 'custom';
  start_date?: string;
  end_date?: string;
  service_type?: 'standard' | 'express';
  status?: 'pending' | 'in_progress' | 'ready_for_pickup' | 'completed' | 'cancelled';
  include_details?: boolean;
}

export interface ServiceTypeBreakdown {
  [key: string]: {
    total: number;
    count: number;
  };
}

export interface StatusBreakdown {
  [key: string]: number;
}

export interface Transaction {
  id: number;
  customer: {
    first_name: string;
    last_name: string;
    contact_number: string;
  };
  service_type: string;
  status: string;
  grand_total: number;
  created_at: string;
}

export interface SalesReportData {
  period: string;
  start_date: string;
  end_date: string;
  total_sales: number;
  total_transactions: number;
  average_sale: number;
  service_type_breakdown: ServiceTypeBreakdown;
  status_breakdown: StatusBreakdown;
  transactions?: Transaction[];
}

export const fetchSalesReport = async (params: ReportRequestParams): Promise<SalesReportData> => {
  try {
    const response = await axios.get<SalesReportData>(`${API_BASE_URL}/reports/sales/`, {
      params: {
        ...params,
        start_date: params.start_date,
        end_date: params.end_date,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sales report');
    }
    throw new Error('An unexpected error occurred');
  }
};

export const exportSalesReport = async (
  params: ReportRequestParams
): Promise<{ blob: Blob; filename: string }> => {
  try {
    console.log('[exportSalesReport] Starting export with params:', params);

    const response = await axios.get(`${API_BASE_URL}/reports/sales/export/`, {
      params,
      responseType: 'blob',
    });

    console.log('[exportSalesReport] Received response with headers:', response.headers);

    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers['content-disposition'];
    console.log('[exportSalesReport] Content-Disposition header:', contentDisposition);

    let filename = 'Sales Report.xlsx'; // Default fallback

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      console.log('[exportSalesReport] Filename match result:', filenameMatch);

      if (filenameMatch?.[1]) {
        filename = filenameMatch[1];
      }
    }

    console.log('[exportSalesReport] Determined filename:', filename);
    console.log('[exportSalesReport] Response data type:', typeof response.data);

    return {
      blob: response.data,
      filename,
    };
  } catch (error) {
    console.error('[exportSalesReport] Error occurred:', error);

    if (axios.isAxiosError(error)) {
      console.error('[exportSalesReport] Axios error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
      throw new Error(error.response?.data?.message || 'Failed to export report');
    }
    throw new Error('An unexpected error occurred');
  }
};