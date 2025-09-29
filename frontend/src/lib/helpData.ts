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
    // User Management Articles
    {
        id: "admin-manage-users",
        title: "Managing Users in the System",
        description: "Learn how to add, edit, and manage user accounts and permissions",
        content: "# Managing Users\n\n## Adding New Users\n1. Go to Manage users and click Add New User.\n2. Fill out the form and click Add to complete the process.\n3. A confirmation dialog will appear. Click confirm to add the new user.\n\n## Editing Users\n1. Use the search bar or browse the list to find the user, then click the Edit button next to their name.\n2. Update the necessary fields in the form. Click Save Changes.\n3. Click Confirm Changes in the dialog to finalize your edits.\n\n## Viewing Users\n1. Click the User you want to view.\n\n## Archiving Users\n1. Click the Archive button next to the user's name.\n2. Click Archive again in the confirmation dialog to proceed.\n\n## Restoring Archived Users\n1. Click the Archive button above to view the archived users.\n2. Click the restore button to restore the user.\n3. Click another restore button to confirm restoration.\n\n## Filtering Users\n1. The user list can be filtered by role using the filter dropdown at the top of the table.",
        category: "user-management",
        roles: ["admin"],
        relatedArticles: ["admin-user-roles", "admin-permissions"],
        images: [
            "/help/images/admin-add-user.png",
            "/help/images/admin-edit-user.png",
            "/help/images/admin-archive-user.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true,
        steps: [
            {
                number: 1,
                title: "Access Manage Users Page",
                description: "Go to Manage users and click Add New User",
                image: "/help/images/navigate-users.png",
                alt: "Sidebar navigation showing Users option"
            },
            {
                number: 2,
                title: "Fill User Details",
                description: "Fill out the form and click Add to complete the process.",
                image: "/help/images/add-user-button.png",
                alt: "Add User button highlighted"
            },
            {
                number: 3,
                title: "Confirm User Addition",
                description: "A confirmation dialog will appear. Click confirm to add the new user.",
                image: "/help/images/confirm-add-user.png",
                alt: "Confirmation dialog for adding user"
            }
        ]
    },

    // School Management Articles
    {
        id: "admin-manage-schools",
        title: "Managing Schools in the System",
        description: "Complete guide to adding, editing, and managing schools",
        content: "# Managing Schools\n\n## Adding New Schools\n1. Go to Manage schools and click Add New School.\n2. Fill out the form and click Add School to complete the process.\n3. A confirmation dialog will appear. Click confirm to add the new school.\n\n## Editing Schools\n1. Use the search bar or browse the list to find the school, then click the Edit button next to the School name.\n2. Update the necessary fields in the form. Click Save Changes.\n3. Click Confirm Changes in the dialog to finalize your edits.\n\n## Viewing Schools\n1. Click the School you want to view.\n\n## Archiving Schools\n1. Click the Archive button next to the school's name.\n2. Click Archive again in the confirmation dialog to proceed.\n\n## Restoring Archived Schools\n1. Click the Archive button above to view the archived schools.\n2. Click the restore button to restore the school.\n3. Click another restore button to confirm restoration.\n\n## Filtering Schools\n1. The school list can be filtered by legislative district, municipality and school district using the filter dropdown at the top of the table.",
        category: "school-management",
        roles: ["admin"],
        relatedArticles: ["admin-manage-districts"],
        images: [
            "/help/images/add-school.png",
            "/help/images/edit-school.png",
            "/help/images/filter-schools.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true
    },

    // District Management Articles
    {
        id: "admin-manage-districts",
        title: "Managing Districts in the System",
        description: "Complete guide to adding, editing, and managing districts",
        content: "# Managing Districts\n\n## Adding New Districts\n1. Go to Manage Districts and click Add New District.\n2. Fill out the form and click Add to complete the process.\n3. A confirmation dialog will appear. Click confirm to add the new district.\n\n## Editing Districts\n1. Use the search bar or browse the list to find the district, then click the Edit button next to their name.\n2. Update the necessary fields in the form. Click Save Changes.\n3. Click Confirm Changes in the dialog to finalize your edits.\n\n## Viewing Districts\n1. Click the District you want to view.\n\n## Archiving Districts\n1. Click the Archive button next to the district's name.\n2. Click Archive again in the confirmation dialog to proceed.\n\n## Restoring Archived Districts\n1. Click the Archive button above to view the archived districts.\n2. Click the restore button to restore the district.\n3. Click another restore button to confirm restoration.\n\n## Filtering Districts\n1. The district list can be filtered by legislative district and municipality using the filter dropdown at the top of the table.",
        category: "school-management",
        roles: ["admin"],
        relatedArticles: ["admin-manage-schools"],
        images: [
            "/help/images/add-district.png",
            "/help/images/edit-district.png",
            "/help/images/filter-districts.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true
    },

    // Priority Management Articles
    {
        id: "admin-manage-priorities",
        title: "Managing Lists of Priorities",
        description: "Complete guide to adding, editing, and managing priority lists",
        content: "# Managing Lists of Priorities\n\n## Adding New List of Priorities\n1. Go to Manage List of Priorities and click Add New List of Priorities.\n2. Fill out the form and click Add New List of Priority to complete the process.\n3. A confirmation dialog will appear. Click confirm to add the new List of Priorities.\n\n## Editing List of Priorities\n1. Use the search bar or browse and find the list of priorities, then click the Edit button next to the priority's title.\n2. Update the necessary fields in the form. Click Save Changes.\n3. A confirmation dialog will appear. Click confirm to save the changes.\n\n## Viewing List of Priorities\n1. Click the Priority you want to view.\n\n## Archiving List of Priority\n1. Click the Archive button next to the priority.\n2. Click Archive again in the confirmation dialog to proceed.\n3. Click the Archive button above to view the archived list of priority.\n\n## Restoring List of Priority\n1. Click the restore button to restore the list of priority.\n2. Click another restore button to confirm restoration.",
        category: "priority-management",
        roles: ["admin"],
        relatedArticles: ["admin-manage-requirements"],
        images: [
            "/help/images/add-priority.png",
            "/help/images/edit-priority.png",
            "/help/images/archive-priority.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true
    },

    // Requirements Management Articles
    {
        id: "admin-manage-requirements",
        title: "Managing Requirements",
        description: "Complete guide to adding, editing, and managing requirements",
        content: "# Managing Requirements\n\n## Adding New Requirements\n1. Go to Manage Requirements and click Add New Requirements.\n2. Fill out the form and click Add New Requirement to complete the process.\n3. A confirmation dialog will appear. Click confirm to add the new requirement.\n\n## Editing Requirements\n1. Use the search bar or browse and find the requirement, then click the Edit button next to the requirement's title.\n2. Update the necessary fields in the form. Click Save Changes.\n3. A confirmation dialog will appear. Click confirm to save the changes.\n\n## Viewing Requirements\n1. Click the Requirement you want to view.\n\n## Archiving Requirements\n1. Click the Archive button next to the requirement.\n2. Click Archive again in the confirmation dialog to proceed.\n3. Click the Archive button above to view the archived requirement.\n\n## Restoring Requirements\n1. Click the restore button to restore the requirement.\n2. Click another restore button to confirm restoration.",
        category: "priority-management",
        roles: ["admin"],
        relatedArticles: ["admin-manage-priorities"],
        images: [
            "/help/images/add-requirement.png",
            "/help/images/edit-requirement.png",
            "/help/images/archive-requirement.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true
    },

    // Existing articles kept for reference
    {
        id: "admin-user-roles",
        title: "Understanding User Roles and Permissions",
        description: "Complete guide to different user roles and their capabilities in the system",
        content: "# User Roles and Permissions\n\n## Role Overview\nEach role has specific permissions and access levels...",
        category: "user-management",
        roles: ["admin"],
        relatedArticles: ["admin-manage-users"],
        images: [],
        lastUpdated: new Date("2025-09-29"),
        featured: false
    },

    {
        id: "admin-dashboard",
        title: "Administrator Dashboard Overview",
        description: "Learn how to navigate and use your administrator dashboard effectively",
        content: "# Administrator Dashboard\n\nYour dashboard provides an overview of system statistics, recent activities, and quick access to management functions...",
        category: "getting-started",
        roles: ["admin"],
        relatedArticles: ["admin-manage-users", "admin-manage-schools"],
        images: [
            "/help/images/admin-dashboard.png"
        ],
        lastUpdated: new Date("2025-09-29"),
        featured: true
    }
];