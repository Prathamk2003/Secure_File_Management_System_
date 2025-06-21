import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface Notification {
  id: number;
  message: string;
  time: string;
  type: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  userRole: string | null;
  login: (userId: string, userRole: string, successMessage?: string) => void;
  logout: () => Promise<void>;
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
  removeNotification: (notificationId: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Placeholder for files data needed for notification simulation
  // In a real app, this data might come from an API or another context
  const files = [
    { name: 'Financial_Report_Q4_2024.pdf' },
    { name: 'Employee_Handbook_v3.2.docx' },
    { name: 'Marketing_Strategy_2025.pptx' },
    { name: 'Database_Backup_Dec2024.zip' }
  ];

  // Real-time notifications simulation (moved from SecureFileManager)
  useEffect(() => {
    // Removed the setInterval simulation for notifications
    // const interval = setInterval(() => {
    //   const newNotification: Notification = {
    //     id: Date.now(),
    //     message: `File accessed: ${files[Math.floor(Math.random() * files.length)].name}`,
    //     time: new Date().toLocaleTimeString(),
    //     type: 'info'
    //   };
    //   setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    // }, 10000);

    // return () => clearInterval(interval);
  }, [files]); // Depend on files placeholder

  // Check for remember me token on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log('AuthContext useEffect: Checking auth status...'); // Debug log - start of check
        const response = await fetch('/api/auth/status', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        console.log('AuthContext useEffect: Auth status response status:', response.status); // Debug log - response status

        if (response.ok) {
          const data = await response.json();
          console.log('AuthContext useEffect: Auth status response data:', data); // Debug log - response data
          if (data.isAuthenticated) {
            console.log('AuthContext useEffect: User is authenticated, setting state.'); // Debug log - authenticated
            setIsAuthenticated(true);
            setUserId(data.userId);
            setUserRole(data.role);
          } else {
            console.log('AuthContext useEffect: User not authenticated based on response.'); // Debug log - not authenticated
            setIsAuthenticated(false);
            setUserId(null);
            setUserRole(null);
          }
        } else {
          console.log('AuthContext useEffect: Auth status check failed with status:', response.status); // Debug log - failed status
          setIsAuthenticated(false);
          setUserId(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('AuthContext useEffect: Error checking auth status:', error); // Debug log - error
        setIsAuthenticated(false);
        setUserId(null);
        setUserRole(null);
      }
    };

    console.log('AuthContext useEffect: Running auth status check on mount.'); // Debug log - effect triggered
    checkAuthStatus();
  }, []); // Empty dependency array ensures this runs only once on component mount

  const login = (userId: string, userRole: string, successMessage?: string) => {
    setIsAuthenticated(true);
    setUserId(userId);
    setUserRole(userRole);

    if (successMessage) {
      addNotification({
        id: Date.now(),
        message: successMessage,
        time: new Date().toLocaleTimeString(),
        type: 'success'
      });
    }
  };

  const logout = async () => {
    try {
      // Call the logout endpoint to clear the remember me token
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include', // Important: This ensures cookies are sent with the request
      });

      // Clear local state
      setIsAuthenticated(false);
      setUserId(null);
      setUserRole(null);
      setNotifications([]);
    } catch (error) {
      console.error('Error during logout:', error);
      // Still clear local state even if the server request fails
      setIsAuthenticated(false);
      setUserId(null);
      setUserRole(null);
      setNotifications([]);
    }
  };

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Limit to 5 notifications
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const removeNotification = (notificationId: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        userId, 
        userRole,
        login, 
        logout, 
        notifications, 
        addNotification, 
        clearNotifications, 
        removeNotification 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 