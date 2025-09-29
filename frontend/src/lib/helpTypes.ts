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