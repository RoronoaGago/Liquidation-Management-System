// components/help/RelatedArticles.tsx
import { helpArticles } from "@/lib/helpData";
import { Link } from "react-router";

interface RelatedArticlesProps {
  articleIds: string[];
  currentArticleId: string;
}

const RelatedArticles: React.FC<RelatedArticlesProps> = ({
  articleIds,
  currentArticleId,
}) => {
  const relatedArticles = helpArticles.filter(
    (article) =>
      articleIds.includes(article.id) && article.id !== currentArticleId
  );

  if (relatedArticles.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Related Articles
      </h3>
      <div className="space-y-3">
        {relatedArticles.map((article) => (
          <Link
            key={article.id}
            to={`/help/article/${article.id}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          >
            <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-brand-500 transition-colors">
                {article.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {article.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedArticles;
