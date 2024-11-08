import { View, Text, TouchableOpacity, BackHandler, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookingDrinkRequest } from '@/services/booking-table';

interface TempBookingData {
  bookingRequest: BookingDrinkRequest;
  selectedTables: string[];
  drinks: {
    drinkId: string;
    quantity: number;
  }[];
  discount: number;
  originalPrice: number;
  totalPrice: number;
}

export default function PaymentErrorScreen() {
  const router = useRouter();
  const [bookingData, setBookingData] = useState<TempBookingData | null>(null);

  useEffect(() => {
    const getBookingData = async () => {
      try {
        const data = await AsyncStorage.getItem('temp_booking_data');
        if (data) {
          setBookingData(JSON.parse(data));
        }
      } catch (error) {
        console.error('Error getting booking data:', error);
      }
    };
    getBookingData();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBackToHistory();
        return true;
      });
      return () => backHandler.remove();
    }
  }, []);

  const handleBackToHistory = async () => {
    try {
      await AsyncStorage.removeItem('temp_booking_data');
      router.replace({
        pathname: '/(tabs)/booking-history',
        params: { reload: 'true' }
      });
    } catch (error) {
      console.error('Error clearing booking data:', error);
    }
  };

  const handleRetry = () => {
    if (bookingData) {
      router.replace({
        pathname: '/payment/payment-detail',
        params: { 
          bookingRequest: JSON.stringify(bookingData.bookingRequest),
          discount: bookingData.discount,
          originalPrice: bookingData.originalPrice,
          totalPrice: bookingData.totalPrice
        }
      });
    } else {
      handleBackToHistory();
    }
  };

  return (
    <View className="flex-1 bg-black items-center justify-center px-6">
      <Animated.View entering={FadeIn.duration(500)} className="items-center w-full">
        <View className="bg-red-500/20 p-4 rounded-full mb-4">
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
        </View>
        <Text className="text-white text-xl font-bold text-center mb-2">
          Đã xảy ra lỗi
        </Text>
        <Text className="text-white/60 text-center mb-6">
          Không thể tải thông tin giao dịch. Vui lòng thử lại sau.
        </Text>

        <View className="w-full space-y-3">
          <TouchableOpacity
            onPress={handleRetry}
            className="bg-yellow-500 py-3 rounded-xl w-full"
          >
            <Text className="text-black font-bold text-center">
              Thử lại
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBackToHistory}
            className="bg-white/10 py-3 rounded-xl w-full"
          >
            <Text className="text-white font-bold text-center">
              Về trang chủ
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
} 