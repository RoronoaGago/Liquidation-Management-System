// components/help/HelpCategoryCard.tsx
import { HelpCategory } from "@/lib/helpTypes";
import {
  Users,
  School,
  FileText,
  BarChart3,
  Settings,
  DollarSign,
  ClipboardCheck,
  ListChecks,
} from "lucide-react";

interface HelpCategoryCardProps {
  category: HelpCategory;
  isSelected: boolean;
  onSelect: (categoryId: string) => void;
}

const iconMap: { [key: string]: React.ReactNode } = {
  users: <Users className="w-8 h-8" />, // if data uses "users"
  user: <Users className="w-8 h-8" />, // fallback
  school: <School className="w-8 h-8" />, // data uses "school"
  schools: <School className="w-8 h-8" />, // fallback
  mooe: <DollarSign className="w-8 h-8" />,
  liquidation: <ClipboardCheck className="w-8 h-8" />,
  reporting: <BarChart3 className="w-8 h-8" />,
  administration: <Settings className="w-8 h-8" />,
  settings: <Settings className="w-8 h-8" />, // data uses "settings" for getting-started
  priority: <ListChecks className="w-8 h-8" />, // for priority-management
};

const HelpCategoryCard: React.FC<HelpCategoryCardProps> = ({
  category,
  isSelected,
  onSelect,
}) => {
  return (
    <button
      onClick={() => onSelect(category.id)}
      className={`p-6 rounded-xl text-left transition-all duration-200 border-2 ${
        isSelected
          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      <div className="flex items-center gap-4 mb-3">
        <div
          className={`p-2 rounded-lg ${
            isSelected
              ? "bg-brand-100 dark:bg-brand-800 text-brand-600 dark:text-brand-400"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
          }`}
        >
          {iconMap[category.icon] || <FileText className="w-8 h-8" />}
        </div>
        <h3
          className={`font-semibold text-lg ${
            isSelected
              ? "text-brand-900 dark:text-brand-100"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {category.name}
        </h3>
      </div>
      <p
        className={`text-sm ${
          isSelected
            ? "text-brand-700 dark:text-brand-300"
            : "text-gray-600 dark:text-gray-400"
        }`}
      >
        {category.description}
      </p>
    </button>
  );
};

export default HelpCategoryCard;
