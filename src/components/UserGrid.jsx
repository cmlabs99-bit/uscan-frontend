import { Check } from "lucide-react";

const UserGrid = ({ users, selectedUsers, onUserSelect, myGitHubUsers = [] }) => {
  const isSelected = (userId) => {
    return selectedUsers.some((user) => user.id === userId || user.githubId === userId);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 xl:grid-cols-15 mb-8">
      {users?.map((user) => {
        // const owner = isownerByMe(user);
        // const ownerInfo = getOwnerInfo(user);

        const owner = user.owner;

        return (
          <div
            key={user.id || user.githubId}
            className={` bg-black overflow-hidden transition-all ${owner
                ? "opacity-60 cursor-not-allowed"
                : `hover:shadow-lg cursor-pointer ${isSelected(user.id || user.githubId) ? "ring-5 ring-[#498ea7] opacity-60" : ""}`
              }`}
            onClick={() => !owner && onUserSelect(user)}
          >
            <div className="aspect-square relative group">
              {user.isDefaultAvatar ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <svg
                    className="w-1/2 h-1/2 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              ) : (
                <img
                  src={`${user.avatar_url}&size=160` || `https://github.com/${user.username}.png`}
                  alt={user.login || user.username}
                  className={`w-full h-full object-cover ${owner || isSelected(user.id || user.githubId) ? "grayscale" : ""}`}
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${user.username}&background=random`;
                  }}
                />
              )}

              {/* Hover Overlay */}
              {!owner && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              )}

              {/* User Info Overlay */}
              {!owner && (
                <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform">
                  {/* <p className="text-white text-sm font-medium truncate mb-2">{user.login || user.username}</p> */}
                  <div className="flex items-center justify-between">
                    <a
                      href={user.html_url || `https://github.com/${user.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-white hover:text-blue-300 text-xs underline m-auto"
                    >
                      {user.login || user.username}
                    </a>
                  </div>
                </div>
              )}

              {/* owner Indicator */}
              {owner && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-medium text-center">
                    <div>Already Added</div>
                    <div className="text-gray-300 text-xs mt-1">by {owner || ""}</div>
                  </div>
                </div>
              )}

              {/* owner Indicator */}
              {isSelected(user.id || user.githubId) && <div className="absolute inset-0 bg-black/60 flex items-center justify-center" />}

              {/* Selection Indicator */}
              {!owner && isSelected(user.id || user.githubId) && (
                <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-1">
                  <Check className="w-8 h-8" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UserGrid;
