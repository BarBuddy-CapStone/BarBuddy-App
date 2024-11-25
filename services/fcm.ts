import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { getAuthHeader } from '@/utils/auth-header';
import { signalRService } from '@/services/signalr';
import { handleConnectionError } from '@/utils/error-handler';

class FCMService {
  async registerGuestDevice() {
    return handleConnectionError(async () => {
      try {
        const fcmToken = await messaging().getToken();
        
        if (!fcmToken) {
          console.error('Không thể lấy FCM token');
          return null;
        }

        const response = await axios.post(
          `${API_CONFIG.BASE_URL}/api/Fcm/sign-device-token`,
          {
            deviceToken: fcmToken,
            platform: Platform.OS
          }
        );

        if (response.data.statusCode === 200) {
          await signalRService.connect();
          return response.data;
        }

        return null;
      } catch (error) {
        console.error('Lỗi khi đăng ký device token:', error);
        return null;
      }
    }, 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
  }

  async updateAccountDeviceToken(isLoginOrLogout: boolean) {
    return handleConnectionError(async () => {
      try {
        const fcmToken = await messaging().getToken();
        
        if (!fcmToken) {
          console.error('Không thể lấy FCM token');
          return null;
        }

        // Kiểm tra authorization header
        const authHeader = await getAuthHeader();
        if (!authHeader?.headers?.Authorization) {
          console.log('Bỏ qua update device token vì chưa có authorization header');
          return null;
        }

        const url = `${API_CONFIG.BASE_URL}/api/Fcm/update-account-device-token`;
        console.log('Update device token URL:', url);
        console.log('Request payload:', { deviceToken: fcmToken, isLoginOrLogout });
        
        const response = await axios.patch(
          url,
          {
            deviceToken: fcmToken,
            isLoginOrLogout
          },
          authHeader
        );

        if (response.data.statusCode === 200) {
          return response.data;
        }

        return null;
      } catch (error) {
        console.error('Lỗi khi cập nhật device token:', error);
        return null;
      }
    }, 'Không thể cập nhật thông tin thiết bị. Vui lòng thử lại sau.');
  }
}

export const fcmService = new FCMService();