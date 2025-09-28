import { useState, useEffect } from 'react';
import api from '@/api/axios';

interface BudgetNotification {
  has_notification: boolean;
  year?: number;
  message?: string;
}

export const useBudgetAllocationNotification = () => {
  const [notification, setNotification] = useState<BudgetNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkNotification = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/budget-allocation/check-notification/');
      setNotification(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to check budget allocation notification');
      setNotification({ has_notification: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkNotification();
  }, []);

  const refreshNotification = () => {
    checkNotification();
  };

  return {
    notification,
    loading,
    error,
    refreshNotification
  };
};
