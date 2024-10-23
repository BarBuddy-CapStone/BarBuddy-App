import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Định nghĩa kiểu dữ liệu cho user
type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
};

// Định nghĩa kiểu dữ liệu cho context
type AuthContextType = {
  isFirstTime: boolean;
  setIsFirstTime: (value: boolean) => void;
  isAuthenticated: boolean;
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  error: string | null;
  resetAllStorage: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = '@auth';
const FIRST_TIME_KEY = '@first_time';
const GUEST_MODE_KEY = '@guest_mode';  // Thêm dòng này

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load trạng thái đã lưu
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [firstTimeValue, authValue, guestValue] = await Promise.all([
        AsyncStorage.getItem(FIRST_TIME_KEY),
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
        AsyncStorage.getItem(GUEST_MODE_KEY),
      ]);

      if (firstTimeValue !== null) {
        setIsFirstTime(JSON.parse(firstTimeValue));
      }

      if (authValue !== null) {
        const authData = JSON.parse(authValue);
        setIsAuthenticated(true);
        setUser(authData.user);
      }

      if (guestValue !== null) {
        setIsGuest(JSON.parse(guestValue));
      }
    } catch (error) {
      setError('Không thể tải thông tin đăng nhập');
    } finally {
      setIsLoading(false);
    }
  };

  const updateIsFirstTime = async (value: boolean) => {
    try {
      await AsyncStorage.setItem(FIRST_TIME_KEY, JSON.stringify(value));
      setIsFirstTime(value);
    } catch (error) {
      setError('Không thể cập nhật trạng thái');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Thay thế bằng API call thực tế
      const mockUser: User = {
        id: '1',
        email,
        name: 'Test User',
      };

      // Lưu thông tin authentication
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        user: mockUser,
        // token: response.token
      }));

      setUser(mockUser);
      setIsAuthenticated(true);
    } catch (error) {
      setError('Đăng nhập thất bại');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      // TODO: Gọi API logout nếu cần
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      setError('Đăng xuất thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Thay thế bằng API call thực tế
      const mockUser: User = {
        id: '1',
        email,
        name,
      };

      // Tự động đăng nhập sau khi đăng ký
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        user: mockUser,
        // token: response.token
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
      await AsyncStorage.multiRemove([FIRST_TIME_KEY, AUTH_STORAGE_KEY, GUEST_MODE_KEY]);
      setIsFirstTime(true);
      setIsAuthenticated(false);
      setIsGuest(false);
      setUser(null);
    } catch (error) {
      setError('Không thể reset dữ liệu');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isFirstTime,
        setIsFirstTime: updateIsFirstTime,
        isAuthenticated,
        isGuest,
        setIsGuest: updateGuestMode,  // Thay đổi dòng này
        isLoading,
        user,
        login,
        logout,
        register,
        error,
        resetAllStorage,
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
