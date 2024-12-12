import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { getAuthHeader } from '@/utils/auth-header';
import { signalRService } from '@/services/notification-signalr';
import { handleConnectionError } from '@/utils/error-handler';

class FCMService {
  async registerGuestDevice() {
    try {
      const fcmToken = await messaging().getToken();
      
      if (!fcmToken) {
        throw new Error('Không thể lấy FCM token');
      }

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/Fcm/device-token`,
        {
          deviceToken: fcmToken,
          platform: Platform.OS
        }
      );

      if (response.data.statusCode === 200) {
        return response.data.data;
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
        'Không thể đăng ký thiết bị. Vui lòng thử lại sau.'
      );
    }
  }

  async updateAccountDeviceToken(isLoginOrLogout: boolean) {
    try {
      const fcmToken = await messaging().getToken();
      
      if (!fcmToken) {
        throw new Error('Không thể lấy FCM token');
      }

      const authHeader = await getAuthHeader();
      if (!authHeader?.headers?.Authorization) {
        throw new Error('Chưa đăng nhập');
      }

      const endpoint = isLoginOrLogout ? 'link' : 'unlink';
      const url = `${API_CONFIG.BASE_URL}/api/Fcm/device-token/${endpoint}`;
      
      const response = await axios.patch(
        url,
        {
          deviceToken: fcmToken,
          isLoginOrLogout
        },
        authHeader
      );

      if (response.data.statusCode === 200) {
        if (isLoginOrLogout) {
          await signalRService.connect();
        }
        return response.data.data;
      }

      throw new Error(response.data.message);
    } catch (error: any) {
      // Nếu là lỗi từ response của API
      if (error.response) {
        throw new Error(error.response.data.message);
      }
    }
  }
}

export const fcmService = new FCMService();