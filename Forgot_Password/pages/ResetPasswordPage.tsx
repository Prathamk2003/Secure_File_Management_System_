import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError('Invalid or missing reset token.');
    }
  }, [token]);

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 12) {
      return 'Password must be at least 12 characters long';
    }
    
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasLowerCase = /[a-z]/.test(pass);
    const hasNumbers = /\d/.test(pass);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }

    // Check for common dictionary words (basic check)
    const commonWords = ['password', 'admin', 'user', 'welcome', 'qwerty', '123456'];
    if (commonWords.some(word => pass.toLowerCase().includes(word))) {
      return 'Password cannot contain common words or patterns';
    }

    return null;
  };

  const isPasswordSimilar = (newPass: string, oldPass: string): boolean => {
    // Convert passwords to lowercase for comparison
    const newPassLower = newPass.toLowerCase();
    const oldPassLower = oldPass.toLowerCase();

    // Check for exact match
    if (newPassLower === oldPassLower) {
      return true;
    }

    // Check if new password is contained within old password or vice versa
    if (newPassLower.includes(oldPassLower) || oldPassLower.includes(newPassLower)) {
      return true;
    }

    // Check for character sequence similarity
    const similarityThreshold = 0.7;
    const minLength = Math.min(newPassLower.length, oldPassLower.length);
    let matchingChars = 0;

    // Check for character matches in sequence
    for (let i = 0; i < minLength; i++) {
      if (newPassLower[i] === oldPassLower[i]) {
        matchingChars++;
      }
    }

    // Check for character matches regardless of position
    const newPassChars = newPassLower.split('');
    const oldPassChars = oldPassLower.split('');
    const commonChars = newPassChars.filter(char => oldPassChars.includes(char));
    
    // Calculate similarity based on both sequence and character matches
    const sequenceSimilarity = matchingChars / minLength;
    const characterSimilarity = commonChars.length / Math.max(newPassChars.length, oldPassChars.length);
    
    // Return true if either similarity measure is above threshold
    return sequenceSimilarity > similarityThreshold || characterSimilarity > similarityThreshold;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordError(validatePassword(newPassword));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    setLoading(true);

    try {
      // First, get the old password hash from the server
      const checkResponse = await fetch('/api/check-old-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const checkData = await checkResponse.json();

      if (checkResponse.ok && checkData.oldPasswordHash) {
        // Check if the new password is too similar to the old one
        if (isPasswordSimilar(password, checkData.oldPasswordHash)) {
          setError('New password must be significantly different from your previous password.');
          setLoading(false);
          return;
        }
      }

      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Password has been reset successfully. You can now log in with your new password.');
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-blue-50">
        <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Invalid Reset Link</h1>
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p className="text-sm font-medium">{error}</p>
          </div>
          <div className="mt-6 text-center">
            <a href="/forgot-password" className="font-medium text-blue-600 hover:underline">
              Request a new password reset link
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-blue-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Reset Password</h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="sr-only">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className={`appearance-none rounded-md relative block w-full px-3 py-3 border ${
                passwordError ? 'border-red-300' : 'border-gray-300'
              } placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-1`}
              placeholder="New Password"
              value={password}
              onChange={handlePasswordChange}
              disabled={loading}
            />
            {passwordError && (
              <p className="text-red-500 text-sm mb-4">{passwordError}</p>
            )}
            <p className="text-gray-500 text-xs mb-4">
              Password must be at least 12 characters long and include uppercase, lowercase, numbers, and special characters.
              The new password must be significantly different from your previous password.
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="sr-only">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        {message && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage; 