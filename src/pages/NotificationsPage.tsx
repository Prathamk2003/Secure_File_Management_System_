import React, { useEffect, useState } from "react";
import { useRefresh } from '../context/RefreshContext';
import { useAuth } from '../context/AuthContext';

const getCleanFileName = (fileName: string) => {
  return fileName.replace(/[^a-zA-Z.\-\s]/g, '');
};

const NotificationsContent = () => {
  const { notifications: contextNotifications, clearNotifications, userId, updateNotificationStatus } = useAuth();
  const { refreshKey, triggerRefresh } = useRefresh();
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({});
  const [notifications, setNotifications] = useState<any[]>(contextNotifications || []);
  const [notificationCount, setNotificationCount] = useState<number>(
    (contextNotifications || []).filter((n: any) => !n.visited).length
  );

  useEffect(() => {
    setNotifications(contextNotifications || []);
    setNotificationCount((contextNotifications || []).filter((n: any) => !n.visited).length);
  }, [contextNotifications]);

  const handleNotificationClick = async (notificationId: string) => {
    console.log('Notification clicked, ID:', notificationId);
    try {
      await updateNotificationStatus(notificationId, true);
      triggerRefresh(); // Refresh the notifications to update the UI
    } catch (error) {
      console.error('Error marking notification as visited:', error);
    }
  };

  // Extract user IDs from notifications
  const userIds = React.useMemo(() => {
    const ids = Array.from(
      new Set(
        notifications
          .map((n: any) => {
            if (n.uploaderId) {
              return n.uploaderId;
            }
            // Try to match file upload message
            const uploadMatch = n.message.match(/File uploaded: (.*?) by user ([^\s]+)/);
            if (uploadMatch) {
              return uploadMatch[2];
            }
            // Try to match file deletion message (assuming similar format)
            const deleteMatch = n.message.match(/File deleted: (.*)/);
            if (deleteMatch) {
              // For deletion, if no user ID is in the message, use the current logged-in userId
              return userId; // Use the current logged-in userId
            }
            return null;
          })
          .filter(Boolean)
      )
    );
    return ids;
  }, [notifications, userId]);

  // Fetch user names for all user IDs
  useEffect(() => {
    const fetchUserNames = async () => {
      const names: { [key: string]: string } = {};
      await Promise.all(
        userIds.map(async (id) => {
          try {
            const res = await fetch(`/api/users/${id}`);
            const data = await res.json();
            names[id] = data.name || data.user?.name || id;
          } catch {
            names[id] = id;
          }
        })
      );
      setUserNames(names);
    };
    if (userIds.length > 0) fetchUserNames();
  }, [userIds]);

  useEffect(() => {
    // Fetch notifications here
    fetch('/api/notifications')
      .then(res => res.json())
      .then((data: any[]) => {
        setNotifications(data);
        setNotificationCount(data.filter(n => !n.visited).length);
      });
  }, [refreshKey, setNotifications, setNotificationCount]);

  const now = new Date();
  const parseNotification = (n: any) => {
    let extractedFileName = n.fileName || null;
    let extractedUploaderId = n.uploaderId || null;
    let notificationType = n.type || 'generic';
    const status = n.status || 'Loading';
    let displayMessage = n.message || '';

    // If fileName or uploaderId are not directly provided, try to parse from the message
    const uploadMatch = n.message.match(/File uploaded: (.*?) by user ([^\s]+)/);
    const deleteMatch = n.message.match(/File deleted: (.*)/);

    if (uploadMatch) {
      if (!extractedFileName) extractedFileName = uploadMatch[1];
      if (!extractedUploaderId) extractedUploaderId = uploadMatch[2];
      notificationType = 'file_upload';
    } else if (deleteMatch) {
      if (!extractedFileName) extractedFileName = deleteMatch[1];
      // If no uploaderId is provided, use the current logged-in userId
      if (!extractedUploaderId) extractedUploaderId = userId;
      notificationType = 'file_delete';
    }

    const finalFileName = extractedFileName || 'Unknown';
    const finalUploaderId = extractedUploaderId || 'Unknown';
    const userNameDisplay = userNames[finalUploaderId] || (finalUploaderId !== 'Unknown' ? 'Loading...' : 'Unknown');

    const parsed = {
      id: n._id,
      fileName: finalFileName,
      uploaderId: finalUploaderId,
      userName: userNameDisplay,
      message: displayMessage,
      time: n.timestamp,
      visited: n.visited || false,
      type: notificationType,
      status: status,
    };
    return parsed;
  };

  const filteredNotifications = notifications
    .filter((n: any) => {
      const notifDate = new Date(n.timestamp);
      return (now.getTime() - notifDate.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    })
    .map(parseNotification);

  const visited = filteredNotifications.filter((n: any) => n.visited);
  const notVisited = filteredNotifications.filter((n: any) => !n.visited);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h1>
      <button
        onClick={clearNotifications}
        className="mb-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Clear All Notifications
      </button>
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold text-blue-700 mb-2">Not Visited</h2>
          {notVisited.length > 0 ? notVisited.map((notification: any) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification.id)}
              className="border rounded-lg shadow-sm p-4 bg-blue-100 border-blue-300 cursor-pointer"
            >
              <p className="text-sm font-medium text-gray-900">
                {notification.userName} - {getCleanFileName(notification.fileName)}
              </p>
              {notification.type === 'file_upload' && (
                <p className="text-xs text-gray-500">
                  File uploaded: {getCleanFileName(notification.fileName)} by user {notification.userName}
                </p>
              )}
              {notification.type === 'file_delete' && (
                <p className="text-xs text-gray-500">
                  File deleted: {getCleanFileName(notification.fileName)} by user {notification.userName}
                </p>
              )}
              <p className="text-xs text-gray-400">
                {new Date(notification.time).toLocaleString()}
              </p>
            </div>
          )) : <p className="text-gray-600">No new notifications.</p>}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Visited</h2>
          {visited.length > 0 ? visited.map((notification: any) => (
            <div
              key={notification.id}
              className="border rounded-lg shadow-sm p-4 bg-green-100 border-green-300"
            >
              <p className="text-sm font-medium text-gray-900">
                {notification.userName} - {getCleanFileName(notification.fileName)}
              </p>
              {notification.type === 'file_upload' && (
                <p className="text-xs text-gray-500">
                  File uploaded: {getCleanFileName(notification.fileName)} by user {notification.userName}
                </p>
              )}
              {notification.type === 'file_delete' && (
                <p className="text-xs text-gray-500">
                  File deleted: {getCleanFileName(notification.fileName)} by user {notification.userName}
                </p>
              )}
              <p className="text-xs text-gray-400">
                {new Date(notification.time).toLocaleString()}
              </p>
            </div>
          )) : <p className="text-gray-600">No visited notifications.</p>}
        </div>
      </div>
    </div>
  );
};

export default NotificationsContent;