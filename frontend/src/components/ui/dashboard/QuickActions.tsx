import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Clock, FileText } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  className = "",
}) => {
  return (
    <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Button
              key={action.id}
              onClick={action.onClick}
              variant={action.variant || "outline"}
              className={`h-auto p-4 flex flex-col items-center gap-2 ${action.className || ""}`}
            >
              <IconComponent className="h-6 w-6" />
              <span className="font-medium">{action.label}</span>
              <span className="text-xs text-gray-500">{action.description}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
