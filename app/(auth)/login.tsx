import { Link, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
  runOnJS,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import { validateEmail, validatePassword } from '@/utils/validation';
import { ScrollView } from 'react-native';
import { googleAuthService } from '@/services/google-auth';
import { MaterialIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const opacity = useSharedValue(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const buttonScale = useSharedValue(1);
  const loadingRotate = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const logoSpacing = useSharedValue(48);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleSuccess, setIsGoogleSuccess] = useState(false);
  const googleButtonScale = useSharedValue(1);
  const googleLoadingRotate = useSharedValue(0);
  const googleProgressWidth = useSharedValue(0);

  useEffect(() => {
    // Khởi tạo Google Sign In khi component mount
    googleAuthService.init();
  }, []);

  // Thêm animation fade in khi màn hình được mount
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
  }, []);

  useEffect(() => {
    if (error) {
      logoSpacing.value = withSpring(16);
    } else {
      logoSpacing.value = withSpring(48);
    }
  }, [error]);

  const handleBack = () => {
    router.replace('/(auth)/welcome');
  };

  const handleLogin = async () => {
    try {
      setError(null);

      // Validate email & password
      const emailError = validateEmail(email);
      if (emailError) {
        setError(emailError);
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      // Bắt đầu animation
      setIsSubmitting(true);
      buttonScale.value = withSpring(0.95);
      progressWidth.value = withTiming(100, {
        duration: 1000,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1)
      });
      
      // Animation loading xoay
      loadingRotate.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear
        }),
        -1 // Lặp vô hạn
      );

      await login(email, password);

      // Animation hoàn thành
      progressWidth.value = withTiming(0);
      buttonScale.value = withSequence(
        withSpring(1.05),
        withSpring(1)
      );

      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);

    } catch (err: any) {
      // Reset animation khi có lỗi
      progressWidth.value = withTiming(0);
      buttonScale.value = withSpring(1);
      loadingRotate.value = 0;
      setIsSubmitting(false);
      setError(err.message);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));

  const loadingIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${loadingRotate.value}deg` }]
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
    height: 2,
    backgroundColor: '#000',
    position: 'absolute',
    bottom: 0,
    left: 0,
    opacity: 0.3
  }));

  const formContainerStyle = useAnimatedStyle(() => ({
    marginTop: logoSpacing.value
  }));

  const googleButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: googleButtonScale.value }]
  }));

  const googleLoadingIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${googleLoadingRotate.value}deg` }]
  }));

  const googleProgressBarStyle = useAnimatedStyle(() => ({
    width: `${googleProgressWidth.value}%`,
    height: 2,
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    opacity: 0.3
  }));

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);

      // Bắt đầu animation
      googleButtonScale.value = withSpring(0.95);
      googleProgressWidth.value = withTiming(100, {
        duration: 1000,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1)
      });
      
      // Animation loading xoay
      googleLoadingRotate.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear
        }),
        -1
      );

      const response = await loginWithGoogle();
      
      // Reset animation và loading state nếu response là null (người dùng hủy)
      if (!response) {
        // Dừng tất cả animation trước
        googleProgressWidth.value = withTiming(0, undefined, (finished) => {
          if (finished) {
            runOnJS(setError)('Đăng nhập đã bị hủy');
          }
        });
        googleButtonScale.value = withSpring(1);
        googleLoadingRotate.value = 0;
        setIsGoogleLoading(false);
        return;
      }
      
      if (response.statusCode === 200 && response.data) {
        // Animation hoàn thành
        googleProgressWidth.value = withTiming(0);
        googleButtonScale.value = withSequence(
          withSpring(1.05),
          withSpring(1)
        );

        setTimeout(() => {
          router.replace('/(tabs)');
        }, 500);
      }
    } catch (error: any) {
      // Reset animation khi có lỗi
      googleProgressWidth.value = withTiming(0);
      googleButtonScale.value = withSpring(1);
      googleLoadingRotate.value = 0;
      setIsGoogleLoading(false);
      
      setError(error.message || 'Có lỗi xảy ra khi đăng nhập với Google');
    }
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(200)} 
      exiting={FadeOut.duration(200)} 
      className="flex-1 bg-black"
    >
      <Image 
        source={require('../../assets/images/bar-background.png')} 
        className="absolute w-full h-full opacity-20"
      />
      
      <SafeAreaView className="flex-1">
        {/* Header - Thêm border bottom */}
        <View className="px-6 pb-4 border-b border-white/10">
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

        {/* Content */}
        <ScrollView 
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View className="items-center mt-8">
            <Image
              source={require('../../assets/images/icon.png')}
              className="w-24 h-24"
            />
          </View>

          {/* Form - Wrap trong Animated.View */}
          <Animated.View style={formContainerStyle}>
            <View className="space-y-6">
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
                  <Text className="text-red-400 text-sm font-medium text-center">
                    {error}
                  </Text>
                </View>
              )}

              <TouchableOpacity onPress={() => {}}>
                <Text className="text-yellow-400 text-right font-medium">Quên mật khẩu?</Text>
              </TouchableOpacity>

              <View className="mt-4">
                <Animated.View style={buttonAnimatedStyle}>
                  <TouchableOpacity
                    className="bg-yellow-500 p-4 rounded-xl overflow-hidden"
                    activeOpacity={0.8}
                    onPress={handleLogin}
                    disabled={isSubmitting}
                  >
                    <View className="flex-row items-center justify-center space-x-2">
                      {isSubmitting ? (
                        <>
                          <Animated.View style={loadingIconStyle}>
                            <Ionicons name="sync" size={20} color="black" />
                          </Animated.View>
                          <Text className="text-black font-bold text-lg">
                            Đang xử lý...
                          </Text>
                        </>
                      ) : (
                        <Text className="text-black font-bold text-center text-lg">
                          Đăng nhập
                        </Text>
                      )}
                    </View>
                    <Animated.View style={progressBarStyle} />
                  </TouchableOpacity>
                </Animated.View>
              </View>

              <View className="flex-row items-center justify-center space-x-4">
                <View className="h-[1px] flex-1 bg-white/20" />
                <Text className="text-white/60 px-3">hoặc</Text>
                <View className="h-[1px] flex-1 bg-white/20" />
              </View>

              <Animated.View style={googleButtonAnimatedStyle}>
                <TouchableOpacity 
                  className="flex-row items-center justify-center space-x-3 border border-white/20 p-4 rounded-xl bg-white/5 overflow-hidden"
                  activeOpacity={0.8}
                  disabled={isGoogleLoading}
                  onPress={handleGoogleSignIn}
                >
                  <View className="flex-row items-center justify-center space-x-3">
                    {isGoogleLoading ? (
                      <>
                        <Animated.View style={googleLoadingIconStyle}>
                          <Ionicons name="sync" size={20} color="white" />
                        </Animated.View>
                        <Text className="text-white font-semibold">
                          Đang xử lý...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Image 
                          source={require('../../assets/images/google.png')} 
                          className="w-5 h-5"
                        />
                        <Text className="text-white font-semibold">
                          Tiếp tục với Google
                        </Text>
                      </>
                    )}
                  </View>
                  <Animated.View style={googleProgressBarStyle} />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>

          <Text className="text-white/60 text-xs text-center mt-8 mb-6 px-6">
            Bằng cách đăng nhập, bạn đã đồng ý với{' '}
            <Text className="text-yellow-500">Điều khoản dịch vụ</Text> và{' '}
            <Text className="text-yellow-500">Chính sách bảo mật</Text> của chúng tôi.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}
