// hooks/useAuth.js
import { useState, useCallback } from 'react';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);

  // Get tokens from localStorage
  const getToken = useCallback(() => localStorage.getItem('token'), []);
  const getRefreshToken = useCallback(() => localStorage.getItem('refreshToken'), []);

  // Check if token is expired
  const isTokenExpired = useCallback((token) => {
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }, []);

  // Refresh token
  const refreshToken = useCallback(async () => {
    const refreshTokenValue = getRefreshToken();

    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Token refresh failed');
      }

      const data = await response.json();

      // Update stored tokens
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);

      return data.token;
    } catch (error) {
      // Clear invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      throw error;
    }
  }, [getRefreshToken]);

  // Make authenticated API call
  const apiCall = useCallback(async (url, options = {}) => {
    setLoading(true);

    try {
      let token = getToken();

      // Check if token is expired and refresh if needed
      if (token && isTokenExpired(token)) {
        try {
          token = await refreshToken();
        } catch (error) {
          throw new Error('Authentication required');
        }
      }

      const makeRequest = async (accessToken) => {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
            ...options.headers,
          },
        });

        // Handle 401 errors by attempting token refresh
        if (response.status === 401 && accessToken) {
          try {
            const newToken = await refreshToken();
            // Retry the request with new token
            return fetch(url, {
              ...options,
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${newToken}`,
                ...options.headers,
              },
            });
          } catch (refreshError) {
            throw new Error('Authentication failed');
          }
        }

        return response;
      };

      return await makeRequest(token);
    } finally {
      setLoading(false);
    }
  }, [getToken, isTokenExpired, refreshToken]);

  // Convenience methods
  const get = useCallback((url, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    return apiCall(fullUrl, { method: 'GET' });
  }, [apiCall]);

  const post = useCallback((url, data = {}) => {
    return apiCall(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }, [apiCall]);

  const put = useCallback((url, data = {}) => {
    return apiCall(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }, [apiCall]);

  const del = useCallback((url) => {
    return apiCall(url, { method: 'DELETE' });
  }, [apiCall]);

  return {
    loading,
    apiCall,
    get,
    post,
    put,
    delete: del,
  };
};
