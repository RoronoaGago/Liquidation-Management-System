export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(value);
};
export const validateEmail = (email: string) => {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return re.test(email);
};

export const validatePassword = (password: string) => {
  const re =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return re.test(password);
};

export const validatePhoneNumber = (phone: string) => {
  const re = /^[+\d][\d\s-()]*\d$/;
  return re.test(phone);
};

export const validateDateOfBirth = (dateString: string) => {
  if (!dateString) return "";
  const birthDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (birthDate > today) {
    return "Birthdate cannot be in the future.";
  }

  const minAgeDate = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate()
  );

  if (birthDate > minAgeDate) {
    return "You must be at least 18 years old.";
  }

  return "";
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
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};





export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export const formatDateTime = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

