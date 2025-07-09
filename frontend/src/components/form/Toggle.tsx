import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  className = "",
}) => {
  return (
    <label className={`inline-flex items-center cursor-pointer ${className}`}>
      <span className="relative mt-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div
          className={`w-10 h-6 rounded-full transition-colors duration-200
            ${checked ? "bg-brand-500" : "bg-gray-300"}
            ${disabled ? "opacity-50" : ""}
          `}
        />
        <div
          className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
            ${checked ? "translate-x-4" : ""}
          `}
        />
      </span>
      {label && (
        <span className="ml-3 text-sm text-gray-700 dark:text-gray-200">
          {label}
        </span>
      )}
    </label>
  );
};

export default Toggle;
