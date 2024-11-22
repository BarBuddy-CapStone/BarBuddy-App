import api from './api';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { signalRService } from '@/services/signalr';

class FCMService {
  async registerGuestDevice() {
    try {
      const fcmToken = await messaging().getToken();
      
      if (!fcmToken) {
        console.error('Không thể lấy FCM token');
        return null;
      }

      const response = await api.post(
        `/api/Fcm/sign-device-token`,
        {
          deviceToken: fcmToken,
          platform: Platform.OS
        }
      );

      if (response.data.statusCode === 200) {
        console.log('Đăng ký device token thành công:', response.data.message);
        await signalRService.connect();
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Lỗi khi đăng ký device token:', error);
      return null;
    }
  }

  async updateAccountDeviceToken(isLoginOrLogout: boolean) {
    try {
      const fcmToken = await messaging().getToken();
      
      if (!fcmToken) {
        console.error('Không thể lấy FCM token');
        return null;
      }

      const response = await api.patch(
        `/api/Fcm/update-account-device-token`,
        {
          deviceToken: fcmToken,
          isLoginOrLogout
        }
      );

      if (response.data.statusCode === 200) {
        console.log('Cập nhật device token thành công:', response.data.message);
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Lỗi khi cập nhật device token:', error);
      return null;
    }
  }
}

export const fcmService = new FCMService();

