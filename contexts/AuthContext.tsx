import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserInfo } from '@/types/auth';
import { authService } from '@/services/auth';
import axios from 'axios'; // Thêm import axios
import { googleAuthService } from '@/services/google-auth';
import { LoginResponse } from '@/types/auth';

// Định nghĩa kiểu dữ liệu cho user
type User = UserInfo;

// Định nghĩa kiểu dữ liệu cho context
type AuthContextType = {
  isAuthenticated: boolean;
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<LoginResponse>;
  error: string | null;
  resetAllStorage: () => Promise<void>;
  allowNavigation: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = '@auth';
const GUEST_MODE_KEY = '@guest_mode';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Thêm state mới
  const [allowNavigation, setAllowNavigation] = useState(true);

  // Load trạng thái ngay khi component mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [authValue, guestValue] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
        AsyncStorage.getItem(GUEST_MODE_KEY),
      ]);

      if (authValue !== null) {
        const authData = JSON.parse(authValue);
        if (authData.user) {
          setUser(authData.user);
          setIsAuthenticated(true);
        }
      }

      if (guestValue !== null) {
        setIsGuest(JSON.parse(guestValue));
      }
    } catch (error) {
      console.error('Không thể tải thông tin đăng nhập:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);

      const user = await authService.login({ email, password });

      // Lưu thông tin authentication
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        user
      }));

      await AsyncStorage.setItem('userToken', user.accessToken);
      setUser(user);
      setIsAuthenticated(true);
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Xóa user từ state
      setUser(null);
      setIsAuthenticated(false); // Thêm dòng này
      
      // Xóa token và thông tin user từ AsyncStorage
      await AsyncStorage.multiRemove([
        AUTH_STORAGE_KEY,
        GUEST_MODE_KEY,
        // Thêm các key khác nếu có lưu thêm thông tin
      ]);
      
      // Xóa token khỏi header của axios
      delete axios.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Thay thế bằng API call thực tế
      const mockUser: User = {
        accountId: '1',
        fullname: name,
        email: email,
        phone: '',
        image: '',
        accessToken: '',
        identityId: null,
        role: 'CUSTOMER'
      };

      // Tự động đăng nhập sau khi đăng ký
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        user: mockUser,
      }));

      setUser(mockUser);
      setIsAuthenticated(true);
    } catch (error) {
      setError('Đăng ký thất bại');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateGuestMode = async (value: boolean) => {
    try {
      await AsyncStorage.setItem(GUEST_MODE_KEY, JSON.stringify(value));
      setIsGuest(value);
    } catch (error) {
      setError('Không thể cập nhật trạng thái khách');
    }
  };

  const resetAllStorage = async () => {
    try {
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, GUEST_MODE_KEY]);
      setIsAuthenticated(false);
      setIsGuest(false);
      setUser(null);
    } catch (error) {
      setError('Không thể reset dữ liệu');
    }
  };

  const loginWithGoogle = async (): Promise<LoginResponse> => {
    try {
      setError(null);
      
      const response = await googleAuthService.signIn();
      
      if (response.data?.data) {
        const apiData = response.data.data;
        
        // Transform API data to match UserInfo structure
        const userData: UserInfo = {
          accountId: apiData.accountId,
          fullname: apiData.fullname,
          email: apiData.email,
          phone: apiData.phone,
          image: apiData.image,
          accessToken: apiData.accessToken,
          identityId: apiData.identityId,
          role: 'CUSTOMER' // Thêm role mặc định vì API Google không trả về role
        };

        console.log('User data from response:', userData);

        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
          user: userData
        }));

        await AsyncStorage.setItem('userToken', userData.accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${userData.accessToken}`;
        
        setUser(userData);
        setIsAuthenticated(true);
        setIsGuest(false);

        return response.data;
      } else {
        throw new Error('Không nhận được dữ liệu người dùng');
      }
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isGuest,
        setIsGuest: updateGuestMode,
        isLoading,
        user,
        login,
        logout,
        register,
        loginWithGoogle,
        error,
        resetAllStorage,
        allowNavigation,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
