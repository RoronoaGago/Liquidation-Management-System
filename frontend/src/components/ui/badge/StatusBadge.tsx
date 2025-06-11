import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
  large?: boolean;
}

const statusStyles = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  liquidated:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  large = false,
}) => {
  const statusText = {
    draft: "Draft",
    submitted: "Submitted",
    approved: "Approved",
    rejected: "Rejected",
    liquidated: "Liquidated",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        large ? "px-4 py-2 text-sm" : "px-2.5 py-0.5 text-xs",
        statusStyles[status as keyof typeof statusStyles],
        className
      )}
    >
      {statusText[status as keyof typeof statusText]}
    </span>
  );
};

export default StatusBadge;
