# Help Center Implementation Guide
## Liquidation Management System

This comprehensive guide provides step-by-step instructions for implementing a help center feature in your web application. The help center includes contextual help, role-based content filtering, search functionality, and interactive guides.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Implementation Steps](#implementation-steps)
5. [Code Examples](#code-examples)
6. [Configuration](#configuration)
7. [Customization](#customization)
8. [Best Practices](#best-practices)

## Overview

The help center system provides:
- **Role-based content filtering**: Different help content for different user roles
- **Contextual help**: Page-specific help that appears based on current location
- **Search functionality**: Real-time search through help articles
- **Step-by-step guides**: Interactive tutorials with images
- **Related articles**: Cross-referencing between help topics
- **Responsive design**: Works on desktop and mobile devices

## Architecture

The help center follows a modular architecture with these key components:

```
Help Center System
├── Data Layer (helpData.ts, helpTypes.ts)
├── Context Layer (HelpContext.tsx)
├── Hooks Layer (useContextualHelp.ts)
├── Component Layer (help components)
├── Page Layer (HelpCenter.tsx, HelpArticlePage.tsx)
└── Integration Layer (routing, navigation)
```

## File Structure

```
src/
├── lib/
│   ├── helpData.ts          # Help articles and categories data
│   └── helpTypes.ts         # TypeScript interfaces
├── context/
│   └── HelpContext.tsx      # Global help state management
├── hooks/
│   └── useContextualHelp.ts # Contextual help logic
├── components/
│   └── help/
│       ├── HelpSearch.tsx
│       ├── FeaturedArticles.tsx
│       ├── HelpCategoryCard.tsx
│       ├── HelpArticleCard.tsx
│       ├── StepByStepGuide.tsx
│       ├── RelatedArticles.tsx
│       ├── ContextualHelpButton.tsx
│       ├── InlinePageHelp.tsx
│       └── DynamicContextualHelpComponent.tsx
├── pages/
│   ├── HelpCenter.tsx
│   └── HelpArticlePage.tsx
└── components/common/
    └── ImageLightbox.tsx
```

## Implementation Steps

### Step 1: Define Types and Interfaces

Create `src/lib/helpTypes.ts`:

```typescript
// types/help.ts
export type UserRole =
    | "admin"
    | "school_head"
    | "school_admin"
    | "district_admin"
    | "superintendent"
    | "liquidator"
    | "accountant";

export interface HelpArticle {
    id: string;
    title: string;
    description: string;
    content: string;
    category: string;
    roles: UserRole[];
    relatedArticles: string[];
    images: string[];
    videoUrl?: string;
    lastUpdated: Date;
    featured: boolean;
    steps?: HelpStep[];
}

export interface HelpStep {
    number: number;
    title: string;
    description: string;
    image: string;
    alt: string;
}

export interface HelpCategory {
    id: string;
    name: string;
    icon: string;
    description: string;
    roles: UserRole[];
}
```

### Step 2: Create Help Data

Create `src/lib/helpData.ts` with your help content:

```typescript
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
    // Add more categories...
];

export const helpArticles: HelpArticle[] = [
    {
        id: "admin-manage-users",
        title: "How to Manage Users",
        description: "Complete guide to adding, editing, and managing user accounts",
        content: `# User Management Guide

This guide will help you manage users in the system.

## Adding a New User

1. Navigate to the Users page
2. Click "Add New User"
3. Fill in the required information
4. Assign appropriate roles
5. Save the user

## Editing User Information

1. Find the user in the list
2. Click the edit button
3. Modify the information
4. Save changes

## User Roles

- **Admin**: Full system access
- **School Head**: School-level management
- **Accountant**: Financial operations
- **Liquidator**: Liquidation processes`,
        category: "user-management",
        roles: ["admin"],
        relatedArticles: ["admin-user-permissions", "admin-reset-passwords"],
        images: [
            "/images/help/user-management-1.png",
            "/images/help/user-management-2.png"
        ],
        lastUpdated: new Date("2024-01-15"),
        featured: true,
        steps: [
            {
                number: 1,
                title: "Navigate to Users Page",
                description: "Click on 'Users' in the main navigation menu",
                image: "/images/help/step1-users-nav.png",
                alt: "Navigation menu showing Users option"
            },
            {
                number: 2,
                title: "Click Add New User",
                description: "Click the 'Add New User' button in the top right",
                image: "/images/help/step2-add-user.png",
                alt: "Add New User button highlighted"
            },
            {
                number: 3,
                title: "Fill User Information",
                description: "Complete all required fields in the form",
                image: "/images/help/step3-user-form.png",
                alt: "User creation form with fields highlighted"
            }
        ]
    },
    // Add more articles...
];
```

### Step 3: Create Help Context

Create `src/context/HelpContext.tsx`:

```typescript
// context/HelpContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface HelpContextType {
  currentAction: string | null;
  setCurrentAction: (action: string | null) => void;
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
  userNeedsHelp: boolean;
  triggerHelp: (action: string) => void;
  dismissHelp: () => void;
  helpHistory: string[];
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

interface HelpProviderProps {
  children: ReactNode;
}

export const HelpProvider: React.FC<HelpProviderProps> = ({ children }) => {
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [userNeedsHelp, setUserNeedsHelp] = useState(false);
  const [helpHistory, setHelpHistory] = useState<string[]>([]);

  const triggerHelp = useCallback((action: string) => {
    setCurrentAction(action);
    setShowHelp(true);
    setUserNeedsHelp(true);
    setHelpHistory((prev) => [...prev, action]);
  }, []);

  const dismissHelp = useCallback(() => {
    setShowHelp(false);
    setUserNeedsHelp(false);
    setCurrentAction(null);
  }, []);

  const value: HelpContextType = {
    currentAction,
    setCurrentAction,
    showHelp,
    setShowHelp,
    userNeedsHelp,
    triggerHelp,
    dismissHelp,
    helpHistory,
  };

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
};

export const useHelpContext = () => {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelpContext must be used within a HelpProvider');
  }
  return context;
};
```

### Step 4: Create Contextual Help Hook

Create `src/hooks/useContextualHelp.ts`:

```typescript
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
    // Add more route mappings...
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
```

### Step 5: Create Core Components

#### Help Search Component

Create `src/components/help/HelpSearch.tsx`:

```typescript
// components/help/HelpSearch.tsx
import { useState, useEffect } from "react";
import { SearchIcon, XIcon } from "lucide-react";

interface HelpSearchProps {
  onSearch: (query: string) => void;
}

const HelpSearch: React.FC<HelpSearchProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, onSearch]);

  const clearSearch = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search for help articles, guides, or tutorials..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-12 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default HelpSearch;
```

#### Help Category Card Component

Create `src/components/help/HelpCategoryCard.tsx`:

```typescript
// components/help/HelpCategoryCard.tsx
import { HelpCategory } from "@/lib/helpTypes";
import {
  Users,
  School,
  FileText,
  BarChart3,
  Settings,
  DollarSign,
  ClipboardCheck,
  ListChecks,
} from "lucide-react";

interface HelpCategoryCardProps {
  category: HelpCategory;
  isSelected: boolean;
  onSelect: (categoryId: string) => void;
}

const iconMap: { [key: string]: React.ReactNode } = {
  users: <Users className="w-8 h-8" />,
  school: <School className="w-8 h-8" />,
  mooe: <DollarSign className="w-8 h-8" />,
  liquidation: <ClipboardCheck className="w-8 h-8" />,
  reporting: <BarChart3 className="w-8 h-8" />,
  administration: <Settings className="w-8 h-8" />,
  settings: <Settings className="w-8 h-8" />,
  priority: <ListChecks className="w-8 h-8" />,
};

const HelpCategoryCard: React.FC<HelpCategoryCardProps> = ({
  category,
  isSelected,
  onSelect,
}) => {
  return (
    <button
      onClick={() => onSelect(category.id)}
      className={`p-6 rounded-xl text-left transition-all duration-200 border-2 ${
        isSelected
          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      <div className="flex items-center gap-4 mb-3">
        <div
          className={`p-2 rounded-lg ${
            isSelected
              ? "bg-brand-100 dark:bg-brand-800 text-brand-600 dark:text-brand-400"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
          }`}
        >
          {iconMap[category.icon] || <FileText className="w-8 h-8" />}
        </div>
        <h3
          className={`font-semibold text-lg ${
            isSelected
              ? "text-brand-900 dark:text-brand-100"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {category.name}
        </h3>
      </div>
      <p
        className={`text-sm ${
          isSelected
            ? "text-brand-700 dark:text-brand-300"
            : "text-gray-600 dark:text-gray-400"
        }`}
      >
        {category.description}
      </p>
    </button>
  );
};

export default HelpCategoryCard;
```

### Step 6: Create Main Help Center Page

Create `src/pages/HelpCenter.tsx`:

```typescript
// pages/HelpCenter.tsx
import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";

import HelpSearch from "@/components/help/HelpSearch";
import { helpArticles, helpCategories } from "@/lib/helpData";
import FeaturedArticles from "@/components/help/FeaturedArticles";
import HelpCategoryCard from "@/components/help/HelpCategoryCard";
import HelpArticleCard from "@/components/help/HelpArticleCard";

const HelpCenter = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter articles based on user role and search query
  const filteredArticles = useMemo(() => {
    let filtered = helpArticles.filter((article) =>
      article.roles.includes(user?.role as any)
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.description.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (article) => article.category === selectedCategory
      );
    }

    return filtered;
  }, [user?.role, searchQuery, selectedCategory]);

  const filteredCategories = useMemo(() => {
    return helpCategories.filter((category) =>
      category.roles.includes(user?.role as any)
    );
  }, [user?.role]);

  const featuredArticles = useMemo(() => {
    return helpArticles
      .filter(
        (article) =>
          article.featured && article.roles.includes(user?.role as any)
      )
      .slice(0, 3);
  }, [user?.role]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Help Center
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Find guides, tutorials, and answers to frequently asked questions
            tailored for your role as {user?.role?.replace("_", " ")}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-12">
          <HelpSearch onSearch={setSearchQuery} />
        </div>

        {/* Featured Articles */}
        {!searchQuery && !selectedCategory && featuredArticles.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Featured Guides
            </h2>
            <FeaturedArticles articles={featuredArticles} />
          </section>
        )}

        {/* Categories */}
        {!searchQuery && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Browse by Category
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map((category) => (
                <HelpCategoryCard
                  key={category.id}
                  category={category}
                  isSelected={selectedCategory === category.id}
                  onSelect={setSelectedCategory}
                />
              ))}
            </div>
          </section>
        )}

        {/* Results */}
        <section>
          {searchQuery && (
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Search Results
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Found {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} for "{searchQuery}"
              </p>
            </div>
          )}

          {selectedCategory && (
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {helpCategories.find(c => c.id === selectedCategory)?.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} in this category
              </p>
            </div>
          )}

          {filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <HelpArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No articles found
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Try adjusting your search terms or browse by category.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HelpCenter;
```

### Step 7: Create Contextual Help Components

#### Contextual Help Button

Create `src/components/help/ContextualHelpButton.tsx`:

```typescript
import React, { useState } from "react";
import { HelpCircle, X, ChevronRight, ExternalLink } from "lucide-react";
import { useContextualHelp } from "@/hooks/useContextualHelp";
import { Link } from "react-router";

const ContextualHelpButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { articles, quickSteps, relatedActions } = useContextualHelp();

  // Don't render if no relevant help content
  if (articles.length === 0) return null;

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-brand-500 text-white rounded-full shadow-lg hover:bg-brand-600 transition-all duration-200 flex items-center justify-center z-50 group"
        title="Get help for this page"
      >
        <HelpCircle className="w-5 h-5" />
        {articles.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {articles.length}
          </span>
        )}
      </button>

      {/* Help Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 z-40 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Page Help
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions */}
          {relatedActions.length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Common Actions
              </h3>
              <div className="space-y-2">
                {relatedActions.map((action, index) => (
                  <button
                    key={index}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <span className="text-gray-900 dark:text-white">
                      {action}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Step Guide */}
          {quickSteps && (
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Quick Steps: {quickSteps.title}
              </h3>
              <div className="space-y-3">
                {quickSteps.steps?.slice(0, 3).map((step) => (
                  <div key={step.number} className="flex gap-3">
                    <div className="w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {step.number}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {step.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
                {quickSteps.steps && quickSteps.steps.length > 3 && (
                  <Link
                    to={`/help/article/${quickSteps.id}`}
                    className="flex items-center gap-2 text-brand-500 hover:text-brand-600 text-sm"
                  >
                    View all {quickSteps.steps.length} steps
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Related Articles */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Related Help Articles
            </h3>
            <div className="space-y-2">
              {articles.slice(0, 5).map((article) => (
                <Link
                  key={article.id}
                  to={`/help/article/${article.id}`}
                  className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                    {article.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                    {article.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      {article.category.replace("-", " ")}
                    </span>
                    {article.steps && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        {article.steps.length} steps
                      </span>
                    )}
                  </div>
                </Link>
              ))}

              {articles.length > 5 && (
                <Link
                  to="/help"
                  className="block text-center p-2 text-brand-500 hover:text-brand-600 text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  View all {articles.length} related articles →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default ContextualHelpButton;
```

### Step 8: Set Up Routing

Add routes to your main App component:

```typescript
// App.tsx
import { Routes, Route } from "react-router";
import HelpCenter from "./pages/HelpCenter";
import HelpArticlePage from "./pages/HelpArticlePage";
import ContextualHelpButton from "./components/help/ContextualHelpButton";
import { HelpProvider } from "./context/HelpContext";

function App() {
  return (
    <HelpProvider>
      <Routes>
        {/* Your existing routes */}
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/help/article/:articleId" element={<HelpArticlePage />} />
        {/* Other routes... */}
      </Routes>
      
      {/* Add contextual help button to all pages */}
      <ContextualHelpButton />
    </HelpProvider>
  );
}
```

### Step 9: Add Navigation Links

Add help center links to your navigation:

```typescript
// In your sidebar or navigation component
const navigationItems = [
  // ... other items
  {
    name: "Help Center",
    href: "/help",
    icon: HelpCircle,
  },
];
```

## Configuration

### Customizing Help Content

1. **Add new categories**: Update `helpCategories` in `helpData.ts`
2. **Add new articles**: Add entries to `helpArticles` array
3. **Configure contextual help**: Update `PAGE_HELP_MAP` in `useContextualHelp.ts`
4. **Customize icons**: Update `iconMap` in `HelpCategoryCard.tsx`

### Role-Based Access

The system automatically filters content based on user roles. To add a new role:

1. Add the role to `UserRole` type in `helpTypes.ts`
2. Update role arrays in help articles and categories
3. Update your authentication system to include the new role

## Customization

### Styling

The help center uses Tailwind CSS classes. Key customization points:

- **Brand colors**: Replace `brand-500`, `brand-600` with your brand colors
- **Dark mode**: All components support dark mode with `dark:` prefixes
- **Layout**: Adjust grid layouts and spacing as needed

### Adding Features

1. **Video tutorials**: Add `videoUrl` to help articles
2. **Interactive elements**: Extend step components with interactive features
3. **Analytics**: Add tracking to help article views
4. **Feedback system**: Add rating or feedback components

## Best Practices

### Content Management

1. **Keep articles focused**: Each article should cover one specific topic
2. **Use clear titles**: Make titles descriptive and searchable
3. **Include images**: Visual guides are more effective than text-only
4. **Update regularly**: Keep content current with system changes

### User Experience

1. **Role-based filtering**: Only show relevant content to each user type
2. **Search optimization**: Use keywords that users would actually search for
3. **Progressive disclosure**: Show basic info first, details on demand
4. **Mobile responsive**: Ensure help center works on all devices

### Performance

1. **Lazy loading**: Load help content only when needed
2. **Image optimization**: Compress images for faster loading
3. **Caching**: Cache help data to reduce API calls
4. **Bundle splitting**: Consider code splitting for help components

## Troubleshooting

### Common Issues

1. **Help not showing**: Check if user role is included in article roles
2. **Search not working**: Verify search query handling in HelpSearch component
3. **Images not loading**: Check image paths and ensure files exist
4. **Routing issues**: Verify route configuration in App.tsx

### Debug Tips

1. **Check console**: Look for JavaScript errors
2. **Verify data**: Log help data to ensure it's loading correctly
3. **Test roles**: Verify user role is being passed correctly
4. **Check paths**: Ensure all import paths are correct

## Conclusion

This help center implementation provides a comprehensive, role-based help system that can be easily customized for any web application. The modular architecture makes it easy to extend and maintain, while the contextual help features provide users with relevant assistance exactly when they need it.

For questions or support with this implementation, refer to the code examples provided or consult the troubleshooting section above.
