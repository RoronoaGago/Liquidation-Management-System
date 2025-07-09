import React from "react";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  className?: string;
  indicatorClassName?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  className = "",
  indicatorClassName = "",
  ...props
}) => (
  <div
    className={`w-full bg-gray-200 rounded-full overflow-hidden ${className}`}
    {...props}
  >
    <div
      className={`h-full transition-all duration-300 ${indicatorClassName}`}
      style={{
        width: `${Math.max(0, Math.min(100, value))}%`,
        height: "100%",
      }}
    />
  </div>
);
