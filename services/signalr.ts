import { HttpTransportType, HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_CONFIG } from '@/config/api';
import messaging from '@react-native-firebase/messaging';
import { Notification } from '@/services/notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

class SignalRService {
  private connection: HubConnection | null = null;
  private notificationCallback: ((notification: Notification) => void) | null = null;
  private unreadCountCallback: ((count: number) => void) | null = null;
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private maxRetryAttempts: number = 10;
  private currentRetryCount: number = 0;

  constructor() {
    // Theo dõi trạng thái của ứng dụng
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // Khi app trở lại foreground
      await this.reconnect();
    } else if (nextAppState === 'background') {
      // Khi app vào background
      this.clearReconnectTimer();
      await this.disconnect();
    }
  };

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private getRetryDelay(): number {
    // Exponential backoff với jitter
    const baseDelay = Math.min(1000 * Math.pow(2, this.currentRetryCount), 30000);
    const jitter = Math.random() * 1000;
    return baseDelay + jitter;
  }

  private async reconnect() {
    if (this.isConnecting || (this.connection?.state === 'Connected')) {
      return;
    }

    if (this.currentRetryCount >= this.maxRetryAttempts) {
      console.log('Đã đạt đến số lần thử lại tối đa');
      this.currentRetryCount = 0;
      return;
    }

    this.currentRetryCount++;
    const delay = this.getRetryDelay();

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.log('Lỗi khi thử kết nối lại:', error);
        await this.reconnect();
      }
    }, delay);
  }

  async connect() {
    if (this.isConnecting) {
      console.log('Đang trong quá trình kết nối SignalR, bỏ qua yêu cầu mới');
      return;
    }

    if (this.connection?.state === 'Connected') {
      console.log('SignalR đã được kết nối');
      return;
    }

    this.isConnecting = true;

    try {
      const fcmToken = await messaging().getToken();
      
      if (!fcmToken) {
        throw new Error('Không thể lấy FCM token để kết nối SignalR');
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

      // Ngắt kết nối cũ nếu có
      if (this.connection) {
        await this.disconnect();
      }

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
            return null; // Dừng automatic reconnect sau 5 lần thử
          }
        })
        .build();

      this.setupEventHandlers();

      await this.connection.start();
      console.log('SignalR đã kết nối thành công');
      this.currentRetryCount = 0; // Reset retry count sau khi kết nối thành công

    } catch (error) {
      console.log('Lỗi khi thiết lập kết nối SignalR:', error);
      await this.reconnect();
    } finally {
      this.isConnecting = false;
    }
  }

  private setupEventHandlers() {
    if (!this.connection) return;

    this.connection.off('ReceiveNotification');
    this.connection.off('ReceiveUnreadCount');

    this.connection.onclose(async (error) => {
      console.log('SignalR Connection closed:', error);
      await this.reconnect();
    });

    this.connection.onreconnecting((error) => {
      console.log('SignalR đang kết nối lại:', error);
    });

    this.connection.onreconnected(async (connectionId) => {
      console.log('SignalR đã kết nối lại thành công:', connectionId);
      this.currentRetryCount = 0;
      
      try {
        await this.connection?.invoke('RequestUnreadCount');
      } catch (error) {
        console.log('Lỗi khi yêu cầu unread count mới:', error);
      }
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
    this.clearReconnectTimer();
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log('Đã ngắt kết nối SignalR');
      } catch (error) {
        console.log('Lỗi khi ngắt kết nối SignalR:', error);
      } finally {
        this.connection = null;
      }
    }
  }
}

export const signalRService = new SignalRService();
