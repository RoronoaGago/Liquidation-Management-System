import api from '@/api/axios';

export interface DemandLetterResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Generate demand letter PDF for a specific request
 */
export const generateDemandLetter = async (requestId: string): Promise<DemandLetterResponse> => {
  try {
    const response = await api.get(`/requests/${requestId}/generate-demand-letter/`, {
      responseType: 'blob', // Important for PDF files
    });

    // Create a blob URL and trigger download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `demand_letter_${requestId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      message: 'Demand letter generated successfully'
    };
  } catch (error: any) {
    console.error('Error generating demand letter:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to generate demand letter'
    };
  }
};
