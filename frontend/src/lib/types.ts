/* eslint-disable @typescript-eslint/no-explicit-any */
export interface BaseUser {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  profile_picture?: string; // For stored profile pictures (URL or path)
}

// src/lib/types.ts

export interface District {
  districtId: string; // Unique identifier for the district
  districtName: string; // Name of the district
  is_active?: boolean; // Optional field to indicate if the district is active
  legislativeDistrict?: string; // Optional field for legislative district
  municipality?: string; // Optional field for municipality
}
export interface School {
  schoolId: string;
  schoolName: string;
  districtId: string; // New field for form handling
  district: District; // Existing field for display
  municipality: string;
  legislativeDistrict: string;
  is_active?: boolean;
}
export type User = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  date_of_birth: string;
  date_joined: string;
  phone_number: string;
  role: string;
  profile_picture: string;
  is_active: boolean;
  password: string;
  confirm_password: string;
  school_district?: District;
  school_district_id?: string;
  school: School | null;
  profile_picture_base64?: string;
};
export type SortDirection = "asc" | "desc" | null;
export type SortableField = keyof Pick<
  User,
  | "id"
  | "first_name"
  | "last_name"
  | "username"
  | "email"
  | "phone_number"
  | "password"
  | "is_active"
  | "date_joined"
>;

export type DialogState = {
  edit: boolean;
  view: boolean;
  delete: boolean;
  archive: boolean;
  confirm: boolean;
  bulkArchive: boolean;
};


export interface Assignment {
  id: number;
  district: string;
  school: School | null;
  assigned_at: string;
}
export interface FilterOptions {
  role: string;
  dateRange: { start: string; end: string };
  searchTerm: string;
}

export interface AssignLiquidatorsFilterOptions {
  searchTerm: string;
}
export interface FormUser extends BaseUser {
  password?: string;
  confirm_password?: string;
  profile_picture_base64?: string; // For image uploads
  date_of_birth?: string;
  phone_number?: string;
  school?: string;
}

export type APIUser = Omit<
  FormUser,
  "confirm_password" | "profile_picture_base64"
>;

export type TransactionFormData = {
  customer: {
    firstName: string;
    lastName: string;
    address: string;
    contactNumber: string;
  };
  serviceType: string;
  regularClothesWeight: number;
  jeansWeight: number;
  linensWeight: number;
  comforterWeight: number;
  notes?: string;
};
export type ComponentCardProps = {
  title: string;
  children: React.ReactNode;
  placeholder?: string;
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
};

export type UserFormData = {
  first_name: string;
  last_name: string;
  username: string;
  password: string;
  confirm_password?: string;
  date_of_birth: string; // Update the type to allow Date | null
  email: string;
  phone_number: string;
};
export type ListofPriorityData = {
  LOPID: number;
  expenseTitle: string;
  category: string;
  is_active?: boolean;
  requirements?: (
    | {
      requirementID: number;
      requirementTitle: string;
      is_required: boolean;
    }
    | ListofPriorityData
  )[];
};

export type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
  roles?: string[];
  new?: boolean;
  pro?: boolean;
};

export type SubItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  pro?: boolean;
  new?: boolean;
  roles?: string[];
};

export type Transaction = {
  order_id: string;
  customer_name: string;
  contact_number: string;
  regular_clothes: number;
  jeans: number;
  beddings: number;
  comforter: number;
  grand_total: number;
  status: "Ready for Pick Up" | "Finishing" | "Pending";
  date_created: string;
};
export type ButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  children: React.ReactNode; // Button text or content
  size?: "sm" | "md" | "lg"; // Button size
  variant?:
  | "primary"
  | "secondary" // Added secondary variant
  | "outline"
  | "error"
  | "success"
  | "destructive"
  | "ghost"; // Button variant
  loading?: boolean;
  startIcon?: React.ReactNode; // Icon before the text
  endIcon?: React.ReactNode; // Icon after the text
  dataModal?: string;
  type?: "button" | "submit" | "reset"; // Explicitly add this
  asChild?: boolean; // If true, renders as a child component
};

export interface Requirement {
  requirementID: number;
  requirementTitle: string;
  is_required: boolean;
}

export interface ListOfPriority {
  LOPID: number;
  expenseTitle: string;
  requirements: Requirement[];
  is_active: boolean;
}

export type Submission = {
  date_approved: any;
  request_id: string;
  user: {
    role: string;
    id: string;
    first_name: string;
    last_name: string;
    school: School | null; // Use School type for school details
  };
  priorities: Priority[];
  status: "pending" | "approved" | "rejected" | "unliquidated" | "downloaded" | "liquidated" | "advanced";
  created_at: string;
  rejection_comment: string; // Optional field for rejection reason
  rejection_date: string; // Optional field for when the rejection occurred
  reviewed_by: User;
  reviewed_at?: string;
  is_resubmission?: boolean;
  previous_version?: string; // ID of the original submission if this is a resubmission
  notes?: string; // Optional notes field
  previous_request?: Submission; // Optional field for previous request
};


export type Prayoridad = {
  expenseTitle: string;
  amount: number;
  LOPID: number;
}
export type Priority = {
  id: number;
  priority: {
    LOPID: number;
    expenseTitle: string;
  };
  amount: number;
};
// Add this type for sorting ListOfPriority fields
export type LOPSortableField = "LOPID" | "expenseTitle";
