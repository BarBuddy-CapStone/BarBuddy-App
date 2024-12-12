import React, { createContext, useContext, useEffect, useState } from 'react';
import { bookingSignalRService } from '@/services/booking-signalr';
import { useAuth } from '@/contexts/AuthContext';
import { AppState, AppStateStatus } from 'react-native';

interface BookingSignalRContextType {
  isConnected: boolean;
}

const BookingSignalRContext = createContext<BookingSignalRContextType>({
  isConnected: false,
});

export const BookingSignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Quản lý kết nối SignalR khi trạng thái đăng nhập thay đổi
  useEffect(() => {
    const connectSignalR = async () => {
      if (isAuthenticated && user) {
        try {
          await bookingSignalRService.initialize();
          setIsConnected(true);
        } catch (error) {
          console.error('Error connecting to booking SignalR:', error);
          setIsConnected(false);
        }
      } else {
        // Ngắt kết nối nếu không còn đăng nhập
        await bookingSignalRService.stop();
        setIsConnected(false);
      }
    };

    connectSignalR();

    return () => {
      // Ngắt kết nối khi component unmount
      bookingSignalRService.stop();
    };
  }, [isAuthenticated, user]);

  // Quản lý kết nối SignalR khi trạng thái ứng dụng thay đổi
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated && user) {
        // Kết nối lại khi app hoạt động và người dùng đã đăng nhập
        try {
          await bookingSignalRService.initialize();
          setIsConnected(true);
        } catch (error) {
          console.error('Error reconnecting to booking SignalR:', error);
          setIsConnected(false);
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // Ngắt kết nối khi app vào nền hoặc không hoạt động
        await bookingSignalRService.stop();
        setIsConnected(false);
      }
    };

    // Đăng ký listener cho trạng thái app
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, user]);

  return (
    <BookingSignalRContext.Provider value={{ isConnected }}>
      {children}
    </BookingSignalRContext.Provider>
  );
};

export const useBookingSignalR = () => useContext(BookingSignalRContext);