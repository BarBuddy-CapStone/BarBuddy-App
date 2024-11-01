import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function PaymentSuccessScreen() {
  const { paymentId } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/booking-history');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 bg-black items-center justify-center px-6">
      <Animated.View 
        entering={FadeIn.duration(500)}
        className="items-center"
      >
        <View className="bg-green-500/20 p-4 rounded-full mb-4">
          <Ionicons name="checkmark-circle-outline" size={48} color="#22C55E" />
        </View>
        <Text className="text-white text-xl font-bold text-center mb-2">
          Thanh toán thành công!
        </Text>
        <Text className="text-white/60 text-center mb-6">
          Cảm ơn bạn đã đặt bàn. Bạn sẽ được chuyển đến trang lịch sử đặt bàn.
        </Text>
        <ActivityIndicator color="#EAB308" />
      </Animated.View>
    </View>
  );
} 