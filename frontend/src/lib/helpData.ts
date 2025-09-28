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
    {
        id: "admin-manage-users",
        title: "Managing Users in the System",
        description: "Learn how to add, edit, and manage user accounts and permissions",
        content: "# Managing Users\n\n## Adding New Users\n1. Go to Manage users and click Add New User.\n2. Fill out the form and click Add to complete the process.\n3. A confirmation dialog will appear. Click confirm to add the new user.\n4. The system will then display a success message confirming the result.\n5. Save the user account\n\n## User Roles Explained\n- **Admin**: Full system access\n- **School Head**: School-level management\n- **District Admin**: District-level oversight\n- **Accountant**: Financial management",
        category: "user-management",
        roles: ["admin"],
        relatedArticles: ["admin-user-roles", "admin-permissions"],
        images: [
            "/help/images/admin-add-user.png",
            "/help/images/admin-user-permissions.png"
        ],
        lastUpdated: new Date("2024-01-15"),
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
                image: "/help/images/add-user-button.png",
                alt: "Add User button highlighted"
            },
            {
                number: 4,
                title: "View Success Message",
                description: "The system will then display a success message confirming the result.",
                image: "/help/images/add-user-button.png",
                alt: "Add User button highlighted"
            }
        ]
    },
    {
        id: "school-head-priorities",
        title: "Creating List of Priorities",
        description: "Step-by-step guide for school heads to create and submit MOOE priorities",
        content: "# Creating List of Priorities\n\n## Overview\nAs a School Head, you can create and manage your school's MOOE priority lists...",
        category: "mooe-management",
        roles: ["school_head"],
        relatedArticles: ["school-head-requests", "mooe-guidelines"],
        images: [
            "/help/images/priority-list-form.png",
            "/help/images/priority-submission.png"
        ],
        lastUpdated: new Date("2024-01-10"),
        featured: true
    },
    {
        id: "admin-user-roles",
        title: "Understanding User Roles and Permissions",
        description: "Complete guide to different user roles and their capabilities in the system",
        content: "# User Roles and Permissions\n\n## Role Overview\nEach role has specific permissions and access levels...",
        category: "user-management",
        roles: ["admin"],
        relatedArticles: ["admin-manage-users"],
        images: [],
        lastUpdated: new Date("2024-01-12"),
        featured: false
    },
    {
        id: "school-head-dashboard",
        title: "School Head Dashboard Overview",
        description: "Learn how to navigate and use your school head dashboard effectively",
        content: "# School Head Dashboard\n\nYour dashboard provides an overview of your school's MOOE status...",
        category: "getting-started",
        roles: ["school_head"],
        relatedArticles: ["school-head-priorities"],
        images: [
            "/help/images/school-head-dashboard.png"
        ],
        lastUpdated: new Date("2024-01-08"),
        featured: true,
        steps: [
            {
                number: 1,
                title: "Access Your Dashboard",
                description: "Log in and you'll be directed to your personalized dashboard",
                image: "/help/images/login-dashboard.png",
                alt: "School head dashboard overview"
            },
            {
                number: 2,
                title: "Review Key Metrics",
                description: "Check your available funds, pending requests, and recent activities",
                image: "/help/images/dashboard-metrics.png",
                alt: "Dashboard metrics section"
            }
        ]
    },
    {
        id: "liquidator-review",
        title: "Liquidation Report Review Process",
        description: "Step-by-step guide for liquidators to review and approve liquidation reports",
        content: "# Liquidation Review Process\n\nAs a liquidator, you are responsible for reviewing...",
        category: "liquidation",
        roles: ["liquidator"],
        relatedArticles: [],
        images: [
            "/help/images/liquidation-review.png",
            "/help/images/approval-workflow.png"
        ],
        lastUpdated: new Date("2024-01-05"),
        featured: true
    }
];