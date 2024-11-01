import { View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function PaymentFailureScreen() {
  const { paymentId } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View className="flex-1 bg-black items-center justify-center px-6">
      <Animated.View 
        entering={FadeIn.duration(500)}
        className="items-center"
      >
        <View className="bg-red-500/20 p-4 rounded-full mb-4">
          <Ionicons name="close-circle-outline" size={48} color="#EF4444" />
        </View>
        <Text className="text-white text-xl font-bold text-center mb-2">
          Thanh toán thất bại
        </Text>
        <Text className="text-white/60 text-center mb-6">
          Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-yellow-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-black font-bold">Thử lại</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
} 