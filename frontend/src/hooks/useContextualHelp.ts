// hooks/useContextualHelp.ts
import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router";
import { helpArticles } from "@/lib/helpData";
import { HelpArticle } from "@/lib/helpTypes";
import { useAuth } from "@/context/AuthContext";

interface ContextualHelpData {
    articles: HelpArticle[];
    quickSteps: HelpArticle | null;
    relatedActions: string[];
    pageTitle: string;
    pageDescription: string;
}

// Map routes to contextual help configurations
const PAGE_HELP_MAP: Record<string, {
    title: string;
    description: string;
    categories: string[];
    actions: string[];
    preferredArticleId?: string;
}> = {
    '/users': {
        title: 'Manage Users',
        description: 'Add, edit, and manage user accounts',
        categories: ['user-management'],
        actions: ['Add New User', 'Edit User Permissions', 'Reset Password', 'Deactivate User'],
        preferredArticleId: 'admin-manage-users'
    },
    '/schools': {
        title: 'Manage Schools',
        description: 'Oversee school information and settings',
        categories: ['administration', 'getting-started'],
        actions: ['Add School', 'Edit School Info', 'View School Stats', 'Assign School Head']
    },
    '/school-districts': {
        title: 'Manage Districts',
        description: 'Create and manage school districts',
        categories: ['school-management'],
        actions: ['Add District', 'Edit District', 'Archive District', 'Assign Schools'],
        preferredArticleId: 'admin-manage-districts'
    },
    '/prepare-list-of-priorities': {
        title: 'MOOE Priority List',
        description: 'Create and manage your school\'s MOOE priority requests',
        categories: ['mooe-management'],
        actions: ['Create New Priority', 'Submit Request', 'Review Guidelines', 'Check Status'],
        preferredArticleId: 'school-head-priorities'
    },
    '/list-of-priorities': {
        title: 'Manage Lists of Priorities',
        description: 'Administer lists of priorities',
        categories: ['priority-management'],
        actions: ['Add List', 'Edit List', 'Archive List', 'Filter Lists'],
        preferredArticleId: 'admin-manage-priorities'
    },
    '/requirements': {
        title: 'Manage Requirements',
        description: 'Administer and update system requirements',
        categories: ['priority-management'],
        actions: ['Add Requirement', 'Edit Requirement', 'Archive Requirement', 'Filter Requirements'],
        preferredArticleId: 'admin-manage-requirements'
    },
    '/schools-priorities-submissions': {
        title: 'Priority Submissions Review',
        description: 'Review and approve school priority submissions',
        categories: ['mooe-management'],
        actions: ['Review Submission', 'Approve Request', 'Request Changes', 'View History']
    },
    '/liquidation': {
        title: 'Liquidation Process',
        description: 'Manage liquidation reports and documentation',
        categories: ['liquidation'],
        actions: ['Create Report', 'Upload Documents', 'Submit for Review', 'Check Status'],
        preferredArticleId: 'liquidator-review'
    },
    '/approved-requests': {
        title: 'Approved Requests',
        description: 'Process and manage approved fund requests',
        categories: ['mooe-management', 'liquidation'],
        actions: ['Process Request', 'Generate Documents', 'Update Status', 'Send Notification']
    },
    '/': {
        title: 'Dashboard',
        description: 'Overview of your system activities and status',
        categories: ['getting-started'],
        actions: ['View Recent Activity', 'Check Notifications', 'Access Quick Actions', 'View Reports']
    },
    '/profile': {
        title: 'User Profile',
        description: 'Manage your personal account settings',
        categories: ['getting-started'],
        actions: ['Update Profile', 'Change Password', 'Set Preferences', 'View Activity']
    },
    '/backup-restore': {
        title: 'Backup & Restore',
        description: 'System backup and data restore operations',
        categories: ['administration'],
        actions: ['Create Backup', 'Schedule Backup', 'Restore Data', 'View Backup History']
    },
    '/audit-logs': {
        title: 'Audit Logs',
        description: 'View system activity and audit trails',
        categories: ['administration', 'reporting'],
        actions: ['Filter Logs', 'Export Data', 'Search Activity', 'Generate Report']
    }
};

export const useContextualHelp = (): ContextualHelpData => {
    const location = useLocation();
    const { user } = useAuth();
    const [pageConfig, setPageConfig] = useState<typeof PAGE_HELP_MAP[string] | null>(null);

    // Update page configuration when location changes
    useEffect(() => {
        const currentPath = location.pathname;
        const config = PAGE_HELP_MAP[currentPath];
        setPageConfig(config);
    }, [location.pathname]);

    // Filter and prepare contextual help data
    const contextualData = useMemo((): ContextualHelpData => {
        if (!pageConfig || !user) {
            return {
                articles: [],
                quickSteps: null,
                relatedActions: [],
                pageTitle: 'Page',
                pageDescription: 'Current page information'
            };
        }

        // Filter articles by user role and relevant categories
        const relevantArticles = helpArticles.filter(article =>
            article.roles.includes(user.role as any) &&
            pageConfig.categories.some(category => article.category === category)
        );

        // Find the preferred quick steps article
        let quickSteps: HelpArticle | null = null;
        if (pageConfig.preferredArticleId) {
            quickSteps = relevantArticles.find(article =>
                article.id === pageConfig.preferredArticleId
            ) || null;
        } else {
            // Fallback to first article with steps
            quickSteps = relevantArticles.find(article =>
                article.steps && article.steps.length > 0
            ) || null;
        }

        return {
            articles: relevantArticles,
            quickSteps,
            relatedActions: pageConfig.actions,
            pageTitle: pageConfig.title,
            pageDescription: pageConfig.description
        };
    }, [pageConfig, user]);

    return contextualData;
};