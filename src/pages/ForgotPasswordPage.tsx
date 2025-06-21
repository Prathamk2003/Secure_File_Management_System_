import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import { RefreshProvider, useRefresh } from '../context/RefreshContext';
import RefreshButton from '../components/RefreshButton';

const NotificationsContent = () => {
  const { refreshKey, triggerRefresh } = useRefresh();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        // Trigger a refresh
      } else {
        setError(data.message || 'Failed to process request');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('An error occurred. Please try again later.');
    }
  };

  useEffect(() => {
    // Fetch notifications here
  }, [refreshKey]);

  return (
    <div>
      <RefreshButton onClick={triggerRefresh} />
      {/* ...rest of your notifications UI... */}

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
          {/* Optionally, you can add an overlay or leave empty */}
        </div>

        {/* Right side: Forgot Password form */}
        <div className="flex flex-col justify-center items-center w-full md:w-1/2 bg-blue-50">
          <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
            <h1 className="text-4xl font-bold text-blue-900 mb-2 text-center">Gabriel</h1>
            <h2 className="text-xl font-semibold text-gray-700 mb-8 text-center">Reset your password</h2>

            {!isSubmitted ? (
              <>
                <p className="text-gray-600 mb-6 text-center">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 flex items-center" role="alert">
                    <svg className="h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="block sm:inline font-semibold text-sm">{error}</span>
                  </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="email-address" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="email-address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-4"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                  >
                    Send reset link
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="mb-6">
                  <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Check your email</h3>
                <p className="text-gray-600 mb-6">
                  We've sent a password reset link to {email}. Please check your email and follow the instructions to reset your password.
                </p>
              </div>
            )}

            <div className="text-center mt-8">
              <Link to="/login" className="font-medium text-blue-700 hover:underline">
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function NotificationsPage() {
  return (
    <RefreshProvider>
      <NotificationsContent />
    </RefreshProvider>
  );
}