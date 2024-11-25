import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import api from './api';
import { PermissionsAndroid } from 'react-native';
import { handleConnectionError } from '@/utils/error-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    });

    messaging().onNotificationOpenedApp(remoteMessage => {
    });

    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
      }
    });
  }

  async getNotifications(pageNumber: number = 1) {
    return handleConnectionError(async () => {
      try {
        const fcmToken = await messaging().getToken();
        if (!fcmToken) {
          console.error('Không thể lấy FCM token');
          return [];
        }

        // Lấy auth data từ AsyncStorage
        const authData = await AsyncStorage.getItem('@auth');
        const headers: any = {};
        
        if (authData) {
          const userData = JSON.parse(authData);
          if (userData?.user?.accessToken) {
            headers['Authorization'] = `Bearer ${userData.user.accessToken}`;
          }
        }

        const response = await api.get(
          `/api/Fcm/notifications?deviceToken=${fcmToken}&page=${pageNumber}`,
          { headers }
        );
        
        if (response.data.statusCode === 200) {
          return response.data.data;
        }
        return [];
      } catch (error) {
        console.error('Lỗi khi lấy thông báo:', error);
        return [];
      }
    }, 'Không thể tải thông báo. Vui lòng thử lại sau.');
  }

  async getUnreadCount(): Promise<number> {
    return handleConnectionError(async () => {
      try {
        const fcmToken = await messaging().getToken();
        
        if (!fcmToken) {
          console.log('Không thể lấy FCM token');
          return 0;
        }

        // Lấy auth data từ AsyncStorage
        const authData = await AsyncStorage.getItem('@auth');
        const headers: any = {};
        
        if (authData) {
          const userData = JSON.parse(authData);
          if (userData?.user?.accessToken) {
            headers['Authorization'] = `Bearer ${userData.user.accessToken}`;
          }
        }

        const response = await api.get(
          `/api/Fcm/unread-count?deviceToken=${fcmToken}`,
          { headers }
        );
        
        if (response.data.statusCode === 200) {
          return response.data.data;
        }
        return 0;
      } catch (error) {
        console.log('Lỗi khi lấy số thông báo chưa đọc:', error);
        return 0;
      }
    }, 'Không thể tải số thông báo chưa đọc');
  }
}

export const notificationService = new NotificationService(); 