import { useState, useEffect } from "react";
import NavigationBar from "./components/NavigationBar";
import SearchPage from "./pages/SearchPage";
import ListPage from "./pages/ListPage";
import SignIn from "./components/SignIn"; // Import your SignIn component
import { syncManager } from "./utils/syncManager";
import LoadingSpinner from "./components/LoadingSpinner";
import apiService from "./services/apiService";
import { getShowDefaultAvatars, getShowOwnedUsers, getStoredToken, getStoredUser, initializeItems } from "./utils/storageManager";

// Initialize and sync when app starts
async function initSyncDatabase() {
  try {
    await syncManager.syncAll();
    // console.log("Initial sync success!");
  } catch (error) {
    console.error("Initial sync failed:", error);
    throw error; // Re-throw to handle in component
  }
}

const clearAuthData = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

function App() {
  const [activeTab, setActiveTab] = useState("search");
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [showOwnedUsers, setShowOwnedUsers] = useState(false);
  const [showDefaultAvatars, setShowDefaultAvatars] = useState(false);

  // Check authentication status on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = getStoredToken();
        const storedUser = getStoredUser();

        // console.log(token, storedUser);
        if (token && storedUser) {
          // Verify token is still valid by making a test API call
          const response = await apiService.authMe(token);

          if (response.ok) {
            const data = await response.json();
            // console.log("AuthMe , ", data);
            setUser(data.tasker);
            setIsAuthenticated(true);
          } else {
            // Token is invalid, clear stored data
            console.error("Token is invalid");
            // clearAuthData();
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // clearAuthData();
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Initialize sync after authentication
  useEffect(() => {
    let hasRun = false;

    const initializeApp = async () => {
      if (hasRun || !isAuthenticated || authLoading) return;
      hasRun = true;

      try {
        // console.log("App Started !");
        initializeItems();
        const savedShowOwendUsers = getShowOwnedUsers();
        const savedShowDefualtAvatars = getShowDefaultAvatars();
        setShowOwnedUsers(savedShowOwendUsers);
        setShowDefaultAvatars(savedShowDefualtAvatars);
        // Sync database with loading state
        await initSyncDatabase();

        // Add a small delay to show the loading state (optional)
        await new Promise((resolve) => setTimeout(resolve, 500));

        setIsLoading(false);
      } catch (error) {
        console.error("App initialization failed:", error);
        setSyncError(error.message || "Failed to sync database");
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [isAuthenticated, authLoading]);

  // Handle successful sign in
  const handleSignInSuccess = (data) => {
    // console.log("User signed in:", data.tasker);
    setUser(data.tasker);
    setIsAuthenticated(true);
    // Tokens are already stored by SignIn component
  };

  // Handle sign in error
  const handleSignInError = (error) => {
    console.error("Sign in failed:", error);
    setSyncError("Sign in failed. Please try again.");
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      apiService.authSignOut();
    } catch (error) {
      console.warn("Signout API call failed:", error);
    } finally {
      // Clear local data regardless of API call result
      clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      setActiveTab("search"); // Reset to default tab
    }
  };

  // Show loading spinner during initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 w-full">
        <LoadingSpinner message="Checking Authentication..." />
      </div>
    );
  }

  // Show sign in page if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 w-full">
        <SignIn onSuccess={handleSignInSuccess} onError={handleSignInError} />

        {/* Show sync error if any */}
        {syncError && (
          <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-sm">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{syncError}</span>
          </div>
        )}
      </div>
    );
  }

  // Main authenticated app
  return (
    <div className="min-h-screen bg-gray-100 w-full">
      {/* Show loading spinner while syncing */}
      {isLoading && <LoadingSpinner message="Syncing Database" />}

      {/* Show sync error */}
      {syncError && !isLoading && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-sm z-50">
          <div className="flex items-center">
            <strong className="font-bold mr-2">Sync Error:</strong>
            <button onClick={() => setSyncError(null)} className="ml-auto text-red-700 hover:text-red-900">
              ×
            </button>
          </div>
          <span className="block text-sm mt-1">{syncError}</span>
          <button onClick={() => window.location.reload()} className="mt-2 text-xs bg-red-200 hover:bg-red-300 px-2 py-1 rounded">
            Retry
          </button>
        </div>
      )}

      {/* Main app content with blur effect when loading */}
      <div className={isLoading ? "filter blur-sm pointer-events-none" : ""}>
        <NavigationBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          setUser={setUser}
          onSignOut={handleSignOut} // Pass signout handler to navigation
          showOwnedUsers={showOwnedUsers}
          setShowOwnedUsers={setShowOwnedUsers}
          showDefaultAvatars={showDefaultAvatars}
          setShowDefaultAvatars={setShowDefaultAvatars}
        />

        {activeTab === "search" && <SearchPage user={user} showOwnedUsers={showOwnedUsers} showDefaultAvatars={showDefaultAvatars} />}
        {activeTab === "list" && <ListPage user={user} />}
      </div>
    </div>
  );
}

export default App;
