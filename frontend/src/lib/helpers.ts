/* eslint-disable no-useless-escape */
/* eslint-disable prefer-const */
import { isValidPhoneNumber } from "libphonenumber-js";
import dayjs from "dayjs";
import { School } from "./types";
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
};
export const validateEmail = (email: string) => {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return re.test(email);
};
export function getDistrictLogoFilename(district: string) {
  // Convert to lowercase, replace spaces and roman numerals, remove special chars, etc.
  return (
    district
      .toLowerCase()
      .replace(/\s+/g, "-") // spaces to dashes
      .replace(/i{2,}/g, (match) => match.replace(/i/g, "i")) // handle roman numerals if needed
      .replace(/[^a-z0-9\-]/g, "") + // remove non-alphanumeric except dash
    "-district.png"
  );
}

export const validatePassword = (password: string) => {
  const re =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return re.test(password);
};

export const validatePhoneNumber = (phone: string): boolean => {
  return phone ? isValidPhoneNumber(phone) : true; // Optional field
};

export const validateDateOfBirth = (dateString: string): string | undefined => {
  if (!dateString) return undefined; // Return undefined instead of null

  const date = dayjs(dateString);
  const now = dayjs();

  // Check if date is valid
  if (!date.isValid()) {
    return "Please enter a valid date";
  }

  // Check if date is in the future
  if (date.isAfter(now)) {
    return "Birthdate cannot be in the future";
  }

  // Check if age is at least 18 years
  const minAgeDate = now.subtract(18, "year");
  if (date.isAfter(minAgeDate)) {
    return "Must be at least 18 years old";
  }

  // Check if age is reasonable (not older than 120 years)
  const maxAgeDate = now.subtract(120, "year");
  if (date.isBefore(maxAgeDate)) {
    return "Please enter a valid birthdate";
  }

  return undefined;
};

export const getAvatarColor = (
  userId: number,
  first_name: string,
  last_name: string
) => {
  if (!userId) return "bg-gray-500";
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-indigo-500",
  ];
  let stringId = userId.toString();
  const hash =
    stringId && typeof stringId === "string"
      ? stringId.charCodeAt(0) + stringId.charCodeAt(stringId.length - 1)
      : (typeof first_name === "string" ? first_name.charCodeAt(0) : 0) +
        (typeof last_name === "string" ? last_name.charCodeAt(0) : 0);

  return colors[hash % colors.length];
};
export const getUserInitials = (first_name: string, last_name: string) => {
  if (!first_name || !last_name) return "U";
  const firstNameChar = first_name?.charAt(0) || "";
  const lastNameChar = last_name?.charAt(0) || "";
  return `${firstNameChar}${lastNameChar}`.toUpperCase() || "U";
};
export const calculateAge = (dateOfBirth: string | undefined) => {
  if (!dateOfBirth) return null; // Handle case where dateOfBirth is not provided

  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  // Adjust age if the birthday hasn't occurred yet this year
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export const formatDateTime = (dateString: string | undefined): string => {
  if (
    dateString === undefined ||
    dateString === null ||
    dateString.trim() === ""
  ) {
    // Handle the case where submittedDate is undefined, null, or an empty string
    // You could return an empty string, a default message, or throw an error.
    return "Date not provided"; // Example: Return a descriptive message
  }
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};
export const calculateExpectedDate = (
  submittedDate: string | undefined
): string => {
  if (
    submittedDate === undefined ||
    submittedDate === null ||
    submittedDate.trim() === ""
  ) {
    // Handle the case where submittedDate is undefined, null, or an empty string
    // You could return an empty string, a default message, or throw an error.
    return "Date not provided"; // Example: Return a descriptive message
  }

  const date = new Date(submittedDate);

  // It's good practice to check if the created date is valid
  // in case the submittedDate string was malformed.
  if (isNaN(date.getTime())) {
    return "Invalid submitted date format"; // Handle invalid date string
  }

  date.setDate(date.getDate() + 5); // Add 5 days as example

  return `Before ${date.toLocaleDateString()}`;
};

export const isBacklogCompliance = (
  school: School,
  requestMonthYear?: string
): boolean => {
  if (
    !school?.last_liquidated_month ||
    !school?.last_liquidated_year ||
    !requestMonthYear
  ) {
    return false;
  }
  const [requestYear, requestMonth] = requestMonthYear.split("-").map(Number);
  let expectedMonth = school.last_liquidated_month + 1;
  let expectedYear = school.last_liquidated_year;
  if (expectedMonth > 12) {
    expectedMonth = 1;
    expectedYear++;
  }
  return requestYear === expectedYear && requestMonth === expectedMonth;
};

export const formatRequestMonthYear = (monthYear?: string): string => {
  if (!monthYear) return "N/A";
  const [year, month] = monthYear.split("-");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
};
