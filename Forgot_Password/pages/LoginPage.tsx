import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const requestBody: any = { 
      email, 
      password,
      rememberMe // Add rememberMe flag to the request
    };

    if (mfaRequired) {
      requestBody.mfaToken = mfaToken;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();

      if (response.ok) {
        login(data.userId, data.role, data.message);
        navigate('/');
      } else if (response.status === 401 && data.requiresMfa) {
        setMfaRequired(true);
        setLoginError(data.message || 'MFA required.');
      } else {
        setLoginError(data.message || 'Login failed');
        setMfaRequired(false);
        setMfaToken('');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('An error occurred during login.');
      setMfaRequired(false);
      setMfaToken('');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side: Background image */}
      <div
        className="hidden md:flex w-1/2 items-center justify-center"
        style={{
          backgroundImage: "url('/gabriel.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Optionally, you can add overlay or leave empty for pure image */}
      </div>
      {/* Right side: Login form */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 bg-blue-50">
        <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
          <h1 className="text-4xl font-bold text-blue-900 mb-2 text-center">Gabriel</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-8 text-center">Sign in to your account</h2>

          {/* Display Login Error Text Message */}
          {loginError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 flex items-center" role="alert">
              <svg className="h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="block sm:inline font-semibold text-sm">{loginError}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} autoComplete="off">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-4"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={mfaRequired}
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-4"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={mfaRequired}
                autoComplete="current-password"
              />
            </div>
            {mfaRequired && (
              <div>
                <label htmlFor="mfa-token" className="sr-only">
                  MFA Token
                </label>
                <input
                  id="mfa-token"
                  name="mfaToken"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-4"
                  placeholder="MFA Token"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value)}
                />
              </div>
            )}
            <div className="flex items-center mb-4">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>
            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {mfaRequired ? 'Verify MFA' : 'Sign in'}
              </button>
            </div>
          </form>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3">
              <Link
                to="/forgot-password"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Forgot Password?
              </Link>
            </div>
          </div>
          <div className="text-center mt-8">
            <span className="text-gray-600">Don't have an account? </span>
            <Link to="/register" className="font-medium text-blue-700 hover:underline">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 