import React from 'react';
import { useAuth } from '../context/AuthContext';

const NotificationsPage = () => {
  const { notifications, clearNotifications } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h1>
      <button 
        onClick={clearNotifications}
        className="mb-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Clear All Notifications
      </button>
      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <div key={notification.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <p className="text-sm font-medium text-gray-900">{notification.message}</p>
              <p className="text-xs text-gray-500">{notification.time}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-600">No new notifications.</p>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage; 