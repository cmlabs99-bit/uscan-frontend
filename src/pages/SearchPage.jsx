import { useState, useEffect } from "react";
import FilterBar from "../components/FilterBar";
import UserGrid from "../components/UserGrid";
import Pagination from "../components/Pagination";
import SelectionBanner from "../components/SelectionBanner";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import useGitHubUsers from "../hooks/useGithubusers";
import { db } from "../database/db";
import LoadingOverlay from "../components/LoadingOverlay";
import { fetchGitHubUsers } from "../services/GithubUserFetcher";
import apiService from "../services/apiService";
import { syncSelectedUsers } from "../database/databaseSync";
import pLimit from "p-limit";

const SearchPage = ({ showOwnedUsers, showDefaultAvatars }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [spinnerUserCount, setSpinnerUserCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");

  const { toast, showToast, hideToast } = useToast();
  const { myGitHubUsers, fetchMyGitHubUsers } = useGitHubUsers();

  const filteredOwnedResults = showOwnedUsers ? searchResults : searchResults.filter((result) => !result.owner);
  const filteredResults = showDefaultAvatars ? filteredOwnedResults : filteredOwnedResults.filter((result) => !result.isDefaultAvatar);

  const itemsPerPage = 1000;
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

  const currentResults = filteredResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      setLoadingMessage("Finding users ... ");

      try {
        // Fetch my GitHub users first
        await fetchMyGitHubUsers();
      } catch (error) {
        console.error("Failed to load users:", error);
        showToast("Failed to load users", "error");
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]); // when page changes

  async function isDefaultAvatarFast(url) {
    try {
      const [small, large] = await Promise.all([
        fetch(`${url}&size=16`, { method: "HEAD", cache: "force-cache" }),
        fetch(`${url}&size=32`, { method: "HEAD", cache: "force-cache" }),
      ]);

      const lenSmall = small.headers.get("content-length");
      const lenLarge = large.headers.get("content-length");

      if (!lenSmall || !lenLarge) return false;

      // Default avatar ignores size → same payload
      return lenSmall === lenLarge;
    } catch {
      return false;
    }
  }

  // Filter users based on search criteria
  const searchGitHubUsers = async (filters, isAppending) => {
    setCurrentPage(1);
    setSelectedUsers([]);
    setSearchResults([]);

    setLoadingMessage("Searching Users ... ");
    setIsLoading(true);
    setCurrentPage(1);
    setSelectedUsers([]);

    try {
      // fetch users from Github API
      setSpinnerUserCount(0);
      setProcessedCount(0);
      const data = await fetchGitHubUsers(filters, setSpinnerUserCount, setProcessedCount);

      // Get all users from Dexie cache
      const oldUsers = await db.users.toArray();

      // console.log("Search Data - " , data);
      // console.log("Old Data - ", oldUsers);
      if (data.users) {
        // console.log(data);

        const mappedData = data.users.map((user) => {
          const match = oldUsers.find((oldUser) => oldUser.githubId === user.id);
          if (match) {
            user.owner = match.owner;
          }
          return user;
        });

        // Then filter by image dimensions
        const limit = pLimit(50); // only 50 images at a time

        const finalData = (
          await Promise.all(
            mappedData.map((user) =>
              limit(async () => {
                const isDefaultAvatar = await isDefaultAvatarFast(user.avatar_url);
                return { ...user, isDefaultAvatar };
              })
            )
          )
        );

        if (isAppending) {
          const userMap = new Map();
          searchResults.forEach((user) => userMap.set(user.id, user));
          finalData.forEach((user) => userMap.set(user.id, user));
          setSearchResults(
            Array.from(userMap.values()).sort((a, b) => a.id - b.id) // ascending by GitHub ID
          );
        } else {
          setSearchResults([...new Map(finalData.map((item) => [item.id, item])).values()].sort((a, b) => a.id - b.id));
        }
        showToast(`Found ${finalData.length} matching users`);
      } else {
        setSearchResults([]);
        showToast(`Cancelled`);
      }
    } catch (error) {
      console.error("Search failed:", error);
      showToast("Search failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => (u.githubId || u.id) === (user.githubId || user.id));
      if (isSelected) {
        return prev.filter((u) => (u.githubId || u.id) !== (user.githubId || user.id));
      }
      return [...prev, user];
    });
  };

  const handleAddSelectedToList = async () => {
    if (selectedUsers.length === 0) return;

    setIsLoading(true);
    setSpinnerUserCount(selectedUsers.length);
    setProcessedCount(0);
    setLoadingMessage("Adding users to list ... ");

    try {
      // Format users for API
      const usersToAdd = selectedUsers.map((user) => ({
        githubId: user.id,
        username: user.login,
        owner: "You",
      }));

      // Mock API call for demo
      try {
        // console.log("Would call API with:", selectedUsers, usersToAdd);
        const response = await apiService.createGitHubUsers(usersToAdd);
        await syncSelectedUsers(usersToAdd);

        // console.log("Search Results : ", searchResults, usersToAdd);
        let newResult = searchResults
          .map((result) => {
            const match = usersToAdd.find((user) => user.githubId === result.id);
            return match ? { ...result, owner: "You" } : result;
          })
          .sort((a, b) => a.id - b.id); // ascending by GitHub ID

        // console.log(newResult);
        setSelectedUsers([]);
        setSearchResults(newResult);
        showToast(`Successfully added ${usersToAdd.length} users to list!`);
      } catch (error) {
        console.error("❌ API error:", error.response?.data || error.message);
      }
    } catch (error) {
      console.error("Failed to add users:", error);
      showToast("Failed to add users to list", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {isLoading && <LoadingOverlay message={loadingMessage + " ( " + processedCount + " / " + spinnerUserCount + " )"} />}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <FilterBar onSearch={searchGitHubUsers} />

      <div className="w-full max-w-none">
        <SelectionBanner selectedCount={selectedUsers.length} onAddToList={handleAddSelectedToList} />

        {filteredResults.length > 0 ? (
          <>
            <div className="p-6 mb-4 text-gray-600">
              Showing {itemsPerPage * (currentPage - 1) + 1} - {Math.min(itemsPerPage * currentPage, filteredResults.length)} of {filteredResults.length}{" "}
              <span className="px-4"> </span> Hiding {searchResults.length - filteredResults.length}
            </div>

            <UserGrid users={currentResults} selectedUsers={selectedUsers} onUserSelect={handleUserSelect} myGitHubUsers={myGitHubUsers} />

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{isLoading ? "Loading users..." : "Use the search filters above to find GitHub users"}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
