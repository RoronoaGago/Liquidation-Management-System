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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {searchQuery
                ? `Search Results (${filteredArticles.length})`
                : selectedCategory
                ? `${
                    helpCategories.find((c) => c.id === selectedCategory)?.name
                  } Articles`
                : "All Articles"}
            </h2>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-brand-500 hover:text-brand-600 font-medium"
              >
                Clear filter
              </button>
            )}
          </div>

          {filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">
                🔍
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No articles found
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "No articles available for your current filters"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <HelpArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HelpCenter;
