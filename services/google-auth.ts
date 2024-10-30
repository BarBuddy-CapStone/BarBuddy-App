import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LoginResponse } from '@/types/auth';
import { AxiosResponse } from 'axios';
import { API_CONFIG } from '@/config/api';
import api from './api';

class GoogleAuthService {
  private initialized = false;

  async init() {
    if (this.initialized) {
      return;
    }

    try {
      await GoogleSignin.configure({
        webClientId: '294668771815-0ofnuitrmh09f1gs9ift8ap8qnodsnac.apps.googleusercontent.com',
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
      this.initialized = true;
    } catch (error) {
      console.error('Error configuring Google Sign In:', error);
      throw error;
    }
  }

  async signIn(): Promise<AxiosResponse<LoginResponse> | null> {
    try {
      await GoogleSignin.hasPlayServices();
      
      const userInfo = await GoogleSignin.signIn();
      
      if (!userInfo || userInfo.type === 'cancelled') {
        return null;
      }

      const tokens = await GoogleSignin.getTokens();
      if (!tokens || !tokens.idToken) {
        throw new Error('Không thể lấy token đăng nhập');
      }
      
      const response = await api.post<LoginResponse>(`${API_CONFIG.BASE_URL}/api/authen/google-login`, {
        idToken: tokens.idToken
      });

      return response;
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return null;
      }
      
      console.error('Google Sign In Error:', error);
      if (error.code === statusCodes.IN_PROGRESS) {
        throw {
          message: 'Đang trong quá trình đăng nhập',
          code: 'IN_PROGRESS'
        };
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw {
          message: 'Google Play Services không khả dụng',
          code: 'PLAY_SERVICES_ERROR'
        };
      } else {
        throw {
          message: error.message || 'Có lỗi xảy ra khi đăng nhập với Google',
          code: 'UNKNOWN_ERROR'
        };
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