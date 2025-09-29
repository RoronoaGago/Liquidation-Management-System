import React from "react";
import { TrendingUp } from "lucide-react";

interface FrequentlyUsedPriority {
  priority: string;
  frequency: number;
  totalAmount: number;
  lastUsed: string;
}

interface FrequentlyUsedPrioritiesProps {
  priorities: FrequentlyUsedPriority[];
  className?: string;
}

const FrequentlyUsedPriorities: React.FC<FrequentlyUsedPrioritiesProps> = ({
  priorities,
  className = "",
}) => {
  if (!priorities || priorities.length === 0) {
    return null;
  }

  return (
    <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5" />
        Frequently Used Priorities
      </h3>
      <div className="space-y-3">
        {priorities.map((priority, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div className="flex-1">
              <div className="font-medium text-gray-800">{priority.priority}</div>
              <div className="text-sm text-gray-500">
                Used {priority.frequency} times • Last used: {priority.lastUsed}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-800">
                ₱{priority.totalAmount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Total amount</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FrequentlyUsedPriorities;
