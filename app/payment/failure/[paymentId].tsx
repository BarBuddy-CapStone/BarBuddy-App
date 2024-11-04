import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function PaymentFailureScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-black items-center justify-center px-6">
      <Animated.View entering={FadeIn.duration(500)} className="w-full">
        <View className="items-center mb-6">
          <View className="bg-red-500/20 p-4 rounded-full mb-4">
            <Ionicons name="close-circle-outline" size={48} color="#EF4444" />
          </View>
          <Text className="text-white text-xl font-bold text-center mb-2">
            Thanh toán thất bại
          </Text>
          <Text className="text-white/60 text-center mb-6">
            Giao dịch không thành công. Vui lòng thử lại sau.
          </Text>
        </View>

        <View className="w-full space-y-3">
          {/* Nút thử lại */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-yellow-500 py-3 rounded-xl w-full"
          >
            <Text className="text-black font-bold text-center">
              Thử lại
            </Text>
          </TouchableOpacity>

          {/* Nút về trang chủ */}
          <TouchableOpacity
            onPress={() => router.replace('/booking-history')}
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