import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRefresh } from './RefreshContext'; // Import useRefresh

// 1. Define the context type
interface Notification {
  id: string;
  message: string;
  time: string;
  fileName?: string;
  uploaderId?: string;
  status?: string;
  type?: string;
  visited: boolean;
}
interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  login: (email: string, password: string, mfaToken?: string) => Promise<void>;
  logout: () => void;
  notifications: Notification[];
  clearNotifications: () => void;
  updateNotificationStatus: (notificationId: string, visited: boolean) => Promise<void>;
  unreadNotificationCount: number;
}

// 2. Create the context with the correct type
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. AuthProvider implementation
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem('userId'));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const { refreshKey } = useRefresh();

  console.log('AuthContext refreshKey:', refreshKey);

  useEffect(() => {
    if (userId) {
      setIsAuthenticated(true);
    }
  }, [userId]);

  // Fetch notifications from backend
  useEffect(() => {
    console.log('AuthContext: Fetching notifications due to refreshKey change.', refreshKey);
    fetch('/api/notifications')
      .then(res => res.json())
      .then((data) => {
        setNotifications(data);
        setUnreadNotificationCount(data.filter((n: Notification) => !n.visited).length);
      });
  }, [refreshKey]); // Add refreshKey to dependency array

  const clearNotifications = () => {
    fetch('/api/notifications/clear', { method: 'POST' })
      .then(() => {
        setNotifications([]);
        setUnreadNotificationCount(0);
      });
  };

  const updateNotificationStatus = async (notificationId: string, visited: boolean) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visited }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification status');
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, visited } : n
        )
      );

      if (visited) {
        setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
      } else {
        setUnreadNotificationCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error updating notification status:', error);
    }
  };

  // Dummy login/logout for example; replace with your real logic
  const login = async (email: string, password: string, mfaToken?: string) => {
    // Example: Call your backend login API and get the user ID
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, mfaToken }),
    });
    if (!response.ok) throw new Error('Login failed');
    const data = await response.json();
    setIsAuthenticated(true);
    setUserId(data.userId);
    localStorage.setItem('userId', data.userId); // Persist userId
  };
  const logout = () => {
    setIsAuthenticated(false);
    setUserId(null);
    localStorage.removeItem('userId'); // Clear userId on logout
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      userId,
      login,
      logout,
      notifications,
      clearNotifications,
      updateNotificationStatus,
      unreadNotificationCount
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// 4. Custom hook with error if used outside provider
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};