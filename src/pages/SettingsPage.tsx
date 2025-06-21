import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const SettingsPage: React.FC = () => {
  const { userId } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [userName, setUserName] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);

  useEffect(() => {
    const fetchUserName = async () => {
      if (userId) {
        try {
          const response = await fetch(`/api/users/${userId}`);
          if (response.ok) {
            const data = await response.json();
            setUserName(data.name);
          } else {
            console.error('Failed to fetch user name');
          }
        } catch (error) {
          console.error('Error fetching user name:', error);
        }
      }
    };

    fetchUserName();
  }, [userId]);

  const handleNotificationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotificationsEnabled(e.target.checked);
    // In a real application, you would save this setting to a backend or local storage
    console.log('Notifications enabled:', e.target.checked);
  };

  const handleMfaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMfaEnabled(e.target.checked);
    console.log('MFA enabled:', e.target.checked);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Settings</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        This is where you can configure various application settings.
        Features such as user preferences, notifications, and security options will be available here.
      </p>

      <div className="space-y-6">
        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <label htmlFor="dark-mode-toggle" className="text-lg font-medium text-gray-700 dark:text-gray-200">Dark Mode</label>
          <input
            type="checkbox"
            id="dark-mode-toggle"
            checked={isDarkMode}
            onChange={toggleDarkMode}
            className="toggle toggle-primary"
          />
        </div>

        {/* Notification Settings */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <label htmlFor="notifications-toggle" className="text-lg font-medium text-gray-700 dark:text-gray-200">Enable Notifications</label>
          <input
            type="checkbox"
            id="notifications-toggle"
            checked={notificationsEnabled}
            onChange={handleNotificationsChange}
            className="toggle toggle-primary"
          />
        </div>

        {/* User Name Setting */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <label htmlFor="user-name-input" className="block text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">User Name</label>
          <input
            type="text"
            id="user-name-input"
            value={userName}
            readOnly
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* MFA Setting */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <label htmlFor="mfa-toggle" className="text-lg font-medium text-gray-700 dark:text-gray-200">Enable Multi-Factor Authentication (MFA)</label>
          <input
            type="checkbox"
            id="mfa-toggle"
            checked={mfaEnabled}
            onChange={handleMfaChange}
            className="toggle toggle-primary"
          />
        </div>

        {/* Add more settings sections as needed */}

      </div>
    </div>
  );
};

export default SettingsPage; 