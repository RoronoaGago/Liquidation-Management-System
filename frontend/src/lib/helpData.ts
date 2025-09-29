// data/helpData.ts

import { HelpArticle, HelpCategory } from "./helpTypes";

export const helpCategories: HelpCategory[] = [
    {
        id: "getting-started",
        name: "Getting Started",
        icon: "settings",
        description: "Basic system overview and first-time setup guides",
        roles: ["admin", "school_head", "school_admin", "district_admin", "superintendent", "liquidator", "accountant"]
    },
    {
        id: "user-management",
        name: "User Management",
        icon: "users",
        description: "Managing users, roles, and permissions",
        roles: ["admin"]
    },
    {
        id: "school-management",
        name: "School Management",
        icon: "school",
        description: "Managing schools, districts, and related data",
        roles: ["admin"]
    },
    {
        id: "priority-management",
        name: "Priority Management",
        icon: "priority",
        description: "Managing lists of priorities and requirements",
        roles: ["admin"]
    },
    {
        id: "mooe-management",
        name: "MOOE Management",
        icon: "mooe",
        description: "Priority lists, fund requests, and allocation",
        roles: ["admin", "school_head", "superintendent", "accountant"]
    },
    {
        id: "liquidation",
        name: "Liquidation Process",
        icon: "liquidation",
        description: "Liquidation reports and approval workflows",
        roles: ["school_head", "school_admin", "district_admin", "liquidator", "accountant", "superintendent"]
    },
    {
        id: "reporting",
        name: "Reporting",
        icon: "reporting",
        description: "Generate and analyze reports",
        roles: ["admin", "superintendent", "accountant"]
    },
    {
        id: "administration",
        name: "System Administration",
        icon: "administration",
        description: "Backup, restore, and system settings",
        roles: ["admin"]
    }
];

export const helpArticles: HelpArticle[] = [
    // Login Article
    {
        id: "admin-login",
        title: "System Login",
        description: "How to log in to the system using valid credentials",
        content: "# System Login\n\nTo access the system, you must log in using valid credentials including your email address and password.",
        category: "getting-started",
        roles: ["admin", "school_head", "school_admin", "district_admin", "superintendent", "liquidator", "accountant"],
        relatedArticles: ["admin-dashboard"],
        images: [
            "/images/help/login-screen.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true,
        steps: [
            {
                number: 1,
                title: "Access Login Page",
                description: "Navigate to the system login page in your web browser",
                image: "/images/help/login-screen.png",
                alt: "System login page"
            },
            {
                number: 2,
                title: "Enter Credentials",
                description: "Enter your valid email address and password in the respective fields",
                image: "/images/help/enter-credentials.png",
                alt: "Email and password fields"
            },
            {
                number: 3,
                title: "Access System",
                description: "Click the Login button to access your dashboard",
                image: "/images/help/login-button.png",
                alt: "Login button"
            }
        ]
    },

    // Dashboard Article
    {
        id: "admin-dashboard",
        title: "Administrator Dashboard Overview",
        description: "Learn how to navigate and use your administrator dashboard effectively",
        content: "# Administrator Dashboard\n\nYour dashboard provides an overview of system statistics, recent activities, and quick access to management functions.",
        category: "getting-started",
        roles: ["admin"],
        relatedArticles: ["admin-manage-users", "admin-manage-schools"],
        images: [
            "/images/help/admin-dashboard.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: false,
        steps: [
            {
                number: 1,
                title: "Dashboard Overview",
                description: "After login, you'll see the main dashboard with system statistics and quick access menus",
                image: "/images/help/admin-dashboard.png",
                alt: "Administrator dashboard overview"
            },


        ]
    },

    // User Management Articles
    {
        id: "admin-manage-users",
        title: "Managing Users in the System",
        description: "Learn how to add, edit, and manage user accounts and permissions",
        content: "# Managing Users\n\nComplete guide to managing user accounts, including adding new users, editing existing users, and archiving users.",
        category: "user-management",
        roles: ["admin"],
        relatedArticles: ["admin-user-roles", "admin-permissions"],
        images: [
            "/images/help/admin-add-user.png",
            "/images/help/admin-edit-user.png",
            "/images/help/admin-archive-user.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true,
        steps: [
            {
                number: 1,
                title: "Access Manage Users Page",
                description: "Go to Manage users from the navigation menu",
                image: "/images/help/navigate-users.png",
                alt: "Sidebar navigation showing Users option"
            },
            {
                number: 2,
                title: "Add New User",
                description: "Click Add New User button to create a new user account",
                image: "/images/help/add-user-button.png",
                alt: "Add User button highlighted"
            },
            {
                number: 3,
                title: "Fill User Details",
                description: "Complete the user form with all required information",
                image: "/images/help/user-form.png",
                alt: "User details form"
            },
            {
                number: 4,
                title: "Confirm User Addition",
                description: "Click confirm in the dialog to finalize user creation",
                image: "/images/help/confirm-add-user.png",
                alt: "Confirmation dialog for adding user"
            }
        ]
    },

    {
        id: "admin-edit-user",
        title: "Editing User Information",
        description: "How to modify existing user accounts and information",
        category: "user-management",
        content: "# Editing User Information\n\nGuide to editing user accounts including updating personal information and changing roles.",
        roles: ["admin"],
        relatedArticles: ["admin-manage-users"],
        images: [
            "/images/help/admin-edit-user.png",
            "/images/help/save-changes-user.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: false,
        steps: [
            {
                number: 1,
                title: "Find User",
                description: "Use search or browse to find the user you want to edit",
                image: "/images/help/search-user.png",
                alt: "Search for user"
            },
            {
                number: 2,
                title: "Click Edit Button",
                description: "Click the Edit button next to the user's name",
                image: "/images/help/edit-user-button.png",
                alt: "Edit user button"
            },
            {
                number: 3,
                title: "Update Information",
                description: "Modify the necessary fields in the user form",
                image: "/images/help/user-edit-form.png",
                alt: "User edit form"
            },
            {
                number: 4,
                title: "Save Changes",
                description: "Click Save Changes and confirm in the dialog",
                image: "/images/help/confirm-edit-user.png",
                alt: "Confirm changes dialog"
            }
        ]
    },

    {
        id: "admin-archive-user",
        title: "Archiving and Restoring Users",
        description: "How to archive users and restore archived user accounts",
        category: "user-management",
        content: "# Archiving and Restoring Users\n\nGuide to archiving users who are no longer active and restoring them if needed.",
        roles: ["admin"],
        relatedArticles: ["admin-manage-users"],
        images: [
            "/images/help/admin-archive-user.png",
            "/images/help/restore-user.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: false,
        steps: [
            {
                number: 1,
                title: "Archive User",
                description: "Click Archive button next to the user's name",
                image: "/images/help/archive-user-button.png",
                alt: "Archive user button"
            },
            {
                number: 2,
                title: "Confirm Archive",
                description: "Click Archive again in confirmation dialog",
                image: "/images/help/confirm-archive-user.png",
                alt: "Confirm archive dialog"
            },
            {
                number: 3,
                title: "View Archived Users",
                description: "Click Archive button above user list to view archived users",
                image: "/images/help/view-archived-users.png",
                alt: "View archived users"
            },
            {
                number: 4,
                title: "Restore User",
                description: "Click restore button and confirm to restore user",
                image: "/images/help/restore-user-button.png",
                alt: "Restore user button"
            }
        ]
    },

    {
        id: "admin-filter-user",
        title: "Filtering User Lists",
        description: "How to filter and search through user lists",
        content: "# Filtering Users\n\nComplete guide to filtering and searching through user lists.",
        category: "user-management",
        roles: ["admin"],
        relatedArticles: ["admin-manage-users"],
        images: [
            "/images/help/filter-users.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: false,
        steps: [
            {
                number: 1,
                title: "Access Filter Dropdown",
                description: "Click the filter dropdown at the top of the user table",
                image: "/images/help/filter-dropdown.png",
                alt: "Filter dropdown menu"
            },

            {
                number: 2,
                title: "Apply Filter",
                description: "View the filtered list of users",
                image: "/images/help/filtered-users.png",
                alt: "Filtered user list"
            }
        ]
    },

    // School Management Articles
    {
        id: "admin-manage-schools",
        title: "Managing Schools in the System",
        description: "Complete guide to adding, editing, and managing schools",
        content: "# Managing Schools\n\nComplete guide to managing educational institutions in the system.",
        category: "school-management",
        roles: ["admin"],
        relatedArticles: ["admin-manage-districts"],
        images: [
            "/images/help/add-school.png",
            "/images/help/edit-school.png",
            "/images/help/filter-schools.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true,
        steps: [
            {
                number: 1,
                title: "Access Manage Schools",
                description: "Go to Manage schools from the navigation menu",
                image: "/images/help/navigate-schools.png",
                alt: "Navigate to schools section"
            },
            {
                number: 2,
                title: "Add New School",
                description: "Click Add New School button to create a new school",
                image: "/images/help/add-school-button.png",
                alt: "Add school button"
            },
            {
                number: 3,
                title: "Fill School Details",
                description: "Complete the school form with all required information",
                image: "/images/help/school-form.png",
                alt: "School details form"
            },
            {
                number: 4,
                title: "Confirm School Addition",
                description: "Click confirm in the dialog to finalize school creation",
                image: "/images/help/confirm-add-school.png",
                alt: "Confirm add school dialog"
            }
        ]
    },

    {
        id: "admin-edit-school",
        title: "Editing School Information",
        description: "How to modify existing school records",
        category: "school-management",
        content: "# Editing School Information\n\nGuide to editing school records including updating school details and associated data.",
        roles: ["admin"],
        relatedArticles: ["admin-manage-schools"],
        images: [
            "/images/help/edit-school.png",
            "/images/help/save-school-changes.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: false,
        steps: [
            {
                number: 1,
                title: "Find School",
                description: "Use search or browse to find the school to edit",
                image: "/images/help/search-school.png",
                alt: "Search for school"
            },
            {
                number: 2,
                title: "Click Edit Button",
                description: "Click Edit button next to school name",
                image: "/images/help/edit-school-button.png",
                alt: "Edit school button"
            },
            {
                number: 3,
                title: "Update School Information",
                description: "Modify the necessary fields in school form",
                image: "/images/help/school-edit-form.png",
                alt: "School edit form"
            },
            {
                number: 4,
                title: "Save Changes",
                description: "Click Save Changes and confirm in dialog",
                image: "/images/help/confirm-edit-school.png",
                alt: "Confirm school edits"
            }
        ]
    },

    // District Management Articles
    {
        id: "admin-manage-districts",
        title: "Managing Districts in the System",
        description: "Complete guide to adding, editing, and managing districts",
        content: "# Managing Districts\n\nComplete guide to managing educational districts in the system.",
        category: "school-management",
        roles: ["admin"],
        relatedArticles: ["admin-manage-schools"],
        images: [
            "/images/help/add-district.png",
            "/images/help/edit-district.png",
            "/images/help/filter-districts.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true,
        steps: [
            {
                number: 1,
                title: "Access Manage Districts",
                description: "Go to Manage Districts from the navigation menu",
                image: "/images/help/navigate-districts.png",
                alt: "Navigate to districts section"
            },
            {
                number: 2,
                title: "Add New District",
                description: "Click Add New District button",
                image: "/images/help/add-district-button.png",
                alt: "Add district button"
            },
            {
                number: 3,
                title: "Fill District Details",
                description: "Complete the district form with required information",
                image: "/images/help/district-form.png",
                alt: "District details form"
            },
            {
                number: 4,
                title: "Confirm District Addition",
                description: "Click confirm in dialog to finalize district creation",
                image: "/images/help/confirm-add-district.png",
                alt: "Confirm add district dialog"
            }
        ]
    },

    // Priority Management Articles
    {
        id: "admin-manage-priorities",
        title: "Managing Lists of Priorities",
        description: "Complete guide to adding, editing, and managing priority lists",
        content: "# Managing Lists of Priorities\n\nComplete guide to managing system priority lists.",
        category: "priority-management",
        roles: ["admin"],
        relatedArticles: ["admin-manage-requirements"],
        images: [
            "/images/help/add-priority.png",
            "/images/help/edit-priority.png",
            "/images/help/archive-priority.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true,
        steps: [
            {
                number: 1,
                title: "Access Priority Management",
                description: "Go to Manage List of Priorities from navigation",
                image: "/images/help/navigate-priorities.png",
                alt: "Navigate to priorities section"
            },
            {
                number: 2,
                title: "Add New Priority List",
                description: "Click Add New List of Priorities button",
                image: "/images/help/add-priority-button.png",
                alt: "Add priority list button"
            },
            {
                number: 3,
                title: "Fill Priority Details",
                description: "Complete the priority list form",
                image: "/images/help/priority-form.png",
                alt: "Priority list form"
            },
            {
                number: 4,
                title: "Confirm Priority Addition",
                description: "Click confirm to finalize priority list creation",
                image: "/images/help/confirm-add-priority.png",
                alt: "Confirm add priority dialog"
            }
        ]
    },

    // Requirements Management Articles
    {
        id: "admin-manage-requirements",
        title: "Managing Requirements",
        description: "Complete guide to adding, editing, and managing requirements",
        content: "# Managing Requirements\n\nComplete guide to managing system requirements.",
        category: "priority-management",
        roles: ["admin"],
        relatedArticles: ["admin-manage-priorities"],
        images: [
            "/images/help/add-requirement.png",
            "/images/help/edit-requirement.png",
            "/images/help/archive-requirement.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true,
        steps: [
            {
                number: 1,
                title: "Access Requirements Management",
                description: "Go to Manage Requirements from navigation",
                image: "/images/help/navigate-requirements.png",
                alt: "Navigate to requirements section"
            },
            {
                number: 2,
                title: "Add New Requirement",
                description: "Click Add New Requirements button",
                image: "/images/help/add-requirement-button.png",
                alt: "Add requirement button"
            },
            {
                number: 3,
                title: "Fill Requirement Details",
                description: "Complete the requirement form",
                image: "/images/help/requirement-form.png",
                alt: "Requirement form"
            },
            {
                number: 4,
                title: "Confirm Requirement Addition",
                description: "Click confirm to finalize requirement creation",
                image: "/images/help/confirm-add-requirement.png",
                alt: "Confirm add requirement dialog"
            }
        ]
    },

    // Additional reference articles
   
    {
        id: "backup-and-restore",
        title: "Backup and Restore",
        description: "Learn how to create backups and restore system data.",
        content: "# Backup and Restore\n\nThe Backup and Restore feature allows administrators to create backups of system data and restore them when needed. This ensures data integrity and provides a way to recover from unexpected issues.",
        category: "administration",
        roles: ["admin"],
        relatedArticles: [],
        images: [
            "/images/help/backup-page.png",
            "/images/help/restore-page.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true,
        steps: [
            {
                number: 1,
                title: "Access the Backup & Restore Page",
                description: "Navigate to the Backup & Restore page from the system menu.",
                image: "/images/help/backup-page.png",
                alt: "Backup & Restore page"
            },
            {
                number: 2,
                title: "Create a Backup",
                description: "Select the backup options (e.g., include media files) and click the Start Backup button. You can choose your desired location to save the backup file if prompted.",
                image: "/images/help/start-backup.png",
                alt: "Start Backup button"
            },
            {
                number: 3,
                title: "Restore from a Backup",
                description: "Choose a backup file and confirm the restore operation to replace existing data.",
                image: "/images/help/restore-page.png",
                alt: "Restore page"
            }
        ]
    },
    {
        id: "audit-logs",
        title: "Audit Logs",
        description: "Learn how to track and review system activities using the Audit Logs feature.",
        content: "# Audit Logs\n\nThe Audit Logs feature allows administrators to track and review actions performed in the system. This ensures accountability and provides a detailed history of system activities.",
        category: "administration",
        roles: ["admin"],
        relatedArticles: [],
        images: [
            "/images/help/audit-logs-page.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true,
        steps: [
            {
                number: 1,
                title: "Access the Audit Trail Page",
                description: "Navigate to the Audit Trail page from the system menu.",
                image: "/images/help/audit-logs-page.png",
                alt: "Audit Trail page"
            },
            {
                number: 2,
                title: "Filter and Search Logs",
                description: "Use the search bar and filters to narrow down the logs by action, module, or date range.",
                image: "/images/help/filter-audit-logs.png",
                alt: "Filter Audit Logs"
            },
            {
                number: 3,
                title: "View Log Details",
                description: "Click on a log entry to view detailed information, including user, action, and changes.",
                image: "/images/help/audit-log-details.png",
                alt: "Audit Log Details"
            }

        ]
    }
];