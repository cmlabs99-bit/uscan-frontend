import { useState, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import { getMinRepositories, getMaxRepositories, getMinFollowers, getMaxFollowers, getMinSince, getMaxSince } from "../utils/storageManager";

const FilterBar = ({ onSearch }) => {
  const [filters, setFilters] = useState({
    username: "",
    bio: "",
    location: "",
    language: "",
  });

  const languages = ["JavaScript", "Python", "HTML", "CSS", "TypeScript", "Java", "C#", "C++"];

  // Load filters from localStorage on component mount
  useEffect(() => {
    const savedFilters = localStorage.getItem("uscan-search-filters");
    if (savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters);
        setFilters(parsedFilters);
      } catch (error) {
        console.error("Failed to load search filters from localStorage:", error);
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("uscan-search-filters", JSON.stringify(filters));
  }, [filters]);

  const handleSearch = (e) => {
    e.preventDefault();
    let f = filters;
    f.minRepositories = getMinRepositories();
    f.maxRepositories = getMaxRepositories();
    f.minFollowers = getMinFollowers();
    f.maxFollowers = getMaxFollowers();
    f.minSince = getMinSince();
    f.maxSince = getMaxSince();

    onSearch(f, false);
  };

  const handleSearchAppend = (e) => {
    e.preventDefault();
    let f = filters;
    f.minRepositories = getMinRepositories();
    f.maxRepositories = getMaxRepositories();
    f.minFollowers = getMinFollowers();
    f.maxFollowers = getMaxFollowers();
    f.minSince = getMinSince();
    f.maxSince = getMaxSince();

    onSearch(f, true);
  };

  const clearUsername = () => {
    setFilters((prev) => ({ ...prev, username: "" }));
  };

  const clearBio = () => {
    setFilters((prev) => ({ ...prev, bio: "" }));
  };

  const clearLanguage = () => {
    setFilters((prev) => ({ ...prev, language: "" }));
  };

  const clearLocation = () => {
    setFilters((prev) => ({ ...prev, location: "" }));
  };

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 w-full">
      <div className="flex items-center space-x-4 w-full">
        <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />

        {/* Username Input */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Username:</label>
          <div className="relative">
            <input
              value={filters.username}
              onChange={(e) => setFilters((prev) => ({ ...prev, username: e.target.value }))}
              onInput={(e) => {
                e.target.style.height = "auto"; // reset
                e.target.style.height = Math.min(e.target.scrollHeight, 192) + "px"; // expand dynamically up to 192px
              }}
              placeholder="e.g., James"
              className="px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm text-black bg-white w-48"
            />

            {filters.username && (
              <button type="button" onClick={clearUsername} className="absolute rounded-full right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Bio Input */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Bio:</label>
          <div className="relative">
            <input
              value={filters.bio}
              onChange={(e) => setFilters((prev) => ({ ...prev, bio: e.target.value }))}
              onInput={(e) => {
                e.target.style.height = "auto"; // reset
                e.target.style.height = Math.min(e.target.scrollHeight, 192) + "px"; // expand dynamically up to 192px
              }}
              placeholder="e.g., full stack"
              className="px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm text-black bg-white w-48"
            />

            {filters.bio && (
              <button type="button" onClick={clearBio} className="absolute rounded-full right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Language Dropdown */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Language:</label>
          <div className="relative">
            <select
              value={filters.language}
              onChange={(e) => setFilters((prev) => ({ ...prev, language: e.target.value }))}
              className="px-3 py-2 pr-8 border text-black border-gray-300 rounded-lg text-sm focus:ring-0 focus:ring-[#498ea7] focus:border-[#498ea7] appearance-none bg-white w-40"
            >
              <option value="">All Languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang} className="text-gray-500">
                  {lang}
                </option>
              ))}
            </select>
            {filters.language && (
              <button type="button" onClick={clearLanguage} className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Location Input */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Location:</label>
          <div className="relative">
            <textarea
              value={filters.location}
              onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
              onInput={(e) => {
                e.target.style.height = "auto"; // reset
                e.target.style.height = Math.min(e.target.scrollHeight, 192) + "px"; // expand dynamically up to 192px
              }}
              placeholder="e.g., San Francisco"
              className="px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm text-black bg-white w-48 resize-none leading-[1.5]"
              style={{
                minHeight: "40px", // ~same as input height
                maxHeight: "192px", // limit growth
                overflowY: "hidden", // hide scrollbar until needed
              }}
            />

            {filters.location && (
              <button type="button" onClick={clearLocation} className="absolute rounded-full right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className="bg-[#498ea7] text-white border-0 px-6 py-2 rounded-lg hover:bg-[#49a7a7] transition-colors flex items-center space-x-2 font-medium"
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
        </button>

        {/* Search Button */}
        <button
          onClick={handleSearchAppend}
          className="bg-[#499ca7] text-white border-0 px-6 py-2 rounded-lg hover:bg-[#49a7a7] transition-colors flex items-center space-x-2 font-medium"
        >
          <span>Append</span>
        </button>

        {/* Clear All Filters */}
        {/* {(filters.location || filters.language) && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium whitespace-nowrap"
          >
            Clear All
          </button>
        )} */}
      </div>
    </div>
  );
};

export default FilterBar;
