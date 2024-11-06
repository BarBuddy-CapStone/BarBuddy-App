import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Modal, Animated as RNAnimated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { accountService, type Account } from '@/services/account';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Animated, { FadeIn, withRepeat, withSequence, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { validateFullname, validatePhone, validateBirthDate } from '@/utils/validation';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';

// Thêm type cho trạng thái kết quả
type ResultStatus = 'loading' | 'success' | 'error' | null;

// Cập nhật component LoadingPopup
const LoadingPopup = ({ 
  visible, 
  message = 'Đang xử lý...', 
  status = 'loading',
  onClose
}: { 
  visible: boolean, 
  message?: string,
  status?: ResultStatus,
  onClose?: () => void 
}) => {
  const [showModal, setShowModal] = useState(visible);
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      RNAnimated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  if (!showModal) return null;

  return (
    <Modal 
      transparent 
      visible={showModal}
      onRequestClose={() => {
        // Chỉ cho phép đóng khi không phải đang loading
        if (status !== 'loading') {
          onClose?.();
        }
      }}
    >
      <RNAnimated.View 
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: fadeAnim,
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            // Chỉ cho phép đóng khi không phải đang loading
            if (status !== 'loading') {
              onClose?.();
            }
          }}
          className="flex-1 w-full items-center justify-center"
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            className="bg-neutral-900 rounded-2xl p-6 items-center mx-4"
          >
            {status === 'loading' && (
              <>
                <ActivityIndicator size="large" color="#EAB308" className="mb-4" />
                <Text className="text-white text-center font-medium">
                  {message}
                </Text>
                <Text className="text-white/60 text-center text-sm mt-2">
                  Vui lòng không tắt ứng dụng
                </Text>
              </>
            )}

            {status === 'success' && (
              <>
                <View className="w-16 h-16 bg-green-500/20 rounded-full items-center justify-center mb-4">
                  <Ionicons name="checkmark" size={32} color="#22C55E" />
                </View>
                <Text className="text-white text-center font-medium">
                  {message}
                </Text>
              </>
            )}

            {status === 'error' && (
              <>
                <View className="w-16 h-16 bg-red-500/20 rounded-full items-center justify-center mb-4">
                  <Ionicons name="close" size={32} color="#EF4444" />
                </View>
                <Text className="text-white text-center font-medium">
                  {message}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </RNAnimated.View>
    </Modal>
  );
};

// Thêm component Skeleton
const Skeleton = ({ className }: { className: string }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      )
    };
  });

  return (
    <Animated.View
      style={animatedStyle}
      className={`bg-neutral-800 ${className}`}
    />
  );
};

// Thêm hook để theo dõi trạng thái keyboard
const useKeyboardStatus = () => {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  return isKeyboardVisible;
};

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    fullname: '',
    phone: ''
  });
  const [errors, setErrors] = useState({
    fullname: '',
    phone: '',
    dob: ''
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { updateUserData } = useAuth();
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [popupStatus, setPopupStatus] = useState<ResultStatus>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const isKeyboardVisible = useKeyboardStatus();

  useEffect(() => {
    fetchAccountDetail();
  }, [id]);

  useEffect(() => {
    if (account?.dob) {
      setSelectedDate(new Date(account.dob));
    }
  }, [account]);

  const fetchAccountDetail = async () => {
    try {
      const data = await accountService.getAccountInfo(id as string);
      setAccount(data);
      setEditedData({
        fullname: data.fullname,
        phone: data.phone
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể tải thông tin tài khoản',
        position: 'bottom'
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors = {
      fullname: '',
      phone: '',
      dob: ''
    };

    // Validate fullname
    const fullnameError = validateFullname(editedData.fullname);
    if (fullnameError) newErrors.fullname = fullnameError;

    // Validate phone
    const phoneError = validatePhone(editedData.phone);
    if (phoneError) newErrors.phone = phoneError;

    // Validate dob
    if (selectedDate) {
      const dateStr = format(selectedDate, 'dd/MM/yyyy');
      const dobError = validateBirthDate(dateStr);
      if (dobError) newErrors.dob = dobError;
    }

    setErrors(newErrors);

    // Return true nếu không có lỗi
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoadingMessage('Đang cập nhật thông tin...');
      setPopupStatus('loading');
      setShowLoadingPopup(true);

      const updateData = {
        fullname: editedData.fullname,
        phone: editedData.phone,
        dob: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : undefined
      };

      const updatedAccount = await accountService.updateAccountInfo(id as string, updateData);
      setAccount(updatedAccount);
      
      await updateUserData({
        fullname: updatedAccount.fullname,
        phone: updatedAccount.phone
      });

      setIsEditing(false);
      setLoadingMessage('Đã cập nhật thông tin thành công');
      setPopupStatus('success');
      
      // Tự động đóng sau 1 giây nếu thành công
      setTimeout(() => {
        setShowLoadingPopup(false);
        setPopupStatus(null);
      }, 1000);
    } catch (error) {
      let errorMessage = 'Không thể cập nhật thông tin';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setLoadingMessage(errorMessage);
      setPopupStatus('error');
      
      // Tự động đóng sau 1.5 giây nếu lỗi
      setTimeout(() => {
        setShowLoadingPopup(false);
        setPopupStatus(null);
      }, 1500);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      setEditedData(prev => ({
        ...prev,
        dob: date.toISOString()
      }));
      setErrors(prev => ({ ...prev, dob: '' }));
    }
  };

  const handleTempDateChange = (event: any, date?: Date) => {
    if (date) {
      setTempDate(date);
    }
  };

  const handleConfirmDate = () => {
    if (tempDate) {
      setSelectedDate(tempDate);
      setErrors(prev => ({ ...prev, dob: '' }));
    }
    setShowDatePickerModal(false);
  };

  const handleChangeAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Cần cấp quyền',
          text2: 'Vui lòng cấp quyền truy cập thư viện ảnh để thay đổi ảnh đại diện',
          position: 'bottom'
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
        exif: false,
        allowsMultipleSelection: false
      });

      if (!result.canceled && result.assets[0]) {
        setLoadingMessage('Đang cập nhật ảnh đại diện...');
        setPopupStatus('loading');
        setShowLoadingPopup(true);
        
        try {
          const response = await accountService.uploadAvatar(
            id as string, 
            result.assets[0].uri
          );
          
          setAccount(prev => prev ? {
            ...prev,
            image: response.url
          } : null);

          await updateUserData({ image: response.url });

          setLoadingMessage('Đã cập nhật ảnh đại diện thành công');
          setPopupStatus('success');
          
          // Tự động đóng sau 1 giây nếu thành công
          setTimeout(() => {
            setShowLoadingPopup(false);
            setPopupStatus(null);
          }, 1000);
        } catch (error) {
          let errorMessage = 'Không thể cập nhật ảnh đại diện';
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          setLoadingMessage(errorMessage);
          setPopupStatus('error');
          
          // Tự động đóng sau 1.5 giây nếu lỗi
          setTimeout(() => {
            setShowLoadingPopup(false);
            setPopupStatus(null);
          }, 1500);
        }
      }
    } catch (error) {
      setLoadingMessage('Không thể mở thư viện ảnh');
      setPopupStatus('error');
    }
  };

  // Thêm hàm xử lý hủy
  const handleCancel = () => {
    // Reset lại các giá trị đã chỉnh sửa về ban đầu
    if (account) {
      setEditedData({
        fullname: account.fullname,
        phone: account.phone
      });
      setSelectedDate(account.dob ? new Date(account.dob) : null);
    }
    setErrors({
      fullname: '',
      phone: '',
      dob: ''
    });
    setIsEditing(false);
  };

  // Thêm hàm đóng popup
  const handleClosePopup = () => {
    setShowLoadingPopup(false);
    setPopupStatus(null);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          {/* Header Skeleton - Bỏ border */}
          <View className="flex-row items-center justify-between px-6 py-4">
            <View className="flex-row items-center">
              <Skeleton className="w-6 h-6 rounded-full mr-4" />
              <Skeleton className="w-40 h-6 rounded-lg" />
            </View>
            <Skeleton className="w-20 h-6 rounded-lg" />
          </View>

          <ScrollView className="flex-1 p-6">
            {/* Avatar Skeleton */}
            <View className="items-center mb-8">
              <Skeleton className="w-32 h-32 rounded-full" />
              <Skeleton className="w-32 h-8 rounded-full mt-4" />
            </View>

            <View className="space-y-6">
              {/* Email Skeleton */}
              <View>
                <Skeleton className="w-12 h-4 rounded mb-2" />
                <Skeleton className="w-full h-14 rounded-xl" />
              </View>

              {/* Fullname Skeleton */}
              <View>
                <Skeleton className="w-16 h-4 rounded mb-2" />
                <Skeleton className="w-full h-14 rounded-xl" />
              </View>

              {/* Phone Skeleton */}
              <View>
                <Skeleton className="w-24 h-4 rounded mb-2" />
                <Skeleton className="w-full h-14 rounded-xl" />
              </View>

              {/* Birthday Skeleton */}
              <View>
                <Skeleton className="w-20 h-4 rounded mb-2" />
                <Skeleton className="w-full h-14 rounded-xl" />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1 mb-4" edges={['top']}>
        {/* Header */}
        <Animated.View 
          entering={FadeIn.duration(300)}
          className="px-4 pt-1 mb-4"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-9 h-9 items-center justify-center"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text className="text-white text-xl font-bold">
                Thông tin cá nhân
              </Text>
            </View>
            
            {!isEditing && (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                className="bg-yellow-500/10 px-4 py-2 rounded-full"
              >
                <Text className="text-yellow-500 font-medium">
                  Chỉnh sửa
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView 
            className="flex-1 px-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Avatar Section */}
            <Animated.View entering={FadeIn} className="items-center mb-8">
              <View className="relative w-32 h-32">
                <Image
                  source={
                    account?.image 
                      ? { uri: account.image }
                      : require('@/assets/images/default-avatar.png')
                  }
                  className="w-32 h-32 rounded-full bg-neutral-800"
                  onLoadStart={() => {
                    setImageLoading(true);
                    setImageError(false);
                  }}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => {
                    setImageError(true);
                    setImageLoading(false);
                  }}
                  defaultSource={require('@/assets/images/default-avatar.png')}
                />
                {(imageLoading || uploadingAvatar) && (
                  <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                    <ActivityIndicator color="#EAB308" />
                  </View>
                )}
              </View>
              <TouchableOpacity 
                className={`bg-yellow-500/10 px-4 py-2 rounded-full mt-4 ${
                  isEditing || uploadingAvatar ? 'opacity-50' : ''
                }`}
                onPress={handleChangeAvatar}
                disabled={uploadingAvatar || isEditing}
              >
                <Text className={`text-yellow-500 font-medium ${
                  isEditing || uploadingAvatar ? 'opacity-50' : ''
                }`}>
                  Đổi ảnh đại diện
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Form Fields */}
            <View className="space-y-6">
              {/* Email */}
              <View>
                <Text className="text-white/60 mb-2">Email</Text>
                <View className="bg-neutral-900 p-4 rounded-xl">
                  <Text className="text-white">{account?.email}</Text>
                </View>
              </View>

              {/* Họ tên */}
              <View>
                <Text className="text-white/60 mb-2">Họ tên</Text>
                {isEditing ? (
                  <View>
                    <TextInput
                      value={editedData.fullname}
                      onChangeText={(text) => {
                        setEditedData(prev => ({ ...prev, fullname: text }));
                        setErrors(prev => ({ ...prev, fullname: '' }));
                      }}
                      className={`bg-neutral-900 p-4 rounded-xl text-white ${
                        errors.fullname ? 'border border-red-500' : ''
                      }`}
                      placeholderTextColor="#9CA3AF"
                    />
                    {errors.fullname ? (
                      <Text className="text-red-500 text-sm mt-1">{errors.fullname}</Text>
                    ) : null}
                  </View>
                ) : (
                  <View className="bg-neutral-900 p-4 rounded-xl">
                    <Text className="text-white">{account?.fullname}</Text>
                  </View>
                )}
              </View>

              {/* Số điện thoại */}
              <View>
                <Text className="text-white/60 mb-2">Số điện thoại</Text>
                {isEditing ? (
                  <View>
                    <TextInput
                      value={editedData.phone}
                      onChangeText={(text) => {
                        setEditedData(prev => ({ ...prev, phone: text }));
                        setErrors(prev => ({ ...prev, phone: '' }));
                      }}
                      className={`bg-neutral-900 p-4 rounded-xl text-white ${
                        errors.phone ? 'border border-red-500' : ''
                      }`}
                      keyboardType="phone-pad"
                      placeholderTextColor="#9CA3AF"
                    />
                    {errors.phone ? (
                      <Text className="text-red-500 text-sm mt-1">{errors.phone}</Text>
                    ) : null}
                  </View>
                ) : (
                  <View className="bg-neutral-900 p-4 rounded-xl">
                    <Text className="text-white">{account?.phone}</Text>
                  </View>
                )}
              </View>

              {/* Ngày sinh */}
              <View>
                <Text className="text-white/60 mb-2">Ngày sinh</Text>
                {isEditing ? (
                  <View>
                    <TouchableOpacity
                      onPress={() => {
                        if (Platform.OS === 'ios') {
                          setTempDate(selectedDate || new Date());
                          setShowDatePickerModal(true);
                        } else {
                          setShowDatePicker(true);
                        }
                      }}
                      className={`bg-neutral-900 p-4 rounded-xl flex-row items-center ${
                        errors.dob ? 'border border-red-500' : ''
                      }`}
                    >
                      <Ionicons 
                        name="calendar-outline" 
                        size={20} 
                        color="#9CA3AF"
                        style={{ marginRight: 12 }}
                      />
                      <Text className="text-white flex-1">
                        {selectedDate 
                          ? format(selectedDate, 'dd/MM/yyyy', { locale: vi })
                          : 'Chọn ngày sinh'}
                      </Text>
                      <Ionicons 
                        name="chevron-down-outline" 
                        size={20} 
                        color="#9CA3AF" 
                      />
                    </TouchableOpacity>
                    {errors.dob ? (
                      <Text className="text-red-500 text-sm mt-1">{errors.dob}</Text>
                    ) : null}
                    
                    {Platform.OS === 'ios' ? (
                      <Modal
                        visible={showDatePickerModal}
                        transparent
                        animationType="slide"
                      >
                        <View className="flex-1 justify-end bg-black/50">
                          <View className="bg-neutral-900 rounded-t-xl">
                            <View className="flex-row justify-between items-center p-4 border-b border-white/10">
                              <TouchableOpacity 
                                onPress={() => setShowDatePickerModal(false)}
                              >
                                <Text className="text-white font-medium">Huỷ</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                onPress={handleConfirmDate}
                              >
                                <Text className="text-yellow-500 font-medium">Xong</Text>
                              </TouchableOpacity>
                            </View>
                            <DateTimePicker
                              value={tempDate || selectedDate || new Date()}
                              mode="date"
                              display="spinner"
                              onChange={handleTempDateChange}
                              maximumDate={new Date()}
                              minimumDate={new Date(1900, 0, 1)}
                              textColor="white"
                              themeVariant="dark"
                              locale="vi-VN"
                            />
                          </View>
                        </View>
                      </Modal>
                    ) : (
                      showDatePicker && (
                        <DateTimePicker
                          value={selectedDate || new Date()}
                          mode="date"
                          display="default"
                          onChange={handleDateChange}
                          maximumDate={new Date()}
                          minimumDate={new Date(1900, 0, 1)}
                        />
                      )
                    )}
                  </View>
                ) : (
                  <View className="bg-neutral-900 p-4 rounded-xl flex-row items-center">
                    <Ionicons 
                      name="calendar-outline" 
                      size={20} 
                      color="#9CA3AF"
                      style={{ marginRight: 12 }}
                    />
                    <Text className="text-white">
                      {account?.dob 
                        ? format(new Date(account.dob), 'dd/MM/yyyy', { locale: vi })
                        : 'Chưa có ngày sinh'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer buttons */}
        {isEditing && !isKeyboardVisible && (
          <Animated.View 
            entering={FadeIn}
            className="px-6 py-3 border-t border-white/10 bg-black"
          >
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={handleCancel}
                className="flex-1 bg-neutral-900 py-3 rounded-xl items-center"
              >
                <Text className="text-white font-medium">
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                className="flex-1 bg-yellow-500 py-3 rounded-xl items-center"
              >
                <Text className="text-black font-medium">
                  Lưu
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </SafeAreaView>

      <LoadingPopup 
        visible={showLoadingPopup} 
        message={loadingMessage}
        status={popupStatus}
        onClose={handleClosePopup}
      />
    </View>
  );
} 