import { ButtonProps } from "@/lib/types";

const Button = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  dataModal,
  type = "button", // Add default type here
  loading = false, // Accept loading prop
  ...rest // Capture all other props
}: ButtonProps & { loading?: boolean }) => {
  // Size Classes
  const sizeClasses = {
    sm: "px-4 py-3 text-sm",
    md: "px-5 py-3.5 text-sm",
    lg: "px-7 py-4 text-base font-semibold text-lg", // Added large size
  };

  // Variant Classes
  const variantClasses = {
    primary:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
    secondary:
      "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100", // <-- Added secondary variant
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
    error:
      "bg-red-500 text-white shadow-theme-xs hover:bg-red-600 disabled:bg-red-300",
    success:
      "bg-green-600 text-white shadow-theme-xs hover:bg-green-700 disabled:bg-green-300",
    destructive:
      "bg-red-600 text-white shadow-theme-xs hover:bg-red-700 disabled:bg-red-300",
    ghost:
      "bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60 shadow-none ring-0",
  };

  return (
    <button
      type={type} // Ensure type is passed through
      data-modal-target={dataModal}
      data-modal-toggle={dataModal}
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        disabled || loading ? "cursor-not-allowed opacity-50" : ""
      }`}
      onClick={onClick}
      disabled={disabled || loading}
      {...rest} // Spread remaining props
    >
      {loading && (
        <span className="animate-spin mr-1 flex items-center">
          <svg className="w-4 h-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
        </span>
      )}
      {!loading && startIcon && (
        <span className="flex items-center">{startIcon}</span>
      )}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
