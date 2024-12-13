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
      let accountId = null;
      try {
        const authData = await AsyncStorage.getItem('@auth');
        if (authData) {
          const userData = JSON.parse(authData);
          accountId = userData?.user?.accountId;
          
          // Nếu không có accountId, không kết nối
          if (!accountId) {
            console.log('Không có accountId, bỏ qua kết nối SignalR');
            return;
          }
        } else {
          // Nếu không có auth data, không kết nối
          console.log('Chưa đăng nhập, bỏ qua kết nối SignalR');
          return;
        }
      } catch (error) {
        console.log('Lỗi khi lấy accountId:', error);
        return;
      }

      // Ngắt kết nối cũ nếu có
      if (this.connection) {
        await this.disconnect();
      }

      const hubUrl = `${API_CONFIG.BASE_URL}/notificationHub?accountId=${accountId}`;
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
      console.log('SignalR đang kết n���i lại:', error);
    });

    this.connection.onreconnected(async (connectionId) => {
      console.log('SignalR đã kết nối lại thành công:', connectionId);
      this.currentRetryCount = 0;
      
      try {
        await this.connection?.invoke('RequestUnreadCount');
      } catch (error) {
        console.log('Lỗi khi yêu cầu unread count mới:', error);
      }

      // Gọi callback khi kết nối lại thành công
      if (this.reconnectedCallback) {
        this.reconnectedCallback();
      }
    });

    this.connection.on('ReceiveNotification', (notification: SignalRNotification) => {
      console.log('Nhận notification mới', notification);
      
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

  setReconnectedCallback(callback: () => void) {
    this.reconnectedCallback = callback;
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
