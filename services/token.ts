import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { RefreshTokenResponse } from '@/types/auth';
import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import { Alert } from 'react-native';
import { fcmService } from '@/services/fcm';
import { handleConnectionError } from '@/utils/error-handler';

class TokenService {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];
  private authContext: any = null;

  setAuthContext(context: any) {
    this.authContext = context;
  }

  async getTokens() {
    const accessToken = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    return { accessToken, refreshToken };
  }

  async saveTokens(accessToken: string, refreshToken: string) {
    await AsyncStorage.multiSet([
      ['accessToken', accessToken],
      ['refreshToken', refreshToken],
    ]);
  }

  async refreshToken() {
    try {
      const { accessToken, refreshToken } = await this.getTokens();
      
      if (!refreshToken) {
        throw new Error('TOKEN_NOT_FOUND');
      }

      const response = await axios.post<RefreshTokenResponse>(
        `${API_CONFIG.BASE_URL}/api/authen/refresh-token`,
        refreshToken,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.statusCode === 200 && response.data.data) {
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
        await this.saveTokens(newAccessToken, newRefreshToken);
        return newAccessToken;
      }

      throw new Error(response.data.message || 'REFRESH_FAILED');
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('TOKEN_INVALID');
      }
      
      // Nếu là lỗi từ response của API
      if (error.response) {
        throw new Error(error.response.data.message);
      }
      
      throw error;
    }
  }

  onRefreshed(token: string) {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  setupAxiosInterceptors() {
    api.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise(resolve => {
              this.addRefreshSubscriber(token => {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                resolve(axios(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newAccessToken = await this.refreshToken();
            this.isRefreshing = false;
            this.onRefreshed(newAccessToken);
            
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            this.isRefreshing = false;
            throw refreshError;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async logout() {
    try {
      const { accessToken, refreshToken } = await this.getTokens();
      
      if (!refreshToken || !accessToken) {
        throw new Error('Không tìm thấy token');
      }

      const response = await api.post(
        '/api/authen/logout',
        refreshToken,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.statusCode === 200) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
        return true;
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
        'Không thể đăng xuất. Vui lòng thử lại sau.'
      );
    }
  }

  async checkAndSetupAuth() {
    try {
      const { accessToken, refreshToken } = await this.getTokens();
      
      if (!accessToken || !refreshToken) {
        if (this.authContext) {
          await fcmService.updateAccountDeviceToken(false);
          await this.authContext.resetAllStorage();
        }
        return false;
      }

      this.setupAxiosInterceptors();

      try {
        await this.refreshToken();
        return true;
      } catch (error: any) {
        if (error instanceof Error) {
          if (['TOKEN_NOT_FOUND', 'TOKEN_INVALID', 'REFRESH_FAILED'].includes(error.message)) {
            if (this.authContext) {
              await fcmService.updateAccountDeviceToken(false);
              Alert.alert(
                'Phiên đăng nhập hết hạn',
                'Vui lòng đăng nhập lại để tiếp tục sử dụng ứng dụng.',
                [{ text: 'OK' }]
              );
              await this.authContext.resetAllStorage();
            }
          }
        }
        return false;
      }
    } catch (error: any) {
      // Nếu là lỗi từ response của API
      if (error.response) {
        throw new Error(error.response.data.message);
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
      );
    }
  }
}

export const tokenService = new TokenService();