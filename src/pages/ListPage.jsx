// Add these imports to your ListPage.jsx
import { useEffect, useState, useRef } from "react";
import { MapPin, Users, Calendar, GitBranch, Copy, ExternalLink, Play, Pause, RotateCcw, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { syncManager } from "../utils/syncManager";
import { db } from "../database/db";
import Pagination from "../components/Pagination";
import LoadingOverlay from "../components/LoadingOverlay";
import { startAutoProcessor, stopAutoProcessor, getProcessorStatus, processUserManually } from "../services/AutoUserProcessor";
import apiService from "../services/apiService";
import { X } from "lucide-react";

// Add this notification component
const NotificationToast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-[#498ea7]";

  const Icon = type === "success" ? CheckCircle : type === "error" ? AlertCircle : Clock;

  return (
    <div className={`${bgColor} text-white p-3 rounded-lg shadow-lg flex items-center space-x-2 mb-4`}>
      <Icon className="w-5 h-5" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-auto text-white hover:text-gray-200">
        ×
      </button>
    </div>
  );
};

// Modified ListPage component - add these to your existing component
const ListPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");
  const [currentPage, setCurrentPage] = useState(1);
  const [userList, setUserList] = useState([]);
  const [activeState, setActiveState] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [filterString, setFilterString] = useState("");
  const userListRef = useRef(userList);
  const processorStatus = useRef({ isRunning: false });
  const itemsPerPage = 100;

  const checkInterval = 300 * 1000;

  // Add notification function
  const addNotification = (message, type = "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getUserList = () => userListRef.current;

  const copyAllAndSend = async () => {
    setIsLoading(true);
    const confirmedUsers = [
      ...new Map(
        userList.filter((user) => user.status === 1).map((user) => [user.githubId, user]) // Remove duplicates by `id`
      ).values(),
    ].reverse();

    // Define the order of columns (email and name first, then others)
    const columnOrder = ["email", "name", "username", "githubId", "location", "followers", "repositoryCount", "joinedAt", "status", "statusText", "owner", "createdAt"];

    // Create header row
    const headers = columnOrder.join("\t");

    // Create data rows
    const dataRows = confirmedUsers.map((user) => {
      return columnOrder
        .map((key) => {
          const value = user[key];
          // Handle different data types and ensure proper formatting
          if (value === null || value === undefined) {
            return "";
          }
          if (typeof value === "object" && value instanceof Date) {
            return value.toString();
          }
          return String(value);
        })
        .join("\t");
    });

    // Combine header and data rows
    const message = [headers, ...dataRows].join("\n");
    let newState = 2;
    const userIds = confirmedUsers.map((user) => user.githubId);
    copyToClipboard(message);

    try {
      await apiService.moveGitHubUsers(userIds, newState);
      await db.myusers.bulkUpdate(userIds.map((githubId) => ({ key: githubId, changes: { status: newState } })));

      // Update the userList state to reflect the changes
      const updatedUserList = userList.map((user) => {
        if (userIds.includes(user.githubId)) {
          return { ...user, status: newState };
        }
        return user;
      });

      setUserList(updatedUserList);
    } catch (error) {
      console.error("Failed to batch update user statuses:", error);
    }
    addNotification("Copied!", "success");
    setIsLoading(false);
  };

  // Existing states calculation...
  const states = [
    { id: 0, label: "Pending", count: 0 },
    { id: 1, label: "Confirmed", count: 0 },
    { id: 2, label: "Sent", count: 0 },
    { id: 3, label: "Watchlist", count: 0 },
    { id: 9, label: "Archived", count: 0 },
  ];

  const filteredUsers = [
    ...new Map(
      userList
        .filter((user) => {
          // Always filter by status first
          if (user.status !== activeState) return false;

          // If filterString is empty, keep the user
          if (!filterString) return true;

          const lowerFilter = filterString.toLowerCase();
          const usernameInclude = user.username?.toLowerCase().includes(lowerFilter);
          const nameInclude = user.name?.toLowerCase().includes(lowerFilter);
          const emailInclude = user.email?.toLowerCase().includes(lowerFilter);

          return usernameInclude || nameInclude || emailInclude;
        })
        .map((user) => [user.githubId, user]) // Remove duplicates by `id`
    ).values(),
  ].reverse();

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  // console.log(currentUsers);

  const statesWithCounts = states.map((state) => ({
    ...state,
    count: userList.filter((user) => user.status === state.id).length,
  }));

  // Initialize data and auto processor
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      setLoadingMessage("Loading Users");
      await syncManager.syncMyUsers();
      const my_users = await db.myusers.toArray();
      // console.log(my_users);
      setUserList(my_users);

      // Auto-start processor if there are pending users
      const pendingCount = my_users.filter((user) => user.status === 0).length;
      if (pendingCount > 0) {
        addNotification(`Found ${pendingCount} pending users. Starting auto processor...`, "info");
        startAutoProcessor(getUserList, setUserList);
        processorStatus.current = { isRunning: true };
      }

      setInterval(async () => {
        let pendingUserCount = userList.filter((user) => user.status === 0).length;
        if (pendingUserCount) return;
        await syncManager.syncMyUsers();
        const my_users = await db.myusers.toArray();
        // console.log(my_users);
        setUserList(my_users);
      }, checkInterval);

      setIsLoading(false);
      setLoadingMessage("");
    };
    initialize();

    // Cleanup on unmount
    return () => {
      stopAutoProcessor();
    };
  }, []);

  useEffect(() => {
    userListRef.current = userList; // Keep ref updated on each render
  }, [userList]);

  // Rest of your existing functions (copyToClipboard, handleStateChange, etc.)
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleStateChange = async (userId, newState) => {
    try {
      const user = userList.find((o) => o.githubId === userId);
      if (user) {
        let message = "";
        if (user.status === 1 && newState === 2) {
          const greetings = ["Hello", "Hi", "Dear"];
          const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
          const names = user.name ? user.name.split(" ") : [];
          const firstName = names.length > 0 ? names[0] : "";
          message = `${randomGreeting} ${firstName},`;
        }
        copyToClipboard(message);
        // console.log("M", message, "S", user.status, newState);
      } else {
        // console.log("User not found ", userId);
      }

      await apiService.moveGitHubUsers([userId], newState);
      await db.myusers.update(userId, { status: newState });

      if (newState === 9) {
        addNotification("Archived!", "success");
      } else {
        addNotification("Sent!", "success");
      }

      const updatedList = userList.map((user) => (user.githubId === userId ? { ...user, status: newState } : user));
      setUserList(updatedList);

      // addNotification("User status updated successfully", "success");
    } catch (err) {
      console.error("Failed to update user state:", err);
      addNotification("Failed to update user status", "error");
    }
  };

  // Your existing helper functions...
  const getGitHubAvatarUrl = (user) => {
    if (user.githubId) {
      return `https://avatars.githubusercontent.com/u/${user.githubId}?v=4&s=80`;
    }
    return `https://github.com/${user.username}.png?size=80`;
  };

  const getGitHubProfileUrl = (user) => {
    return `https://github.com/${user.username}`;
  };

  const renderActionButtons = (user) => {
    switch (user.status) {
      case 0: // pending
        return (
          <div className="flex gap-2 justify-self-center">
            {/* <button
              onClick={() =>
                processUserManually(user, getUserList, setUserList)
              }
              className="px-3 py-1 bg-[#498ea7] text-white text-sm rounded hover:bg-[#498ea7] transition-colors"
              title="Process this user now"
            >
              Process
            </button> */}
            <button
              type="button"
              onClick={() => handleStateChange(user.githubId, 9)}
              className="px-3 py-1 bg-gray-500 text-white text-xl  rounded hover:bg-gray-600 transition-colors"
            >
              Archive
            </button>
          </div>
        );
      case 1: // confirmed
        return (
          <div className="flex gap-2 justify-self-center">
            <button onClick={() => handleStateChange(user.githubId, 2)} className="px-3 py-1 bg-[#498ea7] text-white text-xl rounded hover:bg-[#498ea7] transition-colors">
              Send
            </button>
            <button onClick={() => handleStateChange(user.githubId, 9)} className="px-3 py-1 bg-gray-500 text-white text-xl rounded hover:bg-gray-600 transition-colors">
              Archive
            </button>
          </div>
        );
      case 2: // sent
        return (
          <div className="flex justify-center items-center h-full gap-2 justify-self-center">
            <button onClick={() => handleStateChange(user.githubId, 3)} className="px-3 py-1 bg-orange-500 text-white text-xl rounded hover:bg-yellow-600 transition-colors">
              To Watchlist
            </button>
          </div>
        );
      case 3: // watchlist
        return (
          <div className="flex gap-2 justify-self-center">
            <button onClick={() => handleStateChange(user.githubId, 2)} className="px-3 py-1 bg-red-500 text-white text-xl rounded hover:bg-red-600 transition-colors">
              Cancel
            </button>
            <button onClick={() => handleStateChange(user.githubId, 9)} className="px-3 py-1 bg-gray-500 text-white text-xl rounded hover:bg-gray-600 transition-colors">
              Archive
            </button>
          </div>
        );
      case 9: // archived
        return (
          <div className="flex gap-2 justify-self-center">
            <button onClick={() => handleStateChange(user.githubId, 1)} className="px-3 py-1 bg-red-500 text-white text-xl rounded hover:bg-red-600 transition-colors">
              Cancel
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeState]);

  return (
    <div className="p-6">
      {isLoading && <LoadingOverlay message={loadingMessage} />}

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <NotificationToast key={notification.id} message={notification.message} type={notification.type} onClose={() => removeNotification(notification.id)} />
        ))}
      </div>

      {/* Rest of your existing JSX... */}
      {/* Secondary Navigation */}
      <div className="mb-6">
        <nav className="flex justify-between items-center border-b border-gray-200 bg-white p-2">
          {/* Left side - State buttons */}
          <div className="flex space-x-4">
            {statesWithCounts.map((state) => (
              <button
                key={state.id}
                onClick={() => setActiveState(state.id)}
                className={`flex gap-3 items-center justify-center min-w-[100px] px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeState === state.id ? "bg-[#498ea7] text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                }`}
              >
                <span>{state.label}</span>
                {state.count > 0 && (
                  <span className={`px-4 py-1 rounded-full text-xs font-semibold ${activeState === state.id ? "bg-white text-[#498ea7]" : "bg-gray-300 text-gray-800"}`}>
                    {state.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Right side - Filter and Copy button */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <input
                  type="text"
                  value={filterString}
                  onChange={(e) => setFilterString(e.target.value)}
                  placeholder="Filter : e.g., John"
                  className="px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm text-black bg-white focus:ring-0 focus:ring-[#498ea7] focus:border-[#498ea7] w-32"
                />
                {filterString && (
                  <button type="button" onClick={() => setFilterString(``)} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {activeState === 1 && (
              <button
                onClick={copyAllAndSend}
                className="flex items-center space-x-2 bg-orange-500 text-white shadow-md px-4 py-2 rounded-md text-sm font-medium transition-all hover:bg-orange-600"
                title="Copy all confirmed records to clipboard and move to sent"
              >
                <span>Copy & Send</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Table */}
      {currentUsers.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Info</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider ">Emails</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentUsers.map((user) => (
                <tr key={user.githubId.toString() + user.username} className="hover:bg-gray-50">
                  {/* Photo */}
                  <td className="px-1 whitespace-nowrap">
                    <div className="cursor-pointer flex items-center justify-center" onClick={() => window.open(getGitHubProfileUrl(user), "_blank")}>
                      <img
                        src={getGitHubAvatarUrl(user)}
                        alt={user.username}
                        style={{ minWidth: "100px" }}
                        className={`w-24 h-24 rounded-sm hover:ring-2 min-w-100 aspect-square hover:ring-[#498ea7] transition-all ${
                          user.githubId === getProcessorStatus()?.processingUser?.githubId ? "border-[#498ea7] drop-shadow" : ""
                        }`}
                        onError={(e) => {
                          e.target.src = `https://github.com/${user.username}.png?size=80`;
                        }}
                      />
                    </div>
                  </td>

                  {/* Info */}
                  <td className="px-6">
                    <div className="space-y-1">
                      {/* Real Name */}
                      <div
                        className="text-base font-bold text-gray-900 cursor-pointer hover:text-[#498ea7] flex items-center group justify-self-center"
                        onClick={() => copyToClipboard(user.name || "")}
                      >
                        {user.name.slice(0, 30) || ""}
                        <Copy className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* GitHub Username */}
                      <div
                        className="text-sm text-gray-600 cursor-pointer hover:text-[#498ea7] flex items-center group justify-self-center italic"
                        onClick={() => copyToClipboard(user.username)}
                      >
                        @{user.username.slice(0, 30)}
                        <Copy className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* GitHub Stats (show only for confirmed state) */}
                      {(activeState === 1 || activeState === 9) && (
                        <div className="flex items-center space-x-3 text-xs text-gray-500 justify-center">
                          <div className="flex items-center cursor-pointer hover:text-[#498ea7] group" onClick={() => copyToClipboard(user.followers?.toString() || "0")}>
                            <Users className="w-3 h-3 mr-1" />
                            {user.followers || 0}
                            <Copy className="w-2 h-2 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div
                            className="flex items-center cursor-pointer hover:text-[#498ea7] group"
                            onClick={() => copyToClipboard(user.joinedAt ? new Date(user.joinedAt).getFullYear() : "")}
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            {user.joinedAt ? new Date(user.joinedAt).getFullYear() : ""}
                            <Copy className="w-2 h-2 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex items-center cursor-pointer hover:text-[#498ea7] group" onClick={() => copyToClipboard(user.repositoryCount?.toString() || "0")}>
                            <GitBranch className="w-3 h-3 mr-1" />
                            {user.repositoryCount || 0}
                            <Copy className="w-2 h-2 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      )}

                      {/* Location */}
                      {user.location && (
                        <div
                          className="flex items-center text-xs text-gray-500 cursor-pointer hover:text-[#498ea7] group justify-self-center"
                          onClick={() => copyToClipboard(user.location)}
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          {user.location.slice(0, 20)}
                          <Copy className="w-2 h-2 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}

                      {/* Processing Status Indicator */}
                      {user.processedAt && <div className="text-xs text-gray-400">Processed: {new Date(user.processedAt).toLocaleDateString()}</div>}

                      {user.phone ? (
                        <div
                          className="flex items-center text-xs text-gray-500 cursor-pointer hover:text-[#498ea7] group justify-self-center"
                          onClick={() => copyToClipboard(user.phone)}
                        >
                          {user.phone}
                          <Copy className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ) : (
                        ""
                      )}
                    </div>
                  </td>

                  {/* Emails */}
                  <td className="px-1 whitespace-nowrap text-sm text-gray-900 justify-self-center text-center">
                    {
                      <div
                        className="cursor-pointer hover:text-[#498ea7] group flex flex-col items-center justify-center bg-[#e3e3e3] p-2.5 rounded-[32px]"
                        onClick={() => copyToClipboard(user.email)}
                      >
                        {user.email.split(",").map((e, index) => (
                          <p key={index}>{e.trim()}</p>
                        ))}
                      </div>
                    }
                  </td>

                  {/* Actions */}
                  <td className="px-1 whitespace-nowrap justify-self-center">{renderActionButtons(user)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500 text-lg">
            {userList.length === 0
              ? "No users in your list yet. Add some users from the Search page."
              : `No users in ${statesWithCounts.find((s) => s.id === activeState)?.label.toLowerCase()} state.`}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
    </div>
  );
};

export default ListPage;
