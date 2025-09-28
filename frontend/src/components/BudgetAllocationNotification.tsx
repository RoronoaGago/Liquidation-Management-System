import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useBudgetAllocationNotification } from '../hooks/useBudgetAllocationNotification';
import BudgetAllocationModal from './modals/BudgetAllocationModal';

const BudgetAllocationNotification: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notification, loading } = useBudgetAllocationNotification();
  const [showModal, setShowModal] = useState(false);

  // Only show for accountants
  if (!user || user.role !== 'accountant') {
    return null;
  }

  // Don't show if loading or no notification
  if (loading || !notification?.has_notification) {
    return null;
  }

  const handleClose = () => {
    setShowModal(false);
  };

  const handleProceed = () => {
    setShowModal(false);
    navigate('/resource-allocation');
  };

  // Show the modal when there's a notification
  if (notification.has_notification && !showModal) {
    setShowModal(true);
  }

  return (
    <BudgetAllocationModal
      isOpen={showModal}
      onClose={handleClose}
      onProceed={handleProceed}
      year={notification.year || new Date().getFullYear()}
    />
  );
};

export default BudgetAllocationNotification;
