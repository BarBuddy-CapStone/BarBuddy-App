import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Image, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  NativeSyntheticEvent,
  TextInputKeyPressEventData 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown
} from 'react-native-reanimated';
import { validateEmail } from '@/utils/validation';
import { ScrollView } from 'react-native';
import { authService } from '@/services/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const buttonScale = useSharedValue(1);
  const loadingRotate = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const otpInputRefs = useRef(Array(6).fill(0).map(() => React.createRef<TextInput>()));
  const [isResendingOTP, setIsResendingOTP] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const confirmButtonScale = useSharedValue(1);
  const confirmLoadingRotate = useSharedValue(0);
  const confirmProgressWidth = useSharedValue(0);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showOTPModal && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showOTPModal, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    router.back();
  };

  const handleResetPassword = async () => {
    try {
      const emailError = validateEmail(email);
      if (emailError) {
        setError(emailError);
        return;
      }

      setError(null);
      setIsSubmitting(true);

      // Bắt đầu animation
      buttonScale.value = withSpring(0.95);
      progressWidth.value = withTiming(100, {
        duration: 1000,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1)
      });
      
      loadingRotate.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear
        }),
        -1
      );

      const response = await authService.resetPassword(email);

      if (response.statusCode === 200) {
        progressWidth.value = withTiming(0);
        buttonScale.value = withSequence(
          withSpring(1.05),
          withSpring(1)
        );
        setShowOTPModal(true);
      }
    } catch (err: any) {
      progressWidth.value = withTiming(0);
      buttonScale.value = withSpring(1);
      loadingRotate.value = 0;
      setIsSubmitting(false);
      setError(err.message);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOTP = otp.split('');
    newOTP[index] = value;
    const newOTPString = newOTP.join('');
    setOtp(newOTPString);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.current?.focus();
    }
  };

  const handleOTPKeyPress = (index: number, { nativeEvent: { key } }: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (key === 'Backspace') {
      const newOTP = otp.split('');
      const lastFilledIndex = newOTP.reduce((last, curr, idx) => curr ? idx : last, -1);
      
      if (lastFilledIndex !== -1) {
        newOTP[lastFilledIndex] = '';
        setOtp(newOTP.join(''));
        otpInputRefs.current[lastFilledIndex]?.current?.focus();
      }
    }
  };

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

  const confirmButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confirmButtonScale.value }]
  }));

  const confirmLoadingIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${confirmLoadingRotate.value}deg` }]
  }));

  const confirmProgressBarStyle = useAnimatedStyle(() => ({
    width: `${confirmProgressWidth.value}%`,
    height: 2,
    backgroundColor: '#000',
    position: 'absolute',
    bottom: 0,
    left: 0,
    opacity: 0.3
  }));

  const handleResendOTP = async () => {
    try {
      setIsResendingOTP(true);
      setResendSuccess(null);
      setResendError(null);
      
      loadingRotate.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear
        }),
        -1
      );

      const response = await authService.resetPassword(email);

      if (response.statusCode === 200) {
        setResendError(null);
        setVerifyError(null);
        setTimeLeft(60);
        setResendSuccess('Mã xác thực đã được gửi lại thành công!');
        
        setTimeout(() => {
          setResendSuccess(null);
        }, 3000);
      } else {
        setResendError(response.message || 'Có lỗi xảy ra khi gửi lại mã');
      }
    } catch (err: any) {
      setResendError(err.message || 'Có lỗi xảy ra khi gửi lại mã');
      setResendSuccess(null);
    } finally {
      setIsResendingOTP(false);
      loadingRotate.value = 0;
    }
  };

  const handleOTPSubmit = async () => {
    try {
      setVerifyError(null);
      setIsConfirming(true);

      confirmButtonScale.value = withSpring(0.95);
      confirmProgressWidth.value = withTiming(100, {
        duration: 1000,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1)
      });
      
      confirmLoadingRotate.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear
        }),
        -1
      );
      
      const response = await authService.verifyOTP({
        email,
        otp
      });

      if (response.statusCode === 200) {
        confirmProgressWidth.value = withTiming(0);
        confirmButtonScale.value = withSequence(
          withSpring(1.05),
          withSpring(1)
        );
        
        setShowOTPModal(false);
        router.replace('/(auth)/login');
      }
    } catch (err: any) {
      confirmProgressWidth.value = withTiming(0);
      confirmButtonScale.value = withSpring(1);
      confirmLoadingRotate.value = 0;
      setVerifyError(err.message);
    } finally {
      setIsConfirming(false);
      confirmLoadingRotate.value = 0;
    }
  };

  const resetStates = () => {
    setIsSubmitting(false);
    setIsConfirming(false);
    setIsResendingOTP(false);
    setResendSuccess(null);
    setResendError(null);
    setVerifyError(null);
    setOtp('');
    setTimeLeft(60);
    
    // Reset tất cả các animation
    buttonScale.value = withSpring(1);
    loadingRotate.value = 0;
    progressWidth.value = withTiming(0);
    confirmButtonScale.value = withSpring(1);
    confirmLoadingRotate.value = 0;
    confirmProgressWidth.value = withTiming(0);
  };

  const handleCloseOTPModal = () => {
    resetStates();
    setShowOTPModal(false);
  };

  return (
    <>
      <View className="flex-1">
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
            <View className="px-6 pb-4 border-b border-white/10">
              <View className="flex-row items-center mt-4">
                <TouchableOpacity 
                  onPress={handleBack}
                  className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
                >
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-yellow-500 text-2xl font-bold ml-4">
                  Quên mật khẩu
                </Text>
              </View>
            </View>

            <ScrollView 
              className="flex-1 px-6"
              showsVerticalScrollIndicator={false}
            >
              <View className="mt-6">
                <View className="mb-4">
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

                {error && (
                  <View className="bg-red-500/20 p-4 rounded-xl mb-4">
                    <Text className="text-red-400 text-sm font-medium text-center">{error}</Text>
                  </View>
                )}

                <Animated.View style={buttonAnimatedStyle}>
                  <TouchableOpacity
                    className="bg-yellow-500 p-4 mt-2 rounded-xl overflow-hidden"
                    activeOpacity={0.8}
                    onPress={handleResetPassword}
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
                          Gửi yêu cầu
                        </Text>
                      )}
                    </View>
                    <Animated.View style={progressBarStyle} />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>

      {/* OTP Modal */}
      {showOTPModal && (
        <View 
          className="absolute inset-0 items-center justify-center" 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          {/* Backdrop */}
          <Animated.View 
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            className="absolute inset-0"
            style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={handleCloseOTPModal}
              className="w-full h-full" 
            />
          </Animated.View>
          
          {/* Modal Container */}
          <Animated.View 
            entering={SlideInUp.duration(400).springify().damping(15)}
            exiting={SlideOutDown.duration(300)}
            className="w-[90%] max-w-[400px] z-50"
          >
            <View
              className="bg-[#1A1A1A] rounded-3xl overflow-hidden"
              style={{
                shadowColor: '#FFB800',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10,
                borderWidth: 1,
                borderColor: 'rgba(255, 184, 0, 0.1)',
              }}
            >
              {/* Header */}
              <View className="px-6 py-5 border-b border-white/10">
                <View className="flex-row items-center justify-between">
                  <Text className="text-yellow-500 text-xl font-bold">
                    Xác thực Email
                  </Text>
                  <TouchableOpacity 
                    onPress={handleCloseOTPModal}
                    className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Content */}
              <View className="p-6">
                <Text className="text-white/90 text-center text-base mb-6">
                  Mã xác thực đã được gửi đến email{'\n'}
                  <Text className="text-yellow-500 font-semibold">{email}</Text>
                </Text>

                {/* OTP Input */}
                <View className="flex-row justify-between mb-6">
                  {[...Array(6)].map((_, index) => (
                    <TextInput
                      key={index}
                      ref={otpInputRefs.current[index]}
                      className={`w-11 h-11 bg-black/40 rounded-xl text-center text-white text-xl font-bold
                        ${focusedIndex === index ? 'border-2 border-yellow-500' : 'border border-white/20'}`}
                      maxLength={1}
                      keyboardType="numeric"
                      value={otp[index] || ''}
                      onFocus={() => setFocusedIndex(index)}
                      onBlur={() => setFocusedIndex(-1)}
                      onChangeText={(text) => handleOTPChange(index, text)}
                      onKeyPress={handleOTPKeyPress.bind(null, index)}
                      selectTextOnFocus
                      caretHidden={true}
                    />
                  ))}
                </View>

                {/* Timer */}
                <View className="bg-black/30 rounded-xl p-4 mb-6">
                  <Text className="text-white/70 text-center">
                    Mã xác thực sẽ hết hạn sau{' '}
                    <Text className="text-yellow-500 font-bold">{formatTime(timeLeft)}</Text>
                  </Text>
                </View>

                {/* Thông báo thành công hoặc lỗi */}
                {(resendSuccess || resendError) && (
                  <Animated.View 
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(300)}
                    className={`p-4 rounded-xl mb-6 ${
                      resendSuccess ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}
                  >
                    <Text className={`text-sm font-medium text-center ${
                      resendSuccess ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {resendSuccess || resendError}
                    </Text>
                  </Animated.View>
                )}

                {/* Thông báo lỗi verify OTP */}
                {verifyError && (
                  <Animated.View 
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(300)}
                    className="bg-red-500/20 p-4 rounded-xl mb-6"
                  >
                    <Text className="text-red-400 text-sm font-medium text-center">
                      {verifyError}
                    </Text>
                  </Animated.View>
                )}

                {/* Buttons */}
                <Animated.View style={confirmButtonAnimatedStyle}>
                  <TouchableOpacity
                    className={`p-4 rounded-xl mb-4 ${
                      otp.length === 6 
                        ? 'bg-yellow-500' 
                        : 'bg-yellow-500/30'
                    }`}
                    onPress={() => otp.length === 6 && handleOTPSubmit()}
                    disabled={otp.length !== 6 || isConfirming}
                  >
                    <View className="flex-row items-center justify-center space-x-2">
                      {isConfirming ? (
                        <>
                          <Animated.View style={confirmLoadingIconStyle}>
                            <Ionicons name="sync" size={20} color="black" />
                          </Animated.View>
                          <Text className="text-black font-semibold text-lg">
                            Đang xử lý...
                          </Text>
                        </>
                      ) : (
                        <Text className="text-black font-semibold text-center text-lg">
                          Xác nhận
                        </Text>
                      )}
                    </View>
                    <Animated.View style={confirmProgressBarStyle} />
                  </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity
                  className={`p-4 rounded-xl border ${
                    timeLeft === 0 && !isResendingOTP
                      ? 'border-yellow-500 bg-yellow-500/10' 
                      : 'border-white/20'
                  }`}
                  onPress={handleResendOTP}
                  disabled={timeLeft > 0 || isResendingOTP}
                >
                  {isResendingOTP ? (
                    <View className="flex-row items-center justify-center space-x-2">
                      <Animated.View style={loadingIconStyle}>
                        <Ionicons name="sync" size={18} color="#FFB800" />
                      </Animated.View>
                      <Text className="text-yellow-500 font-semibold text-lg">
                        Đang gửi lại mã...
                      </Text>
                    </View>
                  ) : (
                    <Text className={`font-semibold text-center text-lg ${
                      timeLeft === 0 
                        ? 'text-yellow-500' 
                        : 'text-white/40'
                    }`}>
                      Gửi lại mã
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      )}
    </>
  );
} 