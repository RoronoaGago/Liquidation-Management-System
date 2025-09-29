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
