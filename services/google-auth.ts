import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LoginResponse } from '@/types/auth';
import { AxiosResponse } from 'axios';
import { API_CONFIG } from '@/config/api';
import api from './api';

class GoogleAuthService {
  private initialized = false;

  async init() {
    if (this.initialized) {
      console.log('Google Sign In already initialized');
      return;
    }

    try {
      console.log('Configuring Google Sign In...');
      await GoogleSignin.configure({
        webClientId: '294668771815-0ofnuitrmh09f1gs9ift8ap8qnodsnac.apps.googleusercontent.com',
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
      this.initialized = true;
      console.log('Google Sign In configured successfully');
    } catch (error) {
      console.error('Error configuring Google Sign In:', error);
      throw error;
    }
  }

  async signIn(): Promise<AxiosResponse<LoginResponse>> {
    try {
      console.log('Checking Play Services...');
      await GoogleSignin.hasPlayServices();
      
      console.log('Starting Google Sign In...');
      const userInfo = await GoogleSignin.signIn();
      console.log('User Info:', userInfo);
      
      const tokens = await GoogleSignin.getTokens();
      console.log('Tokens:', tokens);

      console.log('Calling API with idToken:', tokens.idToken);
      
      const response = await api.post<LoginResponse>(`${API_CONFIG.BASE_URL}/api/authen/google-login`, {
        idToken: tokens.idToken
      });

      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });

      return response;
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        response: error.response?.data
      });
      
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          throw new Error('Đăng nhập đã bị hủy');
        case statusCodes.IN_PROGRESS:
          throw new Error('Đang trong quá trình đăng nhập');
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error('Google Play Services không khả dụng');
        default:
          throw new Error('Có lỗi xảy ra khi đăng nhập với Google');
      }
    }
  }

  async signOut() {
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
    } catch (error) {
      throw new Error('Có lỗi xảy ra khi đăng xuất');
    }
  }
}

export const googleAuthService = new GoogleAuthService();