import React, { createContext, useEffect, useState } from 'react';
import { Notification, notificationService } from '@/services/notification';
import { signalRService } from '@/services/signalr';

interface NotificationContextData {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  fetchNotifications: (pageNumber?: number) => Promise<Notification[]>;
}

export const NotificationContext = createContext<NotificationContextData>({
  notifications: [],
  setNotifications: () => {},
  fetchNotifications: async () => [],
});

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const setupSignalR = async () => {
      console.log('Global SignalR: Bắt đầu kết nối SignalR...');
      await signalRService.connect();

      signalRService.setNotificationCallback((newNotification: Notification) => {
        console.log('Global SignalR: Nhận notification mới:', newNotification);
        setNotifications(prevNotifications => {
          const exists = prevNotifications.some(n => n.id === newNotification.id);
          if (exists) {
            // Cập nhật thông báo đã tồn tại
            return prevNotifications.map(notification => 
              notification.id === newNotification.id ? newNotification : notification
            );
          } else {
            // Thêm thông báo mới vào đầu danh sách
            return [newNotification, ...prevNotifications];
          }
        });
      });
    };

    setupSignalR();
    
    // Reset unread count khi vào ứng dụng
    notificationService.getUnreadCount();

    return () => {
      console.log('Global SignalR: Cleanup SignalR connection...');
      signalRService.disconnect();
    };
  }, []);

  const fetchNotifications = async (pageNumber: number = 1) => {
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
    <NotificationContext.Provider value={{ notifications, setNotifications, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}; 