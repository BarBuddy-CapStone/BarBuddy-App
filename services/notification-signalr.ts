import { HttpTransportType, HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_CONFIG } from '@/config/api';
import messaging from '@react-native-firebase/messaging';
import { Notification } from '@/services/notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

interface SignalRNotification {
  id: string;
  title: string;
  message: string;
  type: number;
  imageUrl: string | null;
  mobileDeepLink: string;
  webDeepLink: string;
  barId: string | null;
  isPublic: boolean;
  isRead: boolean;
  readAt: string | null;
  timestamp: string; // Thay vì createdAt
}

class SignalRService {
  private connection: HubConnection | null = null;
  private notificationCallback: ((notification: Notification) => void) | null = null;
  private unreadCountCallback: ((count: number) => void) | null = null;
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private maxRetryAttempts: number = 10;
  private currentRetryCount: number = 0;
  private reconnectedCallback: (() => void) | null = null;

  constructor() {
    // Theo dõi trạng thái của ứng dụng
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // Khi app trở lại foreground
      await this.reconnect();
    } else if (nextAppState === 'background') {
      // Kiểm tra và kết nối lại nếu cần khi app vào background
      if (this.connection?.state !== 'Connected') {
        await this.reconnect();
      }
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
        await this.reconnect();
      }
    }, delay);
  }

  async connect() {
    if (this.isConnecting) {
      return;
    }

    if (this.connection?.state === 'Connected') {
      return;
    }

    this.isConnecting = true;

    try {
      let accountId = null;
      try {
        const authData = await AsyncStorage.getItem('@auth');
        if (authData) {
          const userData = JSON.parse(authData);
          accountId = userData?.user?.accountId;
          
          // Nếu không có accountId, không kết nối
          if (!accountId) {
            return;
          }
        } else {
          // Nếu không có auth data, không kết nối
          return;
        }
      } catch (error) {
        return;
      }

      // Ngắt kết nối cũ nếu có
      if (this.connection) {
        await this.disconnect();
      }

      const hubUrl = `${API_CONFIG.BASE_URL}/notificationHub?accountId=${accountId}`;

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
      this.currentRetryCount = 0; // Reset retry count sau khi kết nối thành công

    } catch (error) {
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
      await this.reconnect();
    });

    this.connection.onreconnecting((error) => {
    });

    this.connection.onreconnected(async (connectionId) => {
      this.currentRetryCount = 0;
      
      try {
        await this.connection?.invoke('RequestUnreadCount');
      } catch (error) {
      }

      // Gọi callback khi kết nối lại thành công
      if (this.reconnectedCallback) {
        this.reconnectedCallback();
      }
    });

    this.connection.on('ReceiveNotification', (notification: SignalRNotification) => {
      
      // Chuyển đổi từ SignalRNotification sang Notification
      const normalizedNotification = {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        imageUrl: notification.imageUrl,
        mobileDeepLink: notification.mobileDeepLink,
        webDeepLink: notification.webDeepLink,
        barName: null, // Vì API mới không có trường này
        isPublic: notification.isPublic,
        isRead: notification.isRead,
        readAt: notification.readAt,
        createdAt: notification.timestamp,
        deepLink: notification.mobileDeepLink // Thêm để tương thích với code cũ
      };

      if (this.notificationCallback) {
        this.notificationCallback(normalizedNotification);
      }
    });

    this.connection.on('ReceiveUnreadCount', (count: number) => {
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

  setReconnectedCallback(callback: () => void) {
    this.reconnectedCallback = callback;
  }

  async disconnect() {
    this.clearReconnectTimer();
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (error) {
      } finally {
        this.connection = null;
      }
    }
  }
}

export const signalRService = new SignalRService();
