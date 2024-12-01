import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import PushNotification, { Importance } from 'react-native-push-notification';
import api from './api';
import { PermissionsAndroid } from 'react-native';
import { handleConnectionError } from '@/utils/error-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

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
  constructor() {
    this.createDefaultChannels();
    this.configurePushNotification();
  }

  createDefaultChannels() {
    // Tạo channel với độ ưu tiên cao nhất để hiển thị pop-up
    PushNotification.createChannel(
      {
        channelId: "default",
        channelName: "Default",
        channelDescription: "Default notifications channel",
        playSound: true,
        soundName: "default",
        importance: Importance.HIGH,
        vibrate: true,
      },
      (created: boolean) => {
        console.log(`Channel 'default' ${created ? 'was created' : 'already exists'}`);
      }
    );
  }

  configurePushNotification() {
    // Cấu hình cơ bản cho PushNotification
    PushNotification.configure({
      onNotification: function (notification) {
        // Không làm gì khi nhấn vào thông báo
      },
      popInitialNotification: false,
      requestPermissions: true,
    });
  }

  async registerForPushNotificationsAsync() {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
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
    // Xử lý thông báo khi app đang mở (foreground)
    messaging().onMessage(async remoteMessage => {
      console.log('Received foreground message:', remoteMessage);
      this.showNotification(remoteMessage);
    });

    // Xử lý khi nhấn vào thông báo khi app ở background
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened from background state:', remoteMessage);
      if (remoteMessage.data?.deepLink) {
        router.push(remoteMessage.data.deepLink as any);
      }
    });

    // Xử lý khi nhấn vào thông báo khi app đã đóng
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('Notification opened from quit state:', remoteMessage);
        if (remoteMessage.data?.deepLink) {
          router.push(remoteMessage.data.deepLink as any);
        }
      }
    });
  }

  // Hàm chung để hiển thị thông báo
  showNotification(remoteMessage: any) {
    PushNotification.localNotification({
      channelId: 'default',
      title: remoteMessage.notification?.title,
      message: remoteMessage.notification?.body || '',
      playSound: true,
      soundName: 'default',
      priority: 'max',
      importance: 'high',
      vibrate: true,
      visibility: 'public',
      autoCancel: true,
    });
  }

  // Các phương thức khác giữ nguyên
  async getNotifications(pageNumber: number = 1) {
    return handleConnectionError(async () => {
      try {
        const fcmToken = await messaging().getToken();
        if (!fcmToken) {
          console.error('Không thể lấy FCM token');
          return [];
        }

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