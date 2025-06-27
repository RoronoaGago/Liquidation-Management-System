import React from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { validatePhoneNumber } from "@/lib/helpers"; // Adjust the import path as needed
import Label from "../Label";

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string | undefined) => void;
  error?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChange,
  error,
  id = "phone_number",
  disabled = false,
  required = false,
  autoComplete,
}) => {
  const isValid = value ? validatePhoneNumber(value) : null;

  // Base input classes matching InputField.tsx
  let inputClasses = `h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-none focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30`;

  // Conditional classes for disabled, error, and normal states
  if (disabled) {
    inputClasses += ` text-gray-500 border-gray-400 opacity-40 bg-gray-100 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
  } else if (error) {
    inputClasses += ` border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:text-error-400 dark:border-error-500 dark:focus:border-error-800`;
  } else {
    inputClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800`;
  }

  // Handle input to enforce +63 and 10 digits
  const handleInput = (inputValue: string | undefined) => {
    if (!inputValue) {
      onChange("+63");
      return;
    }

    // Remove all non-numeric characters except the + in +63
    let cleanedValue = inputValue.replace(/[^0-9+]/g, "");
    // Ensure it starts with +63 and limit to 10 digits after +63
    if (!cleanedValue.startsWith("+63")) {
      cleanedValue = "+63" + cleanedValue.replace(/^\+63/, "").slice(0, 10);
    } else {
      cleanedValue = "+63" + cleanedValue.replace(/^\+63/, "").slice(0, 10);
    }

    onChange(cleanedValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base">
        Phone Number
      </Label>
      <div className="relative">
        <PhoneInput
          international
          defaultCountry="PH"
          countrySelectProps={{ disabled: true }} // Disable country selection
          value={value}
          onChange={handleInput}
          className={inputClasses}
          placeholder="+639123456789"
          aria-describedby={`${id}_help`}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          maxLength={16} // +63 (3 chars) + 10 digits
        />
        <span id={`${id}_help`} className="sr-only">
          Enter your Philippine phone number with country code, e.g.,
          +639123456789.
        </span>
      </div>
      {error && <p className="mt-1.5 text-xs text-error-500">{error}</p>}
    </div>
  );
};

export default PhoneNumberInput;
