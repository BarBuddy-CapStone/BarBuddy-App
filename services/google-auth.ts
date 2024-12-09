import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LoginResponse } from '@/types/auth';
import { AxiosResponse } from 'axios';
import { API_CONFIG } from '@/config/api';
import api from './api';
import { tokenService } from '@/services/token';
import { handleConnectionError } from '@/utils/error-handler';

class GoogleAuthService {
  private initialized = false;

  async init() {
    if (this.initialized) {
      return;
    }

    try {
      await GoogleSignin.configure({
        iosClientId: '294668771815-0oslkkj1gg5sov5o7npbbf6beo7aknni.apps.googleusercontent.com',
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

      if (response.data.statusCode === 200 && response.data.data) {
        const { accessToken, refreshToken } = response.data.data;
        await tokenService.saveTokens(accessToken, refreshToken);
      }

      return response;
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return null;
      }
      
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Đang trong quá trình đăng nhập');
      }
      
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services không khả dụng');
      }

      if (error.response) {
        throw new Error(error.response.data.message);
      }
      
      return handleConnectionError(
        async () => { throw error; },
        'Không thể đăng nhập bằng Google. Vui lòng thử lại sau.'
      );
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