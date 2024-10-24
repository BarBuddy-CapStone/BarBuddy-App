import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function BookingHistoryScreen() {
  const { isGuest, setIsGuest } = useAuth();

  // Component cho Guest Mode
  const GuestView = () => {
    const handleNavigateToAuth = async (screen: 'login' | 'register') => {
      try {
        setIsGuest(false);
        router.replace(`/(auth)/${screen}`);
      } catch (error) {
        console.error('Error navigating to auth:', error);
      }
    };

    return (
      <Animated.View entering={FadeIn} className="flex-1 p-6">
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-white/10 rounded-full items-center justify-center">
            <Ionicons name="calendar-outline" size={48} color="#EAB308" />
          </View>
          <Text className="text-white text-xl font-bold mt-4">
            Xem lịch sử đặt bàn
          </Text>
          <Text className="text-white/60 text-center mt-2">
            Đăng nhập hoặc đăng ký để xem lịch sử đặt bàn của bạn
          </Text>
        </View>

        <View className="space-y-4">
          <TouchableOpacity 
            onPress={() => handleNavigateToAuth('login')}
            className="w-full bg-yellow-500 py-4 rounded-full items-center"
          >
            <Text className="text-neutral-800 font-bold text-lg">
              Đăng nhập
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleNavigateToAuth('register')}
            className="w-full border border-white py-4 rounded-full items-center"
          >
            <Text className="text-white font-bold text-lg">
              Đăng ký
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 border-b border-white/10">
          <Text className="text-yellow-500 text-2xl font-bold">
            Lịch sử đặt bàn
          </Text>
        </View>

        {isGuest ? (
          <GuestView />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white text-xl">Lịch sử đặt bàn</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
