import { HttpTransportType, HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_CONFIG } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TableHoldEvent {
  accountId: string;
  barId: string;
  tableId: string;
  tableName: string;
  date: string;
  time: string;
}

class BookingSignalRService {
  private connection: HubConnection | null = null;
  private onTableHoldCallbacks: ((event: TableHoldEvent) => void)[] = [];
  private onTableReleaseCallbacks: ((event: TableHoldEvent) => void)[] = [];

  async initialize() {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Lấy accountId từ AsyncStorage
      let accountId = null;
      try {
        const authData = await AsyncStorage.getItem('@auth');
        if (authData) {
          const userData = JSON.parse(authData);
          accountId = userData?.user?.accountId;
          
          if (!accountId) {
            return;
          }
        } else {
          return;
        }
      } catch (error) {
        return;
      }

      // Tạo connection mới nếu chưa có hoặc đã đóng
      if (!this.connection || this.connection.state === 'Disconnected') {
        // Thêm accountId vào URL
        const hubUrl = `${API_CONFIG.BASE_URL}/bookingHub?accountId=${accountId}`;

        this.connection = new HubConnectionBuilder()
          .withUrl(hubUrl, {
            accessTokenFactory: () => token,
            skipNegotiation: true,
            transport: HttpTransportType.WebSockets
          })
          .configureLogging(LogLevel.Information)
          .withAutomaticReconnect()
          .build();

        // Đăng ký các event handlers
        this.connection.on('TableHoId', (data: TableHoldEvent) => {
          this.onTableHoldCallbacks.forEach(callback => callback(data));
        });

        this.connection.on('TableReleased', (data: TableHoldEvent) => {
          this.onTableReleaseCallbacks.forEach(callback => callback(data));
        });

        // Xử lý khi reconnect thành công
        this.connection.onreconnected(() => {
        });

        // Xử lý khi mất kết nối
        this.connection.onclose(() => {
        });

        await this.connection.start();
      }
    } catch (error) {
      console.error('Error initializing booking SignalR:', error);
    }
  }

  onTableHold(callback: (event: TableHoldEvent) => void) {
    this.onTableHoldCallbacks.push(callback);
    return () => {
      this.onTableHoldCallbacks = this.onTableHoldCallbacks.filter(cb => cb !== callback);
    };
  }

  onTableRelease(callback: (event: TableHoldEvent) => void) {
    this.onTableReleaseCallbacks.push(callback);
    return () => {
      this.onTableReleaseCallbacks = this.onTableReleaseCallbacks.filter(cb => cb !== callback);
    };
  }

  async stop() {
    if (this.connection) {
      try {
        await this.connection.stop();
        this.connection = null;
        this.onTableHoldCallbacks = [];
        this.onTableReleaseCallbacks = [];
      } catch (error) {
        console.error('Error stopping booking SignalR:', error);
      }
    }
  }
}

export const bookingSignalRService = new BookingSignalRService(); 