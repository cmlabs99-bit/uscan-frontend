const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

import { getStoredToken, getStoredUser } from "../utils/storageManager";

const apiService = {

  async authMe(token) {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response;
  },

  async authSignIn(body) {
    const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
    });
    return response;
  },

  async authSignOut() {
    const token = getStoredToken();
    if (token) {
      await fetch(`${API_BASE_URL}/api/auth/signout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    }
  },

  // Existing methods
  async getAllGitHubUsers() {
    const response = await fetch(`${API_BASE_URL}/api/users/github-users`, {
      headers: {
        'Authorization': `Bearer ${getStoredToken()}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async createGitHubUsers(users) {
    const response = await fetch(`${API_BASE_URL}/api/users/create-github-users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getStoredToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ users })
    });
    if (!response.ok) throw new Error('Failed to create users');
    return response.json();
  },

  async moveGitHubUsers(users, newStatus) {
    const response = await fetch(`${API_BASE_URL}/api/users/move-github-users`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getStoredToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ users, newStatus })
    });
    if (!response.ok) throw new Error('Failed to move GitHub users');
    return response.json();
  },


  async updateGitHubUsers(users, owner = null) {
    const response = await fetch(`${API_BASE_URL}/api/users/update-github-users`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getStoredToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ users, ...(owner && { owner }) })
    });
    if (!response.ok) throw new Error('Failed to update GitHub users');
    return response.json();
  },

  async updateGitHubUser(userId, userData) {
    const response = await fetch(`${API_BASE_URL}/api/users/update-github-user/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getStoredToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error('Failed to update GitHub user');
    return response.json();
  },

  // New methods for your backend APIs
  async getMyGitHubUsers(params = {}) {
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 1000,
      ...(params.status !== undefined && { status: params.status }),
      ...(params.search && { search: params.search })
    });

    const response = await fetch(`${API_BASE_URL}/api/users/my-github-users?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${getStoredToken()}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch my GitHub users');
    return response.json();
  },

  async getAllGitHubUsersSimple(params = {}) {
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      ...(params.status !== undefined && { status: params.status }),
      ...(params.taskerUsername && { taskerUsername: params.taskerUsername })
    });

    const response = await fetch(`${API_BASE_URL}/api/users/all-github-users-simple?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${getStoredToken()}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch all GitHub users');
    return response.json();
  }
};

export default apiService;