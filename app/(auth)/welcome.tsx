import { useRouter } from 'expo-router';
import React, { useEffect, useCallback } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useSharedValue, withTiming, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setIsGuest } = useAuth();
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 200 });
    }, [])
  );

  const handleLogin = () => {
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(router.push)('/(auth)/login');
      }
    });
  };

  const handleRegister = () => {
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(router.push)('/(auth)/register');
      }
    });
  };

  const handleContinueAsGuest = async () => {
    await setIsGuest(true);
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(router.replace)('/(tabs)');
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  return (
    <Animated.View style={animatedStyle} className="flex-1 bg-black">
      <Image 
        source={require('../../assets/images/bar-background.png')} 
        className="absolute w-full h-full opacity-70"
      />
      
      <SafeAreaView className="flex-1 bg-black/50">
        <View className="flex-1 px-6 justify-center items-center">
          {/* Logo */}
          <Image
            source={require('../../assets/images/icon.png')}
            className="w-40 h-40 mb-8"
          />
          
          {/* Title */}
          <Text className="text-yellow-500 text-3xl font-bold mb-2">
            Bar Buddy xin chào!
          </Text>
          <Text className="text-white/80 text-lg mb-10">
            Enjoy with us
          </Text>
          
          {/* Main Buttons */}
          <View className="w-full space-y-4">
            <TouchableOpacity 
              className="w-full bg-yellow-500 py-4 rounded-full items-center"
              activeOpacity={0.8}
              onPress={handleLogin}
            >
              <Text className="text-neutral-800 font-bold text-lg">
                Đăng nhập
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="w-full border border-white py-4 rounded-full items-center"
              activeOpacity={0.8}
              onPress={handleRegister}
            >
              <Text className="text-white font-bold text-lg">
                Đăng ký
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Terms */}
          <Text className="text-white/60 text-xs text-center mt-8 mb-6 px-6">
            Bằng cách đăng ký hoặc đăng nhập, bạn đã đồng ý với{' '}
            <Text className="text-yellow-500">Điều khoản dịch vụ</Text> và{' '}
            <Text className="text-yellow-500">Chính sách bảo mật</Text> của chúng tôi.
          </Text>

          {/* Divider */}
          <Text className="text-white/60 text-base mb-6">
            Hoặc
          </Text>

          {/* Guest Button */}
          <TouchableOpacity 
            className="w-full bg-white/10 py-4 rounded-full items-center"
            activeOpacity={0.8}
            onPress={handleContinueAsGuest}
          >
            <Text className="text-white/90 font-bold text-lg">
              Tiếp tục với vai trò Khách
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}
