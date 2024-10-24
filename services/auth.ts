import api from './api';
import { ErrorResponse, LoginRequest, LoginResponse, UserInfo } from '@/types/auth';
import { jwtDecode } from 'jwt-decode';
import { AxiosError } from 'axios';

interface JwtPayload {
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': string;
}

interface ApiErrorResponse {
  statusCode: number;
  message: string;
}

class AuthService {
  async login(credentials: LoginRequest): Promise<UserInfo> {
    try {
      const response = await api.post<LoginResponse>('/api/authen/login', credentials);
      
      if (response.data.statusCode === 200 && response.data.data) {
        const decodedToken = jwtDecode<JwtPayload>(response.data.data.accessToken);
        const role = decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        
        if (role !== 'CUSTOMER') {
          throw new Error('Ứng dụng chỉ dành cho khách hàng');
        }

        return {
          ...response.data.data,
          role
        };
      }
      
      throw new Error(response.data.message);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        // Trả về message từ API response
        throw new Error(error.response.data.message);
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Đã có lỗi xảy ra, vui lòng thử lại sau');
    }
  }
}

export const authService = new AuthService();
