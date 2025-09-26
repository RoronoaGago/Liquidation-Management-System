// pages/HelpArticlePage.tsx
import { useParams, Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

import { ArrowLeftIcon, CalendarIcon, UserIcon } from "lucide-react";
import StepByStepGuide from "@/components/help/StepByStepGuide";
import RelatedArticles from "@/components/help/RelatedArticles";
import { helpArticles } from "@/lib/helpData";

const HelpArticlePage: React.FC = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const article = helpArticles.find((a) => a.id === articleId);

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Article Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The help article you're looking for doesn't exist.
          </p>
          <Link
            to="/help"
            className="inline-flex items-center px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            Back to Help Center
          </Link>
        </div>
      </div>
    );
  }

  // Check if user has access to this article
  if (!article.roles.includes(user?.role as any)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You don't have permission to view this article.
          </p>
          <Link
            to="/help"
            className="inline-flex items-center px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            Back to Help Center
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-brand-500 hover:text-brand-600 mb-6 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Help Center
        </button>

        {/* Article Header */}
        <header className="bg-white dark:bg-gray-800 rounded-xl p-8 mb-8 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs capitalize">
              {article.category.replace("-", " ")}
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                <span>Updated {formatDate(article.lastUpdated)}</span>
              </div>
              <div className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                <span className="capitalize">
                  {user?.role?.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {article.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {article.description}
          </p>
        </header>

        {/* Article Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          {/* Steps Guide */}
          {article.steps && article.steps.length > 0 && (
            <div className="p-8 border-b border-gray-200 dark:border-gray-700">
              <StepByStepGuide steps={article.steps} />
            </div>
          )}

          {/* Main Content */}
          <div className="p-8">
            <div className="prose prose-lg max-w-none dark:prose-invert">
              {/* Simple markdown-like content rendering */}
              {article.content.split("\n").map((paragraph, index) => {
                if (paragraph.startsWith("# ")) {
                  return (
                    <h1
                      key={index}
                      className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-white"
                    >
                      {paragraph.substring(2)}
                    </h1>
                  );
                } else if (paragraph.startsWith("## ")) {
                  return (
                    <h2
                      key={index}
                      className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white"
                    >
                      {paragraph.substring(3)}
                    </h2>
                  );
                } else if (paragraph.startsWith("### ")) {
                  return (
                    <h3
                      key={index}
                      className="text-lg font-medium mt-4 mb-2 text-gray-900 dark:text-white"
                    >
                      {paragraph.substring(4)}
                    </h3>
                  );
                } else if (
                  paragraph.startsWith("1. ") ||
                  paragraph.startsWith("- ")
                ) {
                  return (
                    <li
                      key={index}
                      className="ml-4 mb-1 text-gray-700 dark:text-gray-300"
                    >
                      {paragraph.substring(3)}
                    </li>
                  );
                } else if (paragraph.trim() === "") {
                  return <br key={index} />;
                } else {
                  return (
                    <p
                      key={index}
                      className="mb-4 text-gray-700 dark:text-gray-300"
                    >
                      {paragraph}
                    </p>
                  );
                }
              })}
            </div>

            {/* Images */}
            {article.images.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Reference Images
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {article.images.map((image, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <img
                        src={image}
                        alt={`Step ${index + 1} illustration`}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-3 bg-gray-50 dark:bg-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                          Figure {index + 1}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video */}
            {article.videoUrl && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Video Tutorial
                </h3>
                <div className="aspect-w-16 aspect-h-9 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <video
                    src={article.videoUrl}
                    controls
                    className="w-full h-full"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Articles */}
        {article.relatedArticles.length > 0 && (
          <div className="mt-8">
            <RelatedArticles
              articleIds={article.relatedArticles}
              currentArticleId={article.id}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpArticlePage;
