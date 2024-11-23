import api from './api';
import { ErrorResponse, LoginRequest, LoginResponse, UserInfo } from '@/types/auth';
import { jwtDecode } from 'jwt-decode';
import { AxiosError } from 'axios';
import { tokenService } from '@/services/token';
import { handleConnectionError } from '@/utils/error-handler';

interface JwtPayload {
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': string;
}

interface ApiErrorResponse {
  statusCode: number;
  message: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  fullname: string;
  phone: string;
  dob: string; // ISO string format
}

interface RegisterResponse {
  statusCode: number;
  message: string;
  data: boolean;
}

interface VerifyOTPRequest {
  email: string;
  otp: string;
}

interface VerifyOTPResponse {
  statusCode: number;
  message: string;
  data: null;
}

class AuthService {
  async login(credentials: LoginRequest): Promise<UserInfo> {
    return handleConnectionError(async () => {
      try {
        const response = await api.post<LoginResponse>('/api/authen/login', credentials);
        
        if (response.data.statusCode === 200 && response.data.data) {
          const { accessToken, refreshToken } = response.data.data;
          await tokenService.saveTokens(accessToken, refreshToken);
          
          const decodedToken = jwtDecode<JwtPayload>(accessToken);
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
    }, 'Không thể đăng nhập. Vui lòng thử lại sau.');
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return handleConnectionError(async () => {
      try {
        const response = await api.post<RegisterResponse>('/api/authen/register', data);
        
        if (response.data.statusCode === 200) {
          return response.data;
        }
        
        throw new Error(response.data.message);
      } catch (error) {
        if (error instanceof AxiosError && error.response?.data) {
          throw new Error(error.response.data.message);
        }
        
        if (error instanceof Error) {
          throw error;
        }
        
        throw new Error('Đã có lỗi xảy ra, vui lòng thử lại sau');
      }
    }, 'Không thể đăng ký. Vui lòng thử lại sau.');
  }

  async verifyOTP(data: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    return handleConnectionError(async () => {
      try {
        const response = await api.post<VerifyOTPResponse>('/api/authen/verify', data);
        
        if (response.data.statusCode === 200) {
          return response.data;
        }
        
        throw new Error(response.data.message);
      } catch (error) {
        if (error instanceof AxiosError && error.response?.data) {
          throw new Error(error.response.data.message);
        }
        
        if (error instanceof Error) {
          throw error;
        }
        
        throw new Error('Đã có lỗi xảy ra, vui lòng thử lại sau');
      }
    }, 'Không thể xác thực OTP. Vui lòng thử lại sau.');
  }
}

export const authService = new AuthService();
