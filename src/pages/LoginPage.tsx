import React, { useEffect, useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RefreshProvider, useRefresh } from '../context/RefreshContext';
import RefreshButton from '../components/RefreshButton';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { refreshKey, triggerRefresh } = useRefresh();

  // Effect to load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    // Fetch notifications here
  }, [refreshKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const requestBody: any = { email, password };

    if (mfaRequired) {
      requestBody.mfaToken = mfaToken;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();

      if (response.ok) {
        login(email, password, mfaToken);
        // Save or remove remembered email based on checkbox state
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
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
    <RefreshProvider>
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
                  autoComplete="off"
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
                  autoComplete="off"
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
                  onChange={() => setRememberMe(!rememberMe)}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
              >
                {mfaRequired ? 'Verify Token' : 'Sign in'}
              </button>
            </form>
            <div className="flex justify-between items-center mt-4">
              <Link to="/forgot-password" className="text-blue-700 hover:underline text-sm">
                Forgot password
              </Link>
            </div>
            <div className="text-center mt-8">
              <Link to="/register" className="font-medium text-blue-700 hover:underline">
                create a new account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </RefreshProvider>
  );
};

export default LoginPage;