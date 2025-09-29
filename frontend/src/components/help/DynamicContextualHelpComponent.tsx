import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  X,
  ChevronRight,
  ExternalLink,
  Lightbulb,
} from "lucide-react";
import { useContextualHelp } from "@/hooks/useContextualHelp";
import { Link } from "react-router";

interface DynamicContextualHelpProps {
  // Optional props to override automatic detection
  currentAction?: string;
  showQuickTips?: boolean;
  variant?: "floating" | "inline" | "sidebar";
  className?: string;
}

const DynamicContextualHelp: React.FC<DynamicContextualHelpProps> = ({
  currentAction,
  showQuickTips = true,
  variant = "floating",
  className = "",
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { articles, quickSteps, relatedActions, pageTitle } =
    useContextualHelp();

  // Auto-hide after user interaction (optional)
  useEffect(() => {
    if (currentAction) {
      setIsVisible(true);
      // Reset step when action changes
      setCurrentStep(0);
    }
  }, [currentAction]);

  // Don't render if no relevant help content
  if (articles.length === 0) return null;

  const getActionSpecificHelp = () => {
    if (!currentAction) return null;

    // Find articles related to the current action
    const actionArticle = articles.find(
      (article) =>
        article.title.toLowerCase().includes(currentAction.toLowerCase()) ||
        article.description.toLowerCase().includes(currentAction.toLowerCase())
    );

    return actionArticle;
  };

  const getQuickTips = () => {
    const tips = [
      `You're currently on the ${pageTitle} page`,
      `${articles.length} help articles are available for this page`,
      quickSteps
        ? `Step-by-step guide available with ${
            quickSteps.steps?.length || 0
          } steps`
        : null,
      relatedActions.length > 0
        ? `Common actions: ${relatedActions.slice(0, 2).join(", ")}`
        : null,
    ].filter(Boolean);

    return tips;
  };

  if (variant === "inline") {
    return (
      <div
        className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 ${className}`}
      >
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                {currentAction ? `Help: ${currentAction}` : `${pageTitle} Help`}
              </h4>
              <button
                onClick={() => setIsCollapsed((v) => !v)}
                className="text-blue-600 dark:text-blue-300 text-xs"
              >
                {isCollapsed ? "Expand" : "Collapse"}
              </button>
            </div>

            {!isCollapsed && (currentAction && getActionSpecificHelp() ? (
              <div className="mb-3">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  {getActionSpecificHelp()?.description}
                </p>
                <Link
                  to={`/help/article/${getActionSpecificHelp()?.id}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-300 hover:underline"
                >
                  View detailed guide
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              !isCollapsed && (
                <div className="space-y-2">
                  {showQuickTips &&
                    getQuickTips().map((tip, index) => (
                      <div
                        key={index}
                        className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2"
                      >
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        {tip}
                      </div>
                    ))}
                </div>
              )
            ))}

            {!isCollapsed && (
              <div className="flex gap-2 mt-3">
                {quickSteps && (
                  <Link
                    to={`/help/article/${quickSteps.id}`}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                  >
                    Quick Steps
                  </Link>
                )}
                <Link
                  to="/help"
                  className="text-xs bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 px-3 py-1 rounded border border-blue-200 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-800 transition-colors"
                >
                  All Help
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsVisible(false)}
            className="text-blue-400 hover:text-blue-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Floating variant (existing ContextualHelpButton logic)
  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {isVisible && (
        <div className="mb-3">
          {isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center"
              title="Expand help"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {currentAction ? `Help: ${currentAction}` : `${pageTitle} Help`}
                    </h4>
                    <button
                      onClick={() => setIsCollapsed(true)}
                      className="text-xs text-blue-600 dark:text-blue-300"
                    >
                      Collapse
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {currentAction
                      ? "Need assistance with this action?"
                      : `${articles.length} relevant articles found`}
                  </p>
                  <div className="flex gap-2">
                    {quickSteps && (
                      <Link
                        to={`/help/article/${quickSteps.id}`}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Quick Guide
                      </Link>
                    )}
                    <Link
                      to="/help"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All
                    </Link>
                  </div>
                </div>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DynamicContextualHelp;
