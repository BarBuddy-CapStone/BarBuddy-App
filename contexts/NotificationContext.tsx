import React, { createContext, useEffect, useState } from 'react';
import { Notification, notificationService } from '@/services/notification';
import { signalRService } from '@/services/notification-signalr';

interface NotificationContextData {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  fetchNotifications: (pageNumber?: number) => Promise<Notification[]>;
  clearNotifications: () => void;
}

export const NotificationContext = createContext<NotificationContextData>({
  notifications: [],
  setNotifications: () => {},
  fetchNotifications: async () => [],
  clearNotifications: () => {},
});

interface NotificationProviderProps {
  children: React.ReactNode;
  isGuest: boolean;
  userId?: string;
}

export const NotificationProvider = ({ children, isGuest, userId }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const clearNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    const initializeNotifications = async () => {
      if (!isGuest && userId) {
        clearNotifications();

        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchNotifications();
        setIsInitialized(true);
      } else {
        clearNotifications();
      }
    };

    initializeNotifications();
  }, [isGuest, userId]);

  useEffect(() => {
    let isMounted = true;

    const setupSignalR = async () => {
      if (!isGuest && userId && isInitialized) {
        await signalRService.connect();

        signalRService.setNotificationCallback((newNotification: Notification) => {
          if (isMounted) {
            setNotifications(prevNotifications => {
              const exists = prevNotifications.some(n => n.id === newNotification.id);
              if (exists) {
                return prevNotifications.map(notification => 
                  notification.id === newNotification.id ? newNotification : notification
                );
              } else {
                return [newNotification, ...prevNotifications];
              }
            });
          }
        });

        signalRService.setReconnectedCallback(async () => {
          try {
            await notificationService.getUnreadCount();
            await fetchNotifications();
          } catch (error) {
            console.error('Lỗi khi fetch notifications sau khi kết nối lại:', error);
          }
        });

        await notificationService.getUnreadCount();
      }
    };

    setupSignalR();

    return () => {
      isMounted = false;
      if (!isGuest && userId) {
        signalRService.disconnect();
      }
    };
  }, [isGuest, userId, isInitialized]);

  const fetchNotifications = async (pageNumber: number = 1) => {
    if (isGuest || !userId) {
      return [];
    }

    try {
      const data = await notificationService.getNotifications(pageNumber);
      
      if (pageNumber === 1) {
        setNotifications(data);
      } else {
        setNotifications(prev => {
          const newNotifications = [...prev];
          data.forEach((notification: Notification) => {
            if (!newNotifications.some(n => n.id === notification.id)) {
              newNotifications.push(notification);
            }
          });
          return newNotifications;
        });
      }
      return data;
    } catch (error) {
      console.error('Lỗi khi lấy notifications:', error);
      return [];
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      setNotifications, 
      fetchNotifications,
      clearNotifications 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}; 