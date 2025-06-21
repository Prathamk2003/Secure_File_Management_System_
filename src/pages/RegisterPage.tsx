import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import axios from 'axios';
import { RefreshProvider, useRefresh } from '../context/RefreshContext';
import RefreshButton from '../components/RefreshButton';

const NotificationsContent = () => {
  const { refreshKey, triggerRefresh } = useRefresh();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      alert('Please select a role.');
      return;
    }
    try {
      const response = await axios.post('/api/register', { name, email, password, role });
      setSuccessMessage(response.data.message);
      triggerRefresh();
      // Optionally, navigate to another page after successful registration
      // navigate('/some-page');
    } catch (error) {
      console.error('Registration error:', error);
      alert('An error occurred during registration.');
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

        {/* Right side: Registration form */}
        <div className="flex flex-col justify-center items-center w-full md:w-1/2 bg-blue-50">
          <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
            <h1 className="text-4xl font-bold text-blue-900 mb-2 text-center">Gabriel</h1>
            <h2 className="text-xl font-semibold text-gray-700 mb-8 text-center">Create a new account</h2>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="sr-only">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-4"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
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
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-4"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Role Selection Dropdown */}
              <div>
                <label htmlFor="role" className="sr-only">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-4"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="User">User</option>
                  <option value="super-admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
              >
                Sign up
              </button>
            </form>
            {successMessage && (
              <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
                <p className="text-sm font-medium">{successMessage}</p>
                <p className="text-sm mt-2">
                  You can now <Link to="/login" className="font-semibold text-green-800 hover:underline">Sign in</Link>.
                </p>
              </div>
            )}
            <div className="text-center mt-8">
              <span className="text-gray-600">Already have an account? </span>
              <Link to="/login" className="font-medium text-blue-700 hover:underline">
                Sign in
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