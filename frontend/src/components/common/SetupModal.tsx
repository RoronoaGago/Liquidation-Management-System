// components/SetupModal.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import PasswordChangeModal from "./PasswordChangeModal";
import ESignatureModal from "./ESignatureModal";

const SetupModal = () => {
  const { user, passwordChangeRequired, eSignatureRequired, setupFlowActive, completeSetupFlow } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showESignatureModal, setShowESignatureModal] = useState(false);

  // Check if user requires e-signature
  const requiresESignature =
    user &&
    ["school_head", "superintendent", "accountant"].includes(user.role) &&
    !user.e_signature;

  useEffect(() => {
    if (setupFlowActive) {
      if (passwordChangeRequired) {
        setShowPasswordModal(true);
      } else if (eSignatureRequired) {
        setShowESignatureModal(true);
      }
    }
  }, [setupFlowActive, passwordChangeRequired, eSignatureRequired]);

  const handlePasswordSuccess = () => {
    setShowPasswordModal(false);
    if (requiresESignature) {
      setShowESignatureModal(true);
    } else {
      completeSetupFlow();
    }
  };

  const handleESignatureSuccess = () => {
    setShowESignatureModal(false);
    completeSetupFlow();
  };


  return (
    <>
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onSuccess={handlePasswordSuccess}
      />

      <ESignatureModal
        isOpen={showESignatureModal}
        onSuccess={handleESignatureSuccess}
      />
    </>
  );
};

export default SetupModal;
