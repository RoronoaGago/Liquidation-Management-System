export type User = {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    date_of_birth?: string;
    date_joined: string;
    phone_number: string;
    role: string;
    profile_picture: string;
    is_active: boolean;
    password: string;
    confirm_password?: string;
    school: string;

}




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
}

export type UserFormData = {
    first_name: string;
    last_name: string;
    username: string;
    password: string;
    confirm_password?: string;
    date_of_birth: string; // Update the type to allow Date | null
    email: string;
    phone_number: string;
}

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
}
export type ButtonProps = React.ComponentPropsWithoutRef<"button"> & {
    children: React.ReactNode; // Button text or content
    size?: "sm" | "md"; // Button size
    variant?: "primary" | "outline" | "error"; // Button variant
    loading?: boolean;
    startIcon?: React.ReactNode; // Icon before the text
    endIcon?: React.ReactNode; // Icon after the text
    dataModal?: string;
}