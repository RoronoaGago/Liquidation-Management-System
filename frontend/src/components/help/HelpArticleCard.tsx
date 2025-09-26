// components/help/HelpArticleCard.tsx
import { Link } from "react-router";
import { CalendarIcon, ClockIcon, StarIcon } from "lucide-react";
import { HelpArticle } from "@/lib/helpTypes";

interface HelpArticleCardProps {
  article: HelpArticle;
}

const HelpArticleCard: React.FC<HelpArticleCardProps> = ({ article }) => {
  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  return (
    <Link to={`/help/article/${article.id}`} className="group block h-full">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-brand-300 dark:hover:border-brand-600 transition-all duration-200 h-full flex flex-col">
        {/* Card Content */}
        <div className="p-6 flex-1">
          {/* Category and Featured Badge */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded capitalize">
              {article.category.replace("-", " ")}
            </span>
            {article.featured && (
              <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
            )}
          </div>

          {/* Title and Description */}
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-brand-500 transition-colors line-clamp-2">
            {article.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
            {article.description}
          </p>

          {/* Steps Indicator */}
          {article.steps && article.steps.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{article.steps.length} steps</span>
            </div>
          )}
        </div>

        {/* Footer with Meta Information */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-600 rounded-b-lg">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                <span>{getReadingTime(article.content)} min read</span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                <span>
                  {new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }).format(article.lastUpdated)}
                </span>
              </div>
            </div>

            {/* Read More Arrow */}
            <span className="text-brand-500 font-medium group-hover:translate-x-1 transition-transform">
              →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default HelpArticleCard;
