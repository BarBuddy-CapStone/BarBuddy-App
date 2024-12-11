import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import PushNotification, { Importance } from 'react-native-push-notification';
import api from './api';
import { PermissionsAndroid } from 'react-native';
import { handleConnectionError } from '@/utils/error-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

interface NotificationData {
  deepLink?: string;
  notificationId?: string;
  barId?: string;
  type?: string;
  [key: string]: any;
}

interface LocalNotification {
  userInfo?: NotificationData;
  data?: NotificationData;
  [key: string]: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: number;
  imageUrl: string | null;
  mobileDeepLink: string;
  webDeepLink: string;
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
      onNotification: (notification: LocalNotification) => {
        console.log('Local notification clicked:', notification);
        
        // Chỉ xử lý deeplink khi notification được click (không phải khi vừa nhận)
        if (notification.userInteraction === true) {
          const notificationData = notification.data || notification.userInfo;
          if (notificationData?.deepLink) {
            console.log('Deep link from notification click:', notificationData.deepLink);
            this.handleDeepLink(notificationData.deepLink);
          }
        }
      },
      popInitialNotification: true,
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
      console.log('Received foreground message:', JSON.stringify(remoteMessage, null, 2));
      // Chỉ hiển thị notification, không tự động mở deeplink
      this.showLocalNotification(remoteMessage);
    });

    // Xử lý khi nhấn vào thông báo khi app ở background
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened from background state:', JSON.stringify(remoteMessage, null, 2));
      console.log('Deep link from background:', remoteMessage.data?.deepLink);
      // Chỉ xử lý deeplink khi người dùng click vào notification
      if (remoteMessage.data?.deepLink) {
        this.handleDeepLink(remoteMessage.data.deepLink as any);
      }
    });

    // Xử lý khi nhấn vào thông báo khi app đã đóng
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('Notification opened from quit state:', JSON.stringify(remoteMessage, null, 2));
        console.log('Deep link from quit state:', remoteMessage.data?.deepLink);
        // Chỉ xử lý deeplink khi người dùng click vào notification
        if (remoteMessage.data?.deepLink) {
          this.handleDeepLink(remoteMessage.data.deepLink as any);
        }
      }
    });
  }

  // Thêm hàm mới để xử lý deeplink
  private handleDeepLink(url: string) {
    try {
      // Kiểm tra nếu url bắt đầu bằng scheme của app
      if (url.startsWith('com.fptu.barbuddy://')) {
        // Lấy phần path sau scheme
        const path = url.replace('com.fptu.barbuddy://', '');
        console.log('Handling deep link path:', path);
        
        // Thêm timeout ngắn để đảm bảo app đã mở hoàn toàn
        setTimeout(() => {
          router.push('/' + path as any);
        }, 1000);
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  }

  // Đổi tên để rõ ràng hơn
  private showLocalNotification(remoteMessage: any) {
    console.log('Showing local notification:', JSON.stringify(remoteMessage, null, 2));
    
    const notificationData = {
      ...remoteMessage.data,
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
    };

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
      userInfo: notificationData,
      largeIcon: "ic_launcher",
      smallIcon: "ic_notification",
      bigText: remoteMessage.notification?.body || '',
      subText: remoteMessage.notification?.title,
      color: "#EAB308",
      ongoing: false,
      ignoreInForeground: false,
      invokeApp: true,
      tag: remoteMessage.messageId,
      id: Math.floor(Math.random() * 1000000),
    });
  }

  // Các phương thức khác giữ nguyên
  async getNotifications(pageNumber: number = 1) {
    try {
      const authData = await AsyncStorage.getItem('@auth');
      if (!authData) {
        console.log('Không có dữ liệu xác thực');
        return [];
      }

      const userData = JSON.parse(authData);
      if (!userData?.user?.accessToken) {
        console.log('Không có access token');
        return [];
      }

      const headers = {
        'Authorization': `Bearer ${userData.user.accessToken}`
      };

      const response = await api.get(
        `/api/Fcm/notifications?page=${pageNumber}`,
        { headers }
      );
      
      if (response.data.statusCode === 200) {
        return response.data.data.map((notification: any) => ({
          ...notification,
          deepLink: notification.mobileDeepLink
        }));
      }

      throw new Error(response.data.message);
    } catch (error: any) {
      console.log('Lỗi chi tiết:', error);
      // Nếu là lỗi từ response của API
      if (error.response) {
        throw new Error(error.response.data.message);
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể tải thông báo. Vui lòng thử lại sau.'
      );
    }
  }

  async resetBadgeCount() {
    if (Platform.OS === 'ios') {
      PushNotification.setApplicationIconBadgeNumber(0);
    }
    // Có thể thêm logic reset badge cho Android nếu cần
  }

  async getUnreadCount(): Promise<number> {
    try {
      const authData = await AsyncStorage.getItem('@auth');
      if (!authData) return 0;
      
      const userData = JSON.parse(authData);
      if (!userData?.user?.accessToken) return 0;

      const response = await api.get(
        `/api/Fcm/unread-count`,
        { 
          headers: {
            'Authorization': `Bearer ${userData.user.accessToken}`
          }
        }
      );
      
      if (response.data.statusCode === 200) {
        const count = response.data.data;
        if (Platform.OS === 'ios') {
          PushNotification.setApplicationIconBadgeNumber(count);
        }
        return count;
      }

      throw new Error(response.data.message);
    } catch (error: any) {
      // Nếu là lỗi từ response của API
      if (error.response) {
        throw new Error(error.response.data.message);
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể tải số thông báo chưa đọc'
      );
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const fcmToken = await messaging().getToken();
      if (!fcmToken) {
        throw new Error('Không thể lấy FCM token');
      }

      const authData = await AsyncStorage.getItem('@auth');
      const headers: any = {};
      if (authData) {
        const userData = JSON.parse(authData);
        if (userData?.user?.accessToken) {
          headers['Authorization'] = `Bearer ${userData.user.accessToken}`;
        }
      }

      const response = await api.patch(
        `/api/Fcm/notification/${notificationId}/mark-as-read?deviceToken=${fcmToken}`,
        null,
        { headers }
      );

      if (response.data.statusCode === 200) {
        return true;
      }

      throw new Error(response.data.message);
    } catch (error: any) {
      // Nếu là lỗi từ response của API
      if (error.response) {
        throw new Error(error.response.data.message);
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể đánh dấu thông báo đã đọc. Vui lòng thử lại sau.'
      );
    }
  }

  async markAllAsRead(): Promise<boolean> {
    try {
      const fcmToken = await messaging().getToken();
      if (!fcmToken) {
        throw new Error('Không thể lấy FCM token');
      }

      const authData = await AsyncStorage.getItem('@auth');
      const headers: any = {};
      if (authData) {
        const userData = JSON.parse(authData);
        if (userData?.user?.accessToken) {
          headers['Authorization'] = `Bearer ${userData.user.accessToken}`;
        }
      }

      const response = await api.patch(
        `/api/Fcm/notifications/mark-all-as-read?deviceToken=${fcmToken}`,
        null,
        { headers }
      );

      if (response.data.statusCode === 200) {
        return true;
      }

      throw new Error(response.data.message);
    } catch (error: any) {
      // Nếu là lỗi từ response của API
      if (error.response) {
        throw new Error(error.response.data.message);
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể đánh dấu tất cả thông báo đã đọc. Vui lòng thử lại sau.'
      );
    }
  }
}

export const notificationService = new NotificationService(); 