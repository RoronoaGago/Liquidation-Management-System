import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";

interface YearlyBudgetStatus {
  current_year: number;
  total_schools: number;
  schools_with_budget: number;
  schools_without_budget: number;
  all_schools_allocated: boolean;
  schools_without_budget_list: Array<{
    schoolId: string;
    schoolName: string;
  }>;
}

interface FirstMondayInfo {
  current_year: number;
  first_monday_january: string;
  today: string;
  is_after_first_monday: boolean;
  days_since_first_monday: number;
}

export const useYearlyBudgetModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [budgetStatus, setBudgetStatus] = useState<YearlyBudgetStatus | null>(null);
  const [firstMondayInfo, setFirstMondayInfo] = useState<FirstMondayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if user has dismissed the modal today
  const getDismissedToday = useCallback(() => {
    const today = new Date().toDateString();
    const dismissed = localStorage.getItem("yearlyBudgetModalDismissed");
    return dismissed === today;
  }, []);

  // Set modal as dismissed for today
  const setDismissedToday = useCallback(() => {
    const today = new Date().toDateString();
    localStorage.setItem("yearlyBudgetModalDismissed", today);
  }, []);

  // Fetch budget status and first Monday info
  const fetchBudgetInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusRes, mondayRes] = await Promise.all([
        api.get("/budget-allocations/check-status/"),
        api.get("/budget-allocations/first-monday-info/"),
      ]);

      setBudgetStatus(statusRes.data);
      setFirstMondayInfo(mondayRes.data);
    } catch (err: any) {
      console.error("Error fetching budget info:", err);
      setError(err.response?.data?.message || "Failed to fetch budget information");
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if modal should be shown
  const shouldShowModal = useCallback(() => {
    if (!budgetStatus || !firstMondayInfo) return false;
    
    // Don't show if all schools are allocated
    if (budgetStatus.all_schools_allocated) return false;
    
    // Don't show if it's before the first Monday of January
    if (!firstMondayInfo.is_after_first_monday) return false;
    
    // Don't show if user dismissed it today
    if (getDismissedToday()) return false;
    
    return true;
  }, [budgetStatus, firstMondayInfo, getDismissedToday]);

  // Handle proceed action
  const handleProceed = useCallback(() => {
    setIsModalOpen(false);
    navigate("/resource-allocation");
  }, [navigate]);

  // Handle do later action
  const handleDoLater = useCallback(() => {
    setDismissedToday();
    setIsModalOpen(false);
  }, [setDismissedToday]);

  // Handle modal close
  const handleClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Initialize and check modal status
  useEffect(() => {
    const initializeModal = async () => {
      await fetchBudgetInfo();
    };

    initializeModal();
  }, [fetchBudgetInfo]);

  // Update modal visibility when data changes
  useEffect(() => {
    if (!loading && shouldShowModal()) {
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
    }
  }, [loading, shouldShowModal]);

  // Refresh data periodically (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBudgetInfo();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchBudgetInfo]);

  return {
    isModalOpen,
    budgetStatus,
    firstMondayInfo,
    loading,
    error,
    handleProceed,
    handleDoLater,
    handleClose,
    refreshData: fetchBudgetInfo,
  };
};
