import React, { useState } from "react";
import {
  HelpCircle,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useContextualHelp } from "@/hooks/useContextualHelp";
import { Link } from "react-router";

interface InlinePageHelpProps {
  className?: string;
  variant?: "compact" | "expanded" | "minimal";
  position?: "top" | "bottom";
  autoExpand?: boolean;
}

const InlinePageHelp: React.FC<InlinePageHelpProps> = ({
  className = "",
  variant = "compact",
  position = "top",
  autoExpand = false,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const { articles, quickSteps, relatedActions, pageTitle, pageDescription } =
    useContextualHelp();

  // Don't render if no relevant help content
  if (articles.length === 0 || !isVisible) return null;

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  const renderCompactHelp = () => (
    <div className="flex items-center gap-3">
      <HelpCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <div className="flex-1">
        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
          {pageTitle} Help Available
        </span>
        <p className="text-xs text-blue-700 dark:text-blue-200">
          {articles.length} article{articles.length > 1 ? "s" : ""} •{" "}
          {quickSteps?.steps?.length || 0} steps
        </p>
      </div>
      <div className="flex gap-2">
        {quickSteps && (
          <Link
            to={`/help/article/${quickSteps.id}`}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
          >
            Quick Guide
          </Link>
        )}
        <button
          type="button"
          onClick={toggleExpanded}
          className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );

  const renderExpandedContent = () => (
    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
      {/* Quick Actions */}
      {relatedActions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Common Actions for {pageTitle}:
          </h4>
          <div className="flex flex-wrap gap-2">
            {relatedActions.slice(0, 4).map((action, index) => (
              <button
                key={index}
                className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step Preview */}
      {quickSteps && quickSteps.steps && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Quick Steps:
          </h4>
          <div className="space-y-2">
            {quickSteps.steps.slice(0, 3).map((step) => (
              <div key={step.number} className="flex gap-2 text-xs">
                <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {step.number}
                </span>
                <span className="text-blue-800 dark:text-blue-200">
                  {step.title}
                </span>
              </div>
            ))}
            {quickSteps.steps.length > 3 && (
              <div className="text-xs text-blue-600 dark:text-blue-300 ml-6">
                +{quickSteps.steps.length - 3} more steps
              </div>
            )}
          </div>
        </div>
      )}

      {/* Related Articles */}
      <div>
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Helpful Articles:
        </h4>
        <div className="space-y-1">
          {articles.slice(0, 3).map((article) => (
            <Link
              key={article.id}
              to={`/help/article/${article.id}`}
              className="block text-xs text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 hover:underline"
            >
              • {article.title}
            </Link>
          ))}
          {articles.length > 3 && (
            <Link
              to="/help"
              className="block text-xs text-blue-500 dark:text-blue-400 hover:underline ml-2"
            >
              View all {articles.length} articles →
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  const renderMinimalHelp = () => (
    <div className="flex items-center justify-between">
      <Link
        to={quickSteps ? `/help/article/${quickSteps.id}` : "/help"}
        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm"
      >
        <HelpCircle className="w-4 h-4" />
        <span>Need help with {pageTitle.toLowerCase()}?</span>
      </Link>
    </div>
  );

  const baseClasses = `
    bg-blue-50 dark:bg-blue-900/20 
    border border-blue-200 dark:border-blue-800 
    rounded-lg p-4 
    ${position === "bottom" ? "mt-6" : "mb-6"}
    ${className}
  `;

  return (
    <div className={baseClasses}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {variant === "minimal" && renderMinimalHelp()}
          {variant === "compact" && renderCompactHelp()}
          {variant === "expanded" && (
            <>
              {renderCompactHelp()}
              {renderExpandedContent()}
            </>
          )}

          {variant === "compact" && isExpanded && renderExpandedContent()}
        </div>

        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="text-blue-400 hover:text-blue-600 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InlinePageHelp;
