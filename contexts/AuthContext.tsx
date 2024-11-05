import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RegisterRequest, RegisterResponse, UserInfo } from '@/types/auth';
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
  register: (email: string, password: string, confirmPassword: string, 
             fullname: string, phone: string, dob: string) => Promise<RegisterResponse>;
  loginWithGoogle: () => Promise<LoginResponse | null>;
  error: string | null;
  resetAllStorage: () => Promise<void>;
  allowNavigation: boolean;
  updateUserData: (newUserData: Partial<UserInfo>) => Promise<void>;
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

  const register = async (email: string, password: string, confirmPassword: string, 
                         fullname: string, phone: string, dob: string): Promise<RegisterResponse> => {
    try {
      setError(null);

      const registerData: RegisterRequest = {
        email,
        password,
        confirmPassword,
        fullname,
        phone,
        dob
      };

      const response = await authService.register(registerData);
      return response;
    } catch (error: any) {
      setError(error.message);
      throw error;
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

  const loginWithGoogle = async (): Promise<LoginResponse | null> => {
    try {
      setError(null);
      
      const response = await googleAuthService.signIn();
      
      // Nếu response là null (người dùng hủy), return ngay
      if (!response) {
        return null;
      }
      
      // Kiểm tra response trước khi xử lý
      if (!response.data?.data) {
        throw new Error('Không nhận được dữ liệu người dùng');
      }

      const apiData = response.data.data;
      
      const userData: UserInfo = {
        accountId: apiData.accountId,
        fullname: apiData.fullname,
        email: apiData.email,
        phone: apiData.phone,
        image: apiData.image,
        accessToken: apiData.accessToken,
        identityId: apiData.identityId,
        role: 'CUSTOMER'
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        user: userData
      }));

      await AsyncStorage.setItem('userToken', userData.accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.accessToken}`;
      
      setUser(userData);
      setIsAuthenticated(true);
      setIsGuest(false);

      return response.data;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  // Thêm hàm helper để update user trong storage và state
  const updateUserData = async (newUserData: Partial<UserInfo>) => {
    try {
      // Lấy data hiện tại từ storage
      const authValue = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (authValue) {
        const authData = JSON.parse(authValue);
        // Update user data với dữ liệu mới
        const updatedUser = {
          ...authData.user,
          ...newUserData
        };
        // Lưu lại vào storage
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
          user: updatedUser
        }));
        // Update state
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating user data:', error);
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
        updateUserData,
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
