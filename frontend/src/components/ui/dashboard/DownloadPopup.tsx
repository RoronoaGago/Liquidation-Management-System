import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, X } from 'lucide-react';

interface DownloadPopupProps {
  isOpen: boolean;
  requestId: string;
  onClose: () => void;
  onGoToLiquidation: () => void;
}

const DownloadPopup: React.FC<DownloadPopupProps> = ({
  isOpen,
  requestId,
  onClose,
  onGoToLiquidation
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred background */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
      
      {/* Popup content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-end">
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-xl text-gray-900">
              Request Downloaded Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Download className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  MOOE Request Downloaded
                </span>
              </div>
              <p className="text-sm text-green-700">
                Your MOOE request <strong>{requestId}</strong> has been successfully downloaded 
                and cash advance has been received.
              </p>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                You can now proceed with the liquidation process to submit your supporting documents.
              </p>
              
              <div className="flex gap-3">
                <Button
                  onClick={onGoToLiquidation}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Go to Liquidation
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DownloadPopup;
