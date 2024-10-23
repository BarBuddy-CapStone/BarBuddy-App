import { Link, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withTiming,
  runOnJS
} from 'react-native-reanimated';

export default function LoginScreen() {
  const router = useRouter();
  const { login, error, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const opacity = useSharedValue(0);

  // Thêm animation fade in khi màn hình được mount
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
  }, []);

  const handleBack = () => {
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(router.back)();
      }
    });
  };

  const handleLogin = async () => {
    try {
      await login(email, password);
      opacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(router.replace)('/(tabs)');
        }
      });
    } catch (err) {
      // Error đã được xử lý trong AuthContext
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  return (
    <Animated.View style={animatedStyle} className="flex-1 bg-black">
      <Image 
        source={require('../../assets/images/bar-background.png')} 
        className="absolute w-full h-full opacity-20"
      />
      
      <SafeAreaView className="flex-1 px-6">
        {/* Header - Thêm border bottom */}
        <View className="pb-4 border-b border-white/10">
          <View className="flex-row items-center mt-4">
            <TouchableOpacity 
              onPress={handleBack}
              className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-yellow-500 text-2xl font-bold ml-4">
              Đăng nhập
            </Text>
          </View>
        </View>

        {/* Logo */}
        <View className="items-center mt-8 mb-12">
          <Image
            source={require('../../assets/images/icon.png')}
            className="w-24 h-24"
          />
        </View>

        {/* Form */}
        <View className="space-y-6 mt-12">
          <View>
            <Text className="text-white text-sm font-medium mb-2">Email</Text>
            <View className="flex-row items-center border border-white/30 rounded-xl p-4 bg-black/40">
              <Ionicons name="mail-outline" size={20} color="#FFF" />
              <TextInput
                className="flex-1 text-white text-base ml-3"
                placeholder="Nhập email của bạn"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View>
            <Text className="text-white text-sm font-medium mb-2">Mật khẩu</Text>
            <View className="flex-row items-center border border-white/30 rounded-xl p-4 bg-black/40">
              <Ionicons name="lock-closed-outline" size={20} color="#FFF" />
              <TextInput
                className="flex-1 text-white text-base ml-3"
                placeholder="Nhập mật khẩu"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={toggleShowPassword}
                className="p-1"
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#FFF" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View className="bg-red-500/20 p-4 rounded-xl">
              <Text className="text-red-400 text-sm font-medium">{error}</Text>
            </View>
          )}

          <TouchableOpacity onPress={() => {}}>
            <Text className="text-yellow-400 text-right font-medium">Quên mật khẩu?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-yellow-500 p-4 rounded-xl mt-4"
            activeOpacity={0.8}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text className="text-black font-bold text-center text-lg">
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center justify-center space-x-4">
            <View className="h-[1px] flex-1 bg-white/20" />
            <Text className="text-white/60 px-3">hoặc</Text>
            <View className="h-[1px] flex-1 bg-white/20" />
          </View>

          <TouchableOpacity 
            className="flex-row items-center justify-center space-x-3 border border-white/20 p-4 rounded-xl bg-white/5"
            activeOpacity={0.8}
          >
            <Image 
              source={require('../../assets/images/google.png')} 
              className="w-5 h-5"
            />
            <Text className="text-white font-semibold">Tiếp tục với Google</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-white/60 text-xs text-center mt-8 px-6">
          Bằng cách đăng nhập, bạn đã đồng ý với{' '}
          <Text className="text-yellow-500">Điều khoản dịch vụ</Text> và{' '}
          <Text className="text-yellow-500">Chính sách bảo mật</Text> của chúng tôi.
        </Text>
      </SafeAreaView>
    </Animated.View>
  );
}
