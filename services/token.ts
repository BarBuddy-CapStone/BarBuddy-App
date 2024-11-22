import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { RefreshTokenResponse } from '@/types/auth';
import axios from 'axios';
import { API_CONFIG } from '@/config/api';

class TokenService {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

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
    console.log('Tokens saved:', { accessToken, refreshToken });
  }

  async refreshToken() {
    try {
      const { accessToken, refreshToken } = await this.getTokens();
      
      if (!refreshToken) {
        throw new Error('Không tìm thấy refresh token');
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

      throw new Error('Không thể refresh token');
    } catch (error) {
      console.error('Error refreshing token:', error);
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
          console.log('Received 401 error, attempting to refresh token');
          
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
}

export const tokenService = new TokenService();