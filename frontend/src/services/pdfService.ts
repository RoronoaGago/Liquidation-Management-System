import api from './api';

/**
 * PDF Service for server-side PDF generation with actual e-signatures
 * This replaces the client-side PDF generation for better security and audit trails
 */

export interface PDFGenerationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Generate PDF for an approved request with actual e-signatures
 * @param requestId - The ID of the approved request
 * @returns Promise<PDFGenerationResponse>
 */
export const generateApprovedRequestPDF = async (requestId: string): Promise<PDFGenerationResponse> => {
  try {
    const response = await api.get(`/requests/${requestId}/generate-pdf/`, {
      responseType: 'blob', // Important for handling binary data
    });

    // Check if the response is a PDF or JSON error
    const contentType = response.headers['content-type'];

    if (contentType.includes('application/pdf')) {
      // Handle PDF response
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `approved_request_${requestId}.pdf`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: 'PDF generated and downloaded successfully'
      };
    } else if (contentType.includes('application/json')) {
      // Handle JSON error response
      const text = await new Response(response.data).text();
      const errorData = JSON.parse(text);

      return {
        success: false,
        error: errorData.error || 'Failed to generate PDF'
      };
    } else {
      return {
        success: false,
        error: 'Unexpected response format from server'
      };
    }

  } catch (error: any) {
    console.error('Error generating PDF:', error);

    // Handle network errors or other exceptions
    let errorMessage = 'Failed to generate PDF';

    if (error.response) {
      // Try to extract error message from blob if it's JSON
      if (error.response.data instanceof Blob) {
        try {
          const text = await new Response(error.response.data).text();
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = 'Server returned an error';
        }
      } else if (typeof error.response.data === 'object') {
        errorMessage = error.response.data.error || errorMessage;
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Check if a request is eligible for PDF generation
 * @param request - The request object
 * @returns boolean
 */
export const canGeneratePDF = (request: any): boolean => {
  return request.status === 'approved';
};

/**
 * Get the appropriate filename for the PDF
 * @param request - The request object
 * @returns string
 */
export const getPDFFilename = (request: any): string => {
  const schoolName = request.user?.school?.schoolName || 'Unknown School';
  const requestId = request.request_id;
  return `${schoolName.replace(/\s+/g, '_')}_${requestId}.pdf`;
};
