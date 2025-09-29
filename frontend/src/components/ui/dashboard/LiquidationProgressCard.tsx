import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface LiquidationProgressCardProps {
  liquidationId: string;
  completionPercentage: number;
  totalLiquidatedAmount: number;
  completedPriorities: number;
  totalPriorities: number;
  onContinueLiquidation?: () => void;
  className?: string;
}

const LiquidationProgressCard: React.FC<LiquidationProgressCardProps> = ({
  liquidationId,
  completionPercentage,
  totalLiquidatedAmount,
  completedPriorities,
  totalPriorities,
  onContinueLiquidation,
  className = "",
}) => {
  return (
    <Card className={`mb-6 ${className}`}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Current Liquidation Progress
        </CardTitle>
        {onContinueLiquidation && (
          <Button 
            onClick={onContinueLiquidation}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Continue Liquidation
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Liquidation ID</div>
              <div className="text-lg font-semibold text-green-800">{liquidationId}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Progress</div>
              <div className="text-lg font-semibold text-blue-800">
                {completionPercentage.toFixed(1)}% Complete
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Amount Liquidated</div>
              <div className="text-lg font-semibold text-purple-800">
                ₱{totalLiquidatedAmount.toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 font-medium mb-2">Liquidation Status</div>
            <div className="text-sm text-gray-800">
              You are currently liquidating your MOOE request. 
              {completedPriorities} of {totalPriorities} priorities have been completed.
              Continue uploading documents and completing the liquidation process.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiquidationProgressCard;
