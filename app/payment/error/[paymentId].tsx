import { View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function PaymentErrorScreen() {
  const { paymentId } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View className="flex-1 bg-black items-center justify-center px-6">
      <Animated.View 
        entering={FadeIn.duration(500)}
        className="items-center"
      >
        <View className="bg-red-500/20 p-4 rounded-full mb-4">
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
        </View>
        <Text className="text-white text-xl font-bold text-center mb-2">
          Đã xảy ra lỗi
        </Text>
        <Text className="text-white/60 text-center mb-6">
          Có lỗi xảy ra trong quá trình xử lý thanh toán. Vui lòng liên hệ hỗ trợ.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/booking-history')}
          className="bg-white/10 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">Về trang chủ</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
} 