// components/ESignatureModal.tsx
import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { XIcon, UploadIcon, CameraIcon } from "lucide-react";
import Label from "../form/Label";
import { toast } from "react-toastify";
import api from "@/api/axios";

interface ESignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requiredRoles?: string[];
}

const ESignatureModal = ({
  isOpen,
  onClose,
  onSuccess,
  requiredRoles = ["school_head", "superintendent", "accountant"],
}: ESignatureModalProps) => {
  const { user } = useAuth();
  const [signature, setSignature] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user || !requiredRoles.includes(user.role)) {
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ["image/jpeg", "image/jpg", "image/png"];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a JPG, JPEG, or PNG file");
        return;
      }

      if (file.size > maxSize) {
        toast.error("File size must be less than 5MB");
        return;
      }

      setSignature(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignature(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveSignature = () => {
    setSignature(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signature) {
      toast.error("Please upload an e-signature");
      return;
    }

    if (!privacyAgreed) {
      toast.error("Please agree to the data privacy terms");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("e_signature", signature);

      const response = await api.patch("/users/update-e-signature/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 200) {
        toast.success("E-signature uploaded successfully!");
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error("E-signature upload error:", error);
      toast.error(
        error.response?.data?.error || "Failed to upload e-signature"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Upload E-Signature
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          As a {user.role.replace("_", " ")}, you are required to upload your
          e-signature to complete your account setup.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="block mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Upload E-Signature
            </Label>

            {previewUrl ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <img
                    src={previewUrl}
                    alt="E-signature preview"
                    className="max-w-full max-h-48 object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveSignature}
                  className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove signature
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File upload */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <UploadIcon className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Upload an image of your signature
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileChange}
                    className="hidden"
                    id="signature-upload"
                  />
                  <label
                    htmlFor="signature-upload"
                    className="cursor-pointer bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
                  >
                    Choose File
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    JPG, JPEG, or PNG (max 5MB)
                  </p>
                </div>

                {/* Camera capture (optional) */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Or capture using camera
                  </p>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCapture}
                    className="hidden"
                    id="signature-camera"
                  />
                  <label
                    htmlFor="signature-camera"
                    className="cursor-pointer inline-flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    <CameraIcon className="w-4 h-4" />
                    Take Photo
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Data Privacy Agreement */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="privacy-agreement"
                checked={privacyAgreed}
                onChange={(e) => setPrivacyAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                required
              />
              <label
                htmlFor="privacy-agreement"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                <span className="font-medium">Data Privacy Agreement:</span> I
                understand that my electronic signature will be used for
                official document authentication within the Liquidation
                Management System. I consent to the storage and use of my
                signature data in accordance with the system's privacy policy
                and applicable data protection laws. I acknowledge that this
                signature will be used to authorize financial transactions and
                official documents on my behalf.
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!signature || isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Uploading..." : "Upload Signature"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ESignatureModal;
