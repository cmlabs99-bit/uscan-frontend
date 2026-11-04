import { useState } from "react";

const useGitHubUsers = () => {
  const [myGitHubUsers, setMyGitHubUsers] = useState([]);

  const fetchMyGitHubUsers = async () => {
    try {
      // Mock API response for demo
      const mockResponse = {
        users: [
          {
            githubId: "user1",
            username: "johndoe",
            createdBy: "you"
          }
        ]
      };

      // In real app: const response = await apiService.getAllGitHubUsers();
      setMyGitHubUsers(mockResponse.users);
      return mockResponse.users;
    } catch (error) {
      console.error('Failed to fetch my GitHub users:', error);
      throw error;
    }
  };

  return { myGitHubUsers, fetchMyGitHubUsers, setMyGitHubUsers };
};

export default useGitHubUsers;