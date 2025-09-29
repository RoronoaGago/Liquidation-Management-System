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
