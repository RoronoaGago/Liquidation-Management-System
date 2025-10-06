// services/liquidationService.ts
import api from '@/api/axios';
import { 
  LiquidationManagement, 
  UrgentLiquidationsResponse, 
  ApiErrorResponse 
} from '@/types/liquidation';

export const liquidationService = {
  /**
   * Get all liquidations for the authenticated user
   */
  getUserLiquidations: async (): Promise<LiquidationManagement[]> => {
    try {
      const response = await api.get('/liquidation/');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user liquidations:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch liquidations');
    }
  },

  /**
   * Get urgent liquidations (≤15 days remaining) for the authenticated user
   * This is the new dedicated endpoint for reminder functionality
   */
  getUrgentLiquidations: async (): Promise<UrgentLiquidationsResponse> => {
    try {
      const response = await api.get('/urgent-liquidations/');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching urgent liquidations:', error);
      const errorMessage = error.response?.data?.error || 'Failed to fetch urgent liquidations';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get a specific liquidation by ID
   */
  getLiquidationById: async (liquidationId: number): Promise<LiquidationManagement> => {
    try {
      const response = await api.get(`/liquidations/${liquidationId}/`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching liquidation ${liquidationId}:`, error);
      throw new Error(error.response?.data?.error || 'Failed to fetch liquidation');
    }
  },

  /**
   * Submit a liquidation for review
   */
  submitLiquidation: async (liquidationId: number): Promise<LiquidationManagement> => {
    try {
      const response = await api.post(`/liquidations/${liquidationId}/submit/`);
      return response.data;
    } catch (error: any) {
      console.error(`Error submitting liquidation ${liquidationId}:`, error);
      throw new Error(error.response?.data?.error || 'Failed to submit liquidation');
    }
  },

  /**
   * Update a liquidation
   */
  updateLiquidation: async (
    liquidationId: number, 
    data: Partial<LiquidationManagement>
  ): Promise<LiquidationManagement> => {
    try {
      const response = await api.patch(`/liquidations/${liquidationId}/`, data);
      return response.data;
    } catch (error: any) {
      console.error(`Error updating liquidation ${liquidationId}:`, error);
      throw new Error(error.response?.data?.error || 'Failed to update liquidation');
    }
  }
};

export default liquidationService;
