import { HttpTransportType, HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_CONFIG } from '@/config/api';
import messaging from '@react-native-firebase/messaging';
import { Notification } from '@/services/notification';

class SignalRService {
  private connection: HubConnection | null = null;
  private notificationCallback: ((notification: Notification) => void) | null = null;

  async connect() {
    try {
      const fcmToken = await messaging().getToken();
      
      if (!fcmToken) {
        console.error('Không thể lấy FCM token để kết nối SignalR');
        return;
      }

      if (!this.connection || this.connection.state === 'Disconnected') {
        this.connection = new HubConnectionBuilder()
    .withUrl(`${API_CONFIG.BASE_URL}/notificationHub?deviceToken=${fcmToken}`, {
        transport: HttpTransportType.WebSockets,
        skipNegotiation: true
    })
    .configureLogging(LogLevel.Debug)
    .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
            if (retryContext.previousRetryCount === 0) return 0;
            if (retryContext.previousRetryCount === 1) return 2000;
            if (retryContext.previousRetryCount === 2) return 10000;
            return null;
        }
    })
    .build();

// Thêm error handler
this.connection.onclose((error) => {
    console.error('SignalR Connection closed:', error);
});

// Log tất cả events
this.connection.on("*", (name: string, message: any) => {
    console.log(`Received SignalR event '${name}':`, message);
});

        this.connection.on('ReceiveNotification', (notification: Notification) => {
          console.log('Nhận notification từ ReceiveNotification:', notification);
          
          // Normalize createdAt nếu cần
          const normalizedNotification = {
            ...notification,
            createdAt: notification.createdAt || new Date().toISOString()
          };

          if (this.notificationCallback) {
            this.notificationCallback(normalizedNotification);
          }
        });

        this.connection.onreconnecting((error) => {
          console.log('SignalR đang kết nối lại:', error);
        });

        this.connection.onreconnected((connectionId) => {
          console.log('SignalR đã kết nối lại, ID:', connectionId);
        });

        await this.connection.start();
        console.log('SignalR đã kết nối thành công');
      }
    } catch (error) {
      console.error('Lỗi khi kết nối SignalR:', error);
    }
  }

  setNotificationCallback(callback: (notification: Notification) => void) {
    this.notificationCallback = callback;
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      this.notificationCallback = null;
      console.log('Đã ngắt kết nối SignalR');
    }
  }
}

export const signalRService = new SignalRService();
