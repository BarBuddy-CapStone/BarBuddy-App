import { Link, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View, ScrollView, Platform, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withTiming,
  runOnJS,
  withSpring,
  withRepeat,
  withSequence,
  FadeIn, 
  FadeOut,
  SlideInUp,
  SlideOutDown
} from 'react-native-reanimated';
import { KeyboardTypeOptions } from 'react-native';
import { Easing } from 'react-native-reanimated';
import { validateRegisterForm } from '@/utils/validation';
import { authService } from '@/services/auth';

// Thêm interface InputFieldProps
interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  keyboardType?: KeyboardTypeOptions;
}

// Tách InputField ra ngoài component chính
const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  icon, 
  secureTextEntry = false,
  showPasswordToggle = false,
  showPassword = false,
  onTogglePassword,
  keyboardType = 'default'
}) => (
  <View className="mb-4">
    <Text className="text-white text-sm font-medium mb-2">{label}</Text>
    <View className="flex-row items-center border border-white/30 rounded-xl p-4 bg-black/40">
      <Ionicons name={icon} size={20} color="#FFF" />
      <TextInput
        className="flex-1 text-white text-base ml-3"
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.5)"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !showPassword}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
      {showPasswordToggle && onTogglePassword && (
        <TouchableOpacity onPress={onTogglePassword} className="p-1">
          <Ionicons 
            name={showPassword ? "eye-off-outline" : "eye-outline"} 
            size={20} 
            color="#FFF"
          />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export default function RegisterScreen() {
  const router = useRouter();
  const { register, loginWithGoogle, isLoading } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const opacity = useSharedValue(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleButtonScale = useSharedValue(1);
  const googleLoadingRotate = useSharedValue(0);
  const googleProgressWidth = useSharedValue(0);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const otpInputRefs = useRef(Array(6).fill(0).map(() => React.createRef<TextInput>()));
  const [isResendingOTP, setIsResendingOTP] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // Thêm các shared values cho animation
  const buttonScale = useSharedValue(1);
  const loadingRotate = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  // Thêm các shared values cho animation nút Xác nhận
  const confirmButtonScale = useSharedValue(1);
  const confirmLoadingRotate = useSharedValue(0);
  const confirmProgressWidth = useSharedValue(0);
  const [isConfirming, setIsConfirming] = useState(false);

  // Thêm các animated styles
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

  // Hàm format ngày sinh theo DD/MM/YYYY
  const formatBirthDate = (text: string) => {
    // Xóa các ký tự không phải số
    const cleaned = text.replace(/[^0-9]/g, '');
    
    // Format theo DD/MM/YYYY
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    } else if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    
    // Giới hạn độ dài
    if (formatted.length <= 10) {
      setBirthDate(formatted);
    }
  };

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
  }, []);

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

  const handleResendOTP = async () => {
    try {
      setIsResendingOTP(true);
      setResendSuccess(null);
      setResendError(null);
      
      // Bắt đầu animation xoay
      googleLoadingRotate.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear
        }),
        -1
      );
      
      // Convert birthDate từ DD/MM/YYYY sang ISO string
      const [day, month, year] = birthDate.split('/');
      const isoDate = new Date(Number(year), Number(month) - 1, Number(day)).toISOString();

      const response = await register(
        email,
        password,
        confirmPassword,
        name,
        phone,
        isoDate
      );

      if (response.statusCode === 200) {
        // Xóa tất cả thông báo lỗi khi gửi mã thành công
        setResendError(null);
        setVerifyError(null);
        setTimeLeft(5);
        setResendSuccess('Mã xác thực đã được gửi lại thành công!');
        
        // Tự động ẩn thông báo thành công sau 3 giây
        setTimeout(() => {
          setResendSuccess(null);
        }, 3000);
      } else {
        // Xử lý trường hợp API trả về lỗi
        setResendError(response.message || 'Có lỗi xảy ra khi gửi lại mã');
      }
    } catch (err: any) {
      setResendError(err.message || 'Có lỗi xảy ra khi gửi lại mã');
      setResendSuccess(null);
    } finally {
      setIsResendingOTP(false);
      // Dừng animation
      googleLoadingRotate.value = 0;
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleRegister = async () => {
    try {
      const validationError = validateRegisterForm(
        email,
        password,
        confirmPassword,
        name,
        phone,
        birthDate
      );

      if (validationError) {
        setLocalError(validationError);
        return;
      }

      setLocalError(null);
      setIsSubmitting(true);

      // Bắt đầu animation
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
        -1
      );

      // Convert birthDate từ DD/MM/YYYY sang ISO string
      const [day, month, year] = birthDate.split('/');
      const isoDate = new Date(Number(year), Number(month) - 1, Number(day)).toISOString();

      const response = await register(
        email,
        password,
        confirmPassword,
        name,
        phone,
        isoDate
      );

      if (response.statusCode === 200) {
        // Animation hoàn thành
        progressWidth.value = withTiming(0);
        buttonScale.value = withSequence(
          withSpring(1.05),
          withSpring(1)
        );
        setShowOTPModal(true);
      }
    } catch (err: any) {
      // Reset animation khi có lỗi
      progressWidth.value = withTiming(0);
      buttonScale.value = withSpring(1);
      loadingRotate.value = 0;
      setIsSubmitting(false);
      setLocalError(err.message);
    }
  };

  const handleOTPSubmit = async () => {
    try {
      setVerifyError(null);
      setIsConfirming(true);

      // Bắt đầu animation
      confirmButtonScale.value = withSpring(0.95);
      confirmProgressWidth.value = withTiming(100, {
        duration: 1000,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1)
      });
      
      // Animation loading xoay
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
        // Animation hoàn thành
        confirmProgressWidth.value = withTiming(0);
        confirmButtonScale.value = withSequence(
          withSpring(1.05),
          withSpring(1)
        );
        
        setShowOTPModal(false);
        resetRegisterButton();
        setShowSuccessModal(true);
        setRedirectCountdown(5);
      }
    } catch (err: any) {
      // Reset animation khi có lỗi
      confirmProgressWidth.value = withTiming(0);
      confirmButtonScale.value = withSpring(1);
      confirmLoadingRotate.value = 0;
      setVerifyError(err.message);
    } finally {
      setIsConfirming(false);
      confirmLoadingRotate.value = 0;
    }
  };

  const handleRedirectToLogin = () => {
    router.replace('/(auth)/login');
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
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
      setGoogleError(null);
      setLocalError(null);

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
      
      if (!response) {
        // Reset animation và hiển thị thông báo khi hủy
        googleProgressWidth.value = withTiming(0, undefined, (finished) => {
          if (finished) {
            runOnJS(setGoogleError)('Đăng nhập đã bị hủy');
          }
        });
        googleButtonScale.value = withSpring(1);
        googleLoadingRotate.value = 0;
        setIsGoogleLoading(false);
        return;
      }

      // Animation hoàn thành và chuyển trang
      googleProgressWidth.value = withTiming(0);
      googleButtonScale.value = withSequence(
        withSpring(1.05),
        withSpring(1)
      );

      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);

    } catch (error: any) {
      // Reset animation khi có lỗi
      googleProgressWidth.value = withTiming(0);
      googleButtonScale.value = withSpring(1);
      googleLoadingRotate.value = 0;
      setIsGoogleLoading(false);
      
      setGoogleError(error.message || 'Có lỗi xảy ra khi đăng nhập với Google');
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    // Chỉ cho phép nhập số
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newOTP = otp.split('');
    newOTP[index] = value;
    const newOTPString = newOTP.join('');
    setOtp(newOTPString);

    // Tự động chuyển sang ô tiếp theo khi nhập
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.current?.focus();
    }
  };

  const handleOTPKeyPress = (index: number, { nativeEvent: { key } }: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (key === 'Backspace') {
      const newOTP = otp.split('');
      // Tìm vị trí cuối cùng có giá trị
      const lastFilledIndex = newOTP.reduce((last, curr, idx) => curr ? idx : last, -1);
      
      if (lastFilledIndex !== -1) {
        // Xóa giá trị ở vị trí cuối cùng
        newOTP[lastFilledIndex] = '';
        setOtp(newOTP.join(''));
        // Focus vào ô vừa xóa
        otpInputRefs.current[lastFilledIndex]?.current?.focus();
      }
    }
  };

  // Tạo animated style cho spinner
  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${googleLoadingRotate.value}deg` }]
  }));

  // Thêm useEffect để xử lý redirect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (showSuccessModal && redirectCountdown > 0) {
      timer = setInterval(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);
    }

    // Khi đếm ngược về 0, chuyển trang
    if (showSuccessModal && redirectCountdown === 0) {
      router.replace('/(auth)/login');
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [showSuccessModal, redirectCountdown]);

  // Thêm hàm reset states và animations
  const resetRegisterButton = () => {
    setIsSubmitting(false);
    progressWidth.value = withTiming(0);
    buttonScale.value = withSpring(1);
    loadingRotate.value = 0;
  };

  // Cập nhật lại hàm đóng modal
  const handleCloseOTPModal = () => {
    setShowOTPModal(false);
    resetRegisterButton(); // Reset trạng thái nút đăng ký
  };

  return (
    <>
      {/* Main Content */}
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
            {/* Header - Thêm padding bottom */}
            <View className="px-6 pb-4 border-b border-white/10">
              <View className="flex-row items-center mt-4">
                <TouchableOpacity 
                  onPress={handleBack}
                  className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
                >
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-yellow-500 text-2xl font-bold ml-4">
                  Đăng ký
                </Text>
              </View>
            </View>

            {/* Content - Giảm margin top vì đã có padding bottom ở header */}
            <ScrollView 
              className="flex-1 px-6"
              showsVerticalScrollIndicator={false}
            >
              {/* Form - Điều chỉnh margin top */}
              <View className="mt-6">
                <InputField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Nhập email của bạn"
                  icon="mail-outline"
                  keyboardType="email-address"
                />

                <InputField
                  label="Mật khẩu"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Nhập mật khẩu"
                  icon="lock-closed-outline"
                  secureTextEntry
                  showPasswordToggle
                  showPassword={showPasswords}
                  onTogglePassword={() => setShowPasswords(!showPasswords)}
                />

                <InputField
                  label="Xác nhận mật khẩu"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Nhập lại mật khẩu"
                  icon="lock-closed-outline"
                  secureTextEntry
                  showPasswordToggle
                  showPassword={showPasswords}
                  onTogglePassword={() => setShowPasswords(!showPasswords)}
                />

                <InputField
                  label="Họ tên"
                  value={name}
                  onChangeText={setName}
                  placeholder="Nhập họ tên của bạn"
                  icon="person-outline"
                />

                <InputField
                  label="Ngày sinh"
                  value={birthDate}
                  onChangeText={formatBirthDate}
                  placeholder="DD/MM/YYYY"
                  icon="calendar-outline"
                  keyboardType="numeric"
                />

                <InputField
                  label="Số điện thoại"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Nhập số điện thoại"
                  icon="call-outline"
                  keyboardType="phone-pad"
                />

                {localError && (
                  <View className="bg-red-500/20 p-4 rounded-xl mb-4">
                    <Text className="text-red-400 text-sm font-medium text-center">{localError}</Text>
                  </View>
                )}

                <Animated.View style={buttonAnimatedStyle}>
                  <TouchableOpacity
                    className="bg-yellow-500 p-4 mt-2 rounded-xl overflow-hidden"
                    activeOpacity={0.8}
                    onPress={handleRegister}
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
                          Đăng ký
                        </Text>
                      )}
                    </View>
                    <Animated.View style={progressBarStyle} />
                  </TouchableOpacity>
                </Animated.View>

                <View className="flex-row items-center justify-center space-x-4 my-6">
                  <View className="h-[1px] flex-1 bg-white/20" />
                  <Text className="text-white/60 px-3">hoặc</Text>
                  <View className="h-[1px] flex-1 bg-white/20" />
                </View>

                {googleError && (
                  <View className="bg-red-500/20 p-4 rounded-xl mb-4">
                    <Text className="text-red-400 text-sm font-medium text-center">{googleError}</Text>
                  </View>
                )}

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

              <Text className="text-white/60 text-xs text-center mt-8 mb-6 px-6">
                Bằng cách đăng ký, bạn đã đồng ý với{' '}
                <Text className="text-yellow-500">Điều khoản dịch vụ</Text> và{' '}
                <Text className="text-yellow-500">Chính sách bảo mật</Text> của chúng tôi.
              </Text>
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
          {/* Backdrop với animation */}
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

                {/* Thông báo lỗi */}
                {localError && (
                  <Animated.View 
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(300)}
                    className="bg-red-500/20 p-4 rounded-xl mb-6"
                  >
                    <Text className="text-red-400 text-sm font-medium text-center">
                      {localError}
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
                      <Animated.View style={spinnerStyle}>
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

      {showSuccessModal && (
        <View 
          className="absolute inset-0 items-center justify-center bg-black/40"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
          }}
        >
          <Animated.View 
            entering={FadeIn.duration(300)}
            className="w-[90%] max-w-[400px] bg-[#1A1A1A] rounded-3xl overflow-hidden"
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
              <Text className="text-yellow-500 text-xl font-bold text-center">
                Đăng ký thành công
              </Text>
            </View>

            {/* Content */}
            <View className="p-6">
              <View className="items-center mb-6">
                <Animated.View
                  entering={FadeIn.delay(300).duration(500)}
                  className="w-16 h-16 bg-green-500/20 rounded-full items-center justify-center mb-4"
                >
                  <Ionicons name="checkmark-circle" size={40} color="#22C55E" />
                </Animated.View>
                <Text className="text-white text-base text-center mb-2">
                  Chúc mừng bạn đã đăng ký thành công!
                </Text>
                <Text className="text-white/60 text-sm text-center">
                  Tự động chuyển đến trang đăng nhập sau{' '}
                  <Text className="text-yellow-500 font-bold">{redirectCountdown}s</Text>
                </Text>
              </View>

              {/* Button */}
              <TouchableOpacity
                className="bg-yellow-500 p-4 rounded-xl"
                onPress={handleRedirectToLogin}
              >
                <Text className="text-black font-bold text-center text-base">
                  Đăng nhập ngay
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </>
  );
}
