import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import api from './api';
import { PermissionsAndroid } from 'react-native';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: number;
  imageUrl: string | null;
  deepLink: string;
  barName: string | null;
  isPublic: boolean;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

class NotificationService {
  async registerForPushNotificationsAsync() {
    try {
      if (Platform.OS === 'android') {
        // Kiểm tra phiên bản Android
        if (Platform.Version >= 33) { // Android 13 trở lên
          const permission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: "Yêu cầu quyền thông báo",
              message: "Ứng dụng cần quyền thông báo để gửi các thông báo quan trọng đến bạn",
              buttonNeutral: "Hỏi lại sau",
              buttonNegative: "Từ chối",
              buttonPositive: "Đồng ý"
            }
          );
          
          if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
            return null;
          }
        }
      }

      const fcmToken = await messaging().getToken();
      console.log('FCM Token:', fcmToken);
      return fcmToken;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  setupMessageListeners() {
    messaging().onMessage(async remoteMessage => {
      console.log('Received foreground message:', remoteMessage);
    });

    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened app from background:', remoteMessage);
    });

    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('Notification opened app from quit state:', remoteMessage);
      }
    });
  }

  async getPublicNotifications(pageNumber: number = 1) {
    try {
      const fcmToken = await messaging().getToken();
      const response = await api.get(
        `/api/Fcm/notifications/public?deviceToken=${fcmToken}&page=${pageNumber}`
      );
      
      if (response.data.statusCode === 200) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Lỗi khi lấy thông báo:', error);
      return [];
    }
  }
}

export const notificationService = new NotificationService(); 