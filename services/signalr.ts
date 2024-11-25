import { HttpTransportType, HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_CONFIG } from '@/config/api';
import messaging from '@react-native-firebase/messaging';
import { Notification } from '@/services/notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SignalRService {
  private connection: HubConnection | null = null;
  private notificationCallback: ((notification: Notification) => void) | null = null;
  private unreadCountCallback: ((count: number) => void) | null = null;
  private isConnecting: boolean = false;

  async connect() {
    if (this.isConnecting) {
      console.log('Đang trong quá trình kết nối SignalR, bỏ qua yêu cầu mới');
      return;
    }

    this.isConnecting = true;

    try {
      const fcmToken = await messaging().getToken();
      
      if (!fcmToken) {
        console.log('Không thể lấy FCM token để kết nối SignalR');
        return;
      }

      let accountId = null;
      try {
        const authData = await AsyncStorage.getItem('@auth');
        if (authData) {
          const userData = JSON.parse(authData);
          accountId = userData?.user?.accountId || null;
        }
      } catch (error) {
        console.log('Lỗi khi lấy accountId:', error);
      }

      if (!this.connection || this.connection.state === 'Disconnected') {
        const hubUrl = `${API_CONFIG.BASE_URL}/notificationHub?deviceToken=${fcmToken}&accountId=${accountId || ''}`;
        console.log('Connecting to SignalR hub:', hubUrl);

        this.connection = new HubConnectionBuilder()
          .withUrl(hubUrl, {
            transport: HttpTransportType.WebSockets,
            skipNegotiation: true
          })
          .configureLogging(LogLevel.Warning)
          .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: retryContext => {
              if (retryContext.previousRetryCount === 0) return 0;
              if (retryContext.previousRetryCount === 1) return 2000;
              if (retryContext.previousRetryCount === 2) return 10000;
              if (retryContext.previousRetryCount === 3) return 30000;
              if (retryContext.previousRetryCount === 4) return 60000;
              if (retryContext.previousRetryCount === 5) return 120000;
              if (retryContext.previousRetryCount === 6) return 200000;
              if (retryContext.previousRetryCount === 7) return 280000;
              if (retryContext.previousRetryCount === 8) return 360000;
              if (retryContext.previousRetryCount === 9) return 480000;
              if (retryContext.previousRetryCount === 10) return 600000;
              return null;
            }
          })
          .build();

        this.connection.onclose(() => {
          console.log('SignalR Connection closed');
        });

        this.setupEventHandlers();

        try {
          await this.connection.start();
          console.log('SignalR đã kết nối thành công');
        } catch (error) {
          console.log('Không thể kết nối SignalR:', error);
        }
      }
    } catch (error) {
      console.log('Lỗi khi thiết lập kết nối SignalR:', error);
    } finally {
      this.isConnecting = false;
    }
  }

  private setupEventHandlers() {
    if (!this.connection) return;

    this.connection.on("*", (name: string, message: any) => {
      console.log(`Nhận SignalR event '${name}'`);
    });

    this.connection.on('ReceiveNotification', (notification: Notification) => {
      console.log('Nhận notification mới');
      
      const normalizedNotification = {
        ...notification,
        createdAt: notification.createdAt || new Date().toISOString()
      };

      if (this.notificationCallback) {
        this.notificationCallback(normalizedNotification);
      }
    });

    this.connection.onreconnecting(() => {
      console.log('SignalR đang kết nối lại');
    });

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR đã kết nối lại thành công');
    });

    this.connection.on('ReceiveUnreadCount', (count: number) => {
      console.log('Nhận unread count mới:', count);
      if (this.unreadCountCallback) {
        this.unreadCountCallback(count);
      }
    });
  }

  setNotificationCallback(callback: (notification: Notification) => void) {
    this.notificationCallback = callback;
  }

  setUnreadCountCallback(callback: (count: number) => void) {
    this.unreadCountCallback = callback;
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      this.notificationCallback = null;
      this.unreadCountCallback = null;
      console.log('Đã ngắt kết nối SignalR');
    }
  }
}

export const signalRService = new SignalRService();
