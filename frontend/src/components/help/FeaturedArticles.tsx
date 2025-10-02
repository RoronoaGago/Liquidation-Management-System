// components/help/FeaturedArticles.tsx
import { Link } from "react-router";
import { StarIcon, CalendarIcon } from "lucide-react";
import { HelpArticle } from "@/lib/helpTypes";

interface FeaturedArticlesProps {
  articles: HelpArticle[];
}

const FeaturedArticles: React.FC<FeaturedArticlesProps> = ({ articles }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {articles.map((article) => (
        <Link
          key={article.id}
          to={`/help/article/${article.id}`}
          className="group block"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-2 border-transparent hover:border-brand-500 hover:shadow-md transition-all duration-200 h-full">
            {/* Featured Badge */}
            <div className="flex items-center gap-2 mb-3">
              <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                Featured
              </span>
            </div>

            {/* Article Content */}
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-brand-500 transition-colors line-clamp-2">
              {article.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
              {article.description}
            </p>

            {/* Meta Information */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="capitalize px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                {article.category.replace("-", " ")}
              </span>
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                <span>
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                  }).format(article.lastUpdated)}
                </span>
              </div>
            </div>

            {/* Read More Indicator */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm text-brand-500 font-medium group-hover:underline">
                Read guide →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default FeaturedArticles;
