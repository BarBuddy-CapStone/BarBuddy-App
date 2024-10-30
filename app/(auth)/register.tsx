import { Link, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { KeyboardTypeOptions } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';

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
  const { register, error, isLoading, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const opacity = useSharedValue(0);

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

  const handleBack = () => {
    router.replace('/(auth)/welcome');
  };

  const handleRegister = async () => {
    try {
      await register(email, password, name);
      router.replace('/(tabs)');
    } catch (err) {
      // Error đã được xử lý trong AuthContext
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

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
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
            />

            <InputField
              label="Xác nhận mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Nhập lại mật khẩu"
              icon="lock-closed-outline"
              secureTextEntry
              showPasswordToggle
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
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

            {error && (
              <View className="bg-red-500/20 p-4 rounded-xl mb-4">
                <Text className="text-red-400 text-sm font-medium">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              className="bg-yellow-500 p-4 rounded-xl mt-4"
              activeOpacity={0.8}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text className="text-black font-bold text-center text-lg">
                {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
              </Text>
            </TouchableOpacity>

            <View className="flex-row items-center justify-center space-x-4 my-6">
              <View className="h-[1px] flex-1 bg-white/20" />
              <Text className="text-white/60 px-3">hoặc</Text>
              <View className="h-[1px] flex-1 bg-white/20" />
            </View>

            <TouchableOpacity 
              className="flex-row items-center justify-center space-x-3 border border-white/20 p-4 rounded-xl bg-black/40"
              activeOpacity={0.8}
              onPress={async () => {
                try {
                  await loginWithGoogle();
                  router.replace('/(tabs)');
                } catch (error) {
                  // Error đã được handle trong AuthContext
                }
              }}
            >
              <Image 
                source={require('../../assets/images/google.png')} 
                className="w-5 h-5"
              />
              <Text className="text-white font-semibold">Tiếp tục với Google</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-white/60 text-xs text-center mt-8 mb-6 px-6">
            Bằng cách đăng ký, bạn đã đồng ý với{' '}
            <Text className="text-yellow-500">Điều khoản dịch vụ</Text> và{' '}
            <Text className="text-yellow-500">Chính sách bảo mật</Text> của chúng tôi.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}
