import { useState, useEffect } from "react";
import { X, Plus, Settings, Check } from "lucide-react";
import { syncManager } from "../utils/syncManager";
import {
  getConfirmUSTime,
  getMaxFollowers,
  getMaxRepositories,
  getMaxSince,
  getMinFollowers,
  getMinRepositories,
  getMinSince,
  getNameBanList,
  getTokensFromStorage,
} from "../utils/storageManager";

const SettingsDialog = ({ isOpen, onClose, showOwnedUsers, setShowOwnedUsers, showDefaultAvatars, setShowDefaultAvatars }) => {
  const [localShowOwnedUsers, setLocalShowOwnedUsers] = useState(false);
  const [localShowDefaultAvatars, setLocalShowDefaultAvatars] = useState(false);
  const [confirmUSTime, setConfirmUSTime] = useState(false);

  const [githubApiKeys, setGithubApiKeys] = useState([]);
  const [newApiKey, setNewApiKey] = useState("");
  const [minFollowers, setMinFollowers] = useState("");
  const [minRepositories, setMinRepositories] = useState("");
  const [minJoinedYear, setMinJoinedYear] = useState("");

  const [maxFollowers, setMaxFollowers] = useState("");
  const [maxRepositories, setMaxRepositories] = useState("");
  const [maxJoinedYear, setMaxJoinedYear] = useState("");

  const [archiveNames, setArchiveNames] = useState([]);
  const [newArchiveName, setNewArchiveName] = useState("");

  // Load settings from localStorage when dialog opens
  useEffect(() => {
    if (isOpen) {
      const savedApiKeys = getTokensFromStorage(); // JSON.parse(localStorage.getItem("githubApiKeys") || "[]");

      const savedConfirmUSTIme = getConfirmUSTime();

      const savedMinFollowers = getMinFollowers();
      const savedMinRepositories = getMinRepositories();
      const savedMinJoinedYear = getMinSince();

      const savedMaxFollowers = getMaxFollowers();
      const savedMaxRepositories = getMaxRepositories();
      const savedMaxJoinedYear = getMaxSince();
      const savedArchiveNames = getNameBanList();

      setGithubApiKeys(savedApiKeys);

      setMinFollowers(savedMinFollowers);
      setMinRepositories(savedMinRepositories);
      setMinJoinedYear(savedMinJoinedYear);

      setMaxFollowers(savedMaxFollowers);
      setMaxRepositories(savedMaxRepositories);
      setMaxJoinedYear(savedMaxJoinedYear);
      setArchiveNames(savedArchiveNames);

      setLocalShowOwnedUsers(showOwnedUsers);
      setLocalShowDefaultAvatars(showDefaultAvatars);
      setConfirmUSTime(savedConfirmUSTIme);
    }
  }, [isOpen]);

  // GitHub API Keys functions
  const addApiKey = () => {
    if (newApiKey.trim() && !githubApiKeys.includes(newApiKey.trim())) {
      setGithubApiKeys([...githubApiKeys, newApiKey.trim()]);
      setNewApiKey("");
    }
  };

  const removeApiKey = (keyToRemove) => {
    setGithubApiKeys(githubApiKeys.filter((key) => key !== keyToRemove));
  };

  const handleApiKeyKeyPress = (e) => {
    if (e.key === "Enter") {
      addApiKey();
    }
  };

  // Archive Names functions
  const addArchiveName = () => {
    if (newArchiveName.trim()) {
      const newNames = newArchiveName
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name && !archiveNames.includes(name));

      if (newNames.length > 0) {
        setArchiveNames([...archiveNames, ...newNames]);
        setNewArchiveName("");
      }
    }
  };

  const removeArchiveName = (nameToRemove) => {
    setArchiveNames(archiveNames.filter((name) => name !== nameToRemove));
  };

  const handleArchiveNameKeyPress = (e) => {
    if (e.key === "Enter") {
      addArchiveName();
    }
  };

  // Save settings to localStorage
  const handleUpdate = () => {
    localStorage.setItem("githubApiKeys", JSON.stringify(githubApiKeys));
    localStorage.setItem("showOwnedUsers", JSON.stringify(localShowOwnedUsers));
    localStorage.setItem("showDefaultAvatars", JSON.stringify(localShowDefaultAvatars));
    localStorage.setItem("confirmUSTime", confirmUSTime);
    localStorage.setItem("minFollowers", minFollowers);
    localStorage.setItem("maxFollowers", maxFollowers);
    localStorage.setItem("minRepositories", minRepositories);
    localStorage.setItem("maxRepositories", maxRepositories);
    localStorage.setItem("minJoinedYear", minJoinedYear);
    localStorage.setItem("maxJoinedYear", maxJoinedYear);
    localStorage.setItem("archiveNames", JSON.stringify(archiveNames));
    // localStorage.setItem("maxJoinedYear", maxJoinedYear);
    setShowOwnedUsers(localShowOwnedUsers);
    setShowDefaultAvatars(localShowDefaultAvatars);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full mx-4 max-h-[98vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          </div>
          <button onClick={handleCancel} className="bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors p-3">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-2 gap-4 px-10 divide-x-2">
          <div className="p-8 border-r-gray-400">
            {/* User Archive Rules Section */}
            <div>
              <h1 className="text-center p-6">Search</h1>
              <h3 className="text-lg font-medium text-gray-900 mb-3">User Archive Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Followers</label>
                  <input
                    type="number"
                    value={minFollowers}
                    onChange={(e) => setMinFollowers(e.target.value)}
                    placeholder="e.g., 1000"
                    className="bg-white text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Repositories</label>
                  <input
                    type="number"
                    value={minRepositories}
                    onChange={(e) => setMinRepositories(e.target.value)}
                    placeholder="e.g., 50"
                    className="bg-white text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Joined Year</label>
                  <input
                    type="number"
                    value={minJoinedYear}
                    onChange={(e) => setMinJoinedYear(e.target.value)}
                    placeholder="e.g., 2020"
                    min="2008"
                    max={new Date().getFullYear()}
                    className="bg-white text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Followers</label>
                  <input
                    type="number"
                    value={maxFollowers}
                    onChange={(e) => setMaxFollowers(e.target.value)}
                    placeholder="e.g., 1000"
                    className="bg-white text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Repositories</label>
                  <input
                    type="number"
                    value={maxRepositories}
                    onChange={(e) => setMaxRepositories(e.target.value)}
                    placeholder="e.g., 50"
                    className="bg-white text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Joined Year</label>
                  <input
                    type="number"
                    value={maxJoinedYear}
                    onChange={(e) => setMaxJoinedYear(e.target.value)}
                    placeholder="e.g., 2020"
                    min="2008"
                    max={new Date().getFullYear()}
                    className="bg-white text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Archive Name Rules Section */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Archive Name Rules</h3>
              <div className="space-y-1">
                {/* Existing Archive Names */}
                <div className="max-h-[150px] overflow-y-auto flex flex-wrap gap-2 border p-2 rounded-md">
                  {archiveNames.map((name, index) => (
                    <div key={index} className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                      <span className="mr-2">{name}</span>
                      <button onClick={() => removeArchiveName(name)} className="text-green-600 hover:text-green-800 transition-colors rounded-full bg-white">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new Archive Name */}
                <div className="flex space-x-2 pt-1">
                  <input
                    type="text"
                    value={newArchiveName}
                    onChange={(e) => setNewArchiveName(e.target.value)}
                    onKeyPress={handleArchiveNameKeyPress}
                    placeholder="Enter archive name pattern..."
                    className="bg-white text-black flex-1 px-3 py-2 border border-gray-300 rounded-md focus:border-transparent"
                  />
                  <button
                    onClick={addArchiveName}
                    disabled={!newArchiveName.trim()}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Show user</h3>
              <div className="space-y-1 flex flex-row justify-center gap-8 mt-6">
                <div
                  onClick={() => setLocalShowOwnedUsers(!localShowOwnedUsers)}
                  className={`flex col-span-6 items-center justify-center gap-2 px-6 py-2 rounded-full text-sm cursor-pointer ${
                    localShowOwnedUsers ? "bg-[#498ea7] text-white" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {localShowOwnedUsers && <Check size={16} />}
                  <span>Show owned users?</span>
                </div>
                <div
                  onClick={() => setLocalShowDefaultAvatars(!localShowDefaultAvatars)}
                  className={`flex col-span-6 items-center justify-center gap-2 px-6 py-2 rounded-full text-sm cursor-pointer ${
                    localShowDefaultAvatars ? "bg-[#498ea7] text-white" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {localShowDefaultAvatars && <Check size={16} />}
                  <span>Show default avatars?</span>
                </div>
              </div>
            </div>
          </div>

          {/* General Column */}
          <div className="p-8">
            {/* GitHub API Keys Section */}
            <div>
              <h1 className="text-center p-6">General</h1>
              <h3 className="text-lg font-medium text-gray-900 mb-4">GitHub API Keys</h3>
              <div className="space-y-1">
                {/* Existing API Keys */}
                <div className="flex flex-wrap gap-2">
                  {githubApiKeys.map((apiKey, index) => (
                    <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      <span className="mr-2">
                        {apiKey.substring(0, 8)}...
                        {apiKey.substring(apiKey.length - 4)}
                      </span>
                      <button onClick={() => removeApiKey(apiKey)} className=" bg-white text-[#498ea7] hover:text-blue-800 transition-colors rounded-full">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new API Key */}
                <div className="flex space-x-2 py-3">
                  <input
                    type="text"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    onKeyPress={handleApiKeyKeyPress}
                    placeholder="Enter GitHub API key..."
                    className="bg-white text-black flex-1 px-3 py-2 border border-gray-300 rounded-md focus:border-transparent"
                  />
                  <button
                    onClick={addApiKey}
                    disabled={!newApiKey.trim()}
                    className="bg-[#498ea7] text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Show Owned Users */}
            <div>
              <h1 className="text-center p-6">List</h1>
              <div className="mt-6">
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Auto processing</h3>
                  <div className="space-y-1 flex flex-row justify-center gap-8 mt-6">
                    <div
                      onClick={() => setConfirmUSTime(!confirmUSTime)}
                      className={`flex col-span-6 items-center justify-center gap-2 px-6 py-2 rounded-full text-sm cursor-pointer ${
                        confirmUSTime ? "bg-[#498ea7] text-white" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {confirmUSTime && <Check size={16} />}
                      <span>Confirm they work on US Times?</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200">
          <button onClick={handleCancel} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleUpdate} className="px-6 py-2 bg-[#498ea7] text-white rounded-md hover:bg-blue-700 transition-colors">
            Update Settings
          </button>
        </div>
      </div>
    </div>
  );
};

// Updated NavigationBar component with Settings dialog integration
const NavigationBar = ({ activeTab, setActiveTab, user, setUser, onSignOut, showOwnedUsers, setShowOwnedUsers, showDefaultAvatars, setShowDefaultAvatars }) => {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = () => {
    setUser(null);
    setIsUserDropdownOpen(false);
    if (onSignOut) {
      onSignOut();
    }
  };

  const handleSignIn = () => {
    setUser({
      name: "John Doe",
      email: "john@example.com",
      username: "johndoe",
      avatar: "https://avatars.githubusercontent.com/u/1?v=4",
    });
  };

  const handleSyncDatabase = async () => {
    setIsLoading(true);
    // Simulate sync operation
    await syncManager.syncAll();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
    setIsUserDropdownOpen(false);
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#498ea7]"></div>
              <span className="text-gray-700">Syncing Database...</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            {/* <div className="flex items-center space-x-2">
              <div className="bg-[#499ca7] text-white p-2 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">UScan</span>
            </div> */}

            <div className="flex space-x-6">
              <button
                onClick={() => setActiveTab("search")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-colors border-0 ${
                  activeTab === "search" ? "bg-[#498ea715] text-[#326172]" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search</span>
              </button>

              <button
                onClick={() => setActiveTab("list")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors  border-0  ${
                  activeTab === "list" ? "bg-[#498ea715] text-[#326172]" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span>List</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleSyncDatabase}
              className="bg-[#498ea7] text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium hidden"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Sync Database</span>
            </button>

            {/* User Dropdown */}
            <div className="relative">
              {user ? (
                <div>
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors bg-white"
                  >
                    <span className="text-gray-800 font-medium">{user.username}</span>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${isUserDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <button
                        onClick={handleSettingsClick}
                        className="w-full text-left px-4 py-2 text-sm bg-white text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm bg-white text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={handleSignIn} className="bg-[#498ea7] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        showOwnedUsers={showOwnedUsers}
        setShowOwnedUsers={setShowOwnedUsers}
        showDefaultAvatars={showDefaultAvatars}
        setShowDefaultAvatars={setShowDefaultAvatars}
      />
    </>
  );
};

export default NavigationBar;
