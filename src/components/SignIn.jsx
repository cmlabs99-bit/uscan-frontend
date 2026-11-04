// SignIn.jsx - Standalone SignIn Component
import React, { useState } from "react";
import { AlertCircle, Eye, EyeOff, LogIn } from "lucide-react";
import apiService from "../services/apiService";

const SignIn = ({ onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    login: "",
    password: "",
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const validateForm = () => {
    const newErrors = [];

    if (!formData.login.trim()) {
      newErrors.push({ msg: "Username or email is required" });
    }

    if (!formData.password) {
      newErrors.push({ msg: "Password is required" });
    } else if (formData.password.length < 6) {
      newErrors.push({ msg: "Password must be at least 6 characters long" });
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrors([]);

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await apiService.authSignIn(
        JSON.stringify({
          login: formData.login,
          password: formData.password,
        })
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Sign in failed");
      }

      // Store tokens and user info in localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.tasker));

      // Call success callback
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      const errorMessage = error.message || "An unexpected error occurred. Please try again.";
      setErrors([{ msg: errorMessage }]);

      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto bg-indigo-100 w-24 h-24 rounded-full flex items-center justify-center mb-4">
            <img
              src="/favicon.png"
              alt="Logo"
              className="w-24 h-24"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome To UScan Soft</h1>
          {/* <p className="text-gray-600 mt-2">Sign in to your account</p> */}
        </div>

        {errors.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-sm font-medium text-red-800">{errors.length === 1 ? "Error:" : "Errors:"}</span>
            </div>
            <div className="ml-7">
              {errors.map((error, index) => (
                <p key={index} className="text-sm text-red-700 mb-1 last:mb-0">
                  • {error.msg}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-2">
              Username or Email
            </label>
            <input
              type="text"
              id="login"
              name="login"
              value={formData.login}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-0 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter username or email"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-0 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center focus:ring-0 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Sign In
              </>
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          {/* <p className="text-sm text-gray-600">Having trouble? Contact your system administrator</p> */}
          <div className="mt-2 text-xs text-gray-500">Supports both username and email login</div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
