import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Modal, Alert, TextInput, Keyboard, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BookingDetail, bookingService, BookingDrink, BookingExtraDrink } from '@/services/booking';
import Animated, { FadeIn, useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FeedbackDetail, feedbackService } from '@/services/feedback';
import { BackHandler } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { toastConfig, showToast } from '@/components/CustomToast';
import Toast from 'react-native-toast-message';

const getStatusColor = (status: number): string => {
  switch (status) {
    case 0: return 'bg-yellow-500';  // Đang chờ
    case 1: return 'bg-red-500';     // Đã hủy
    case 2: return 'bg-blue-500';    // Đang phục vụ
    case 3: return 'bg-green-500';   // Đã hoàn thành
    default: return 'bg-gray-500';   // Mặc định
  }
};

const getStatusText = (status: number): string => {
  switch (status) {
    case 0: return 'Đang chờ';
    case 1: return 'Đã hủy';
    case 2: return 'Đang phục vụ';
    case 3: return 'Đã hoàn thành';
    default: return 'Không xác định';
  }
};

const getExtraDrinkStatusColor = (status: number): string => {
  switch (status) {
    case 0: return 'bg-yellow-500';  // Pending
    case 1: return 'bg-blue-500';    // Preparing
    case 2: return 'bg-green-500';   // Delivered
    default: return 'bg-gray-500';   // Mặc định
  }
};

const getExtraDrinkStatusText = (status: number): string => {
  switch (status) {
    case 0: return 'Đang chờ';
    case 1: return 'Đang pha chế';
    case 2: return 'Đã phục vụ';
    default: return 'Không xác định';
  }
};

const BookingDetailSkeleton = () => (
  <ScrollView className="flex-1">
    <View className="animate-pulse">
      {/* Skeleton cho thông tin quán */}
      <View className="p-6 border-b border-white/10">
        <View className="flex-row">
          <View className="w-20 h-20 rounded-xl bg-white/10" />
          <View className="flex-1 ml-4">
            <View className="h-6 w-48 bg-white/10 rounded-full mb-2" />
            <View className="h-4 w-40 bg-white/10 rounded-full" />
          </View>
        </View>
      </View>

      {/* Skeleton cho thông tin đặt bàn */}
      <View className="p-6">
        <View className="bg-white/5 rounded-xl p-4 mb-4">
          {/* Mã đơn */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="h-4 w-20 bg-white/10 rounded-full" />
            <View className="h-4 w-32 bg-white/10 rounded-full" />
          </View>

          {/* Trạng thái */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="h-4 w-24 bg-white/10 rounded-full" />
            <View className="h-6 w-20 bg-white/10 rounded-full" />
          </View>

          {/* Thời gian */}
          <View className="flex-row items-center mb-2">
            <View className="h-4 w-48 bg-white/10 rounded-full" />
          </View>

          <View className="flex-row items-center mb-4">
            <View className="h-4 w-32 bg-white/10 rounded-full" />
          </View>

          {/* Danh sách bàn */}
          <View className="mb-4">
            <View className="h-4 w-28 bg-white/10 rounded-full mb-2" />
            <View className="bg-white/5 rounded-lg p-3">
              <View className="h-4 w-full bg-white/10 rounded-full mb-2" />
              <View className="h-4 w-full bg-white/10 rounded-full mb-2" />
              <View className="h-4 w-full bg-white/10 rounded-full" />
            </View>
          </View>
        </View>

        {/* Skeleton cho thông tin khách hàng */}
        <View className="bg-white/5 rounded-xl p-4">
          <View className="h-4 w-40 bg-white/10 rounded-full mb-4" />
          <View className="space-y-3">
            <View className="h-4 w-full bg-white/10 rounded-full" />
            <View className="h-4 w-full bg-white/10 rounded-full" />
            <View className="h-4 w-full bg-white/10 rounded-full" />
          </View>
        </View>
      </View>
    </View>
  </ScrollView>
);

// Thêm component hiển thị danh sách đồ uống
const DrinksList = ({ drinks }: { drinks: BookingDrink[] }) => (
  <View className="px-6 mb-4">
    <View className="bg-neutral-900 rounded-2xl p-4">
      {/* Header với icon */}
      <View className="flex-row items-center mb-4">
        <View className="w-8 h-8 rounded-full bg-yellow-500/20 items-center justify-center mr-3">
          <MaterialCommunityIcons name="glass-wine" size={18} color="#EAB308" />
        </View>
        <Text className="text-white/80 font-semibold flex-1">
          Thức uống đã đặt trước
        </Text>
      </View>

      <View className="space-y-4">
        {drinks.map((drink, index) => (
          <View key={index} className="bg-white/5 rounded-xl p-3">
            <View className="flex-row">
              <Image 
                source={{ uri: drink.image }}
                className="w-16 h-16 rounded-xl"
              />
              <View className="flex-1 ml-3">
                <Text 
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  className="text-white font-medium text-base mb-1"
                >
                  {drink.drinkName}
                </Text>
                <Text className="text-yellow-500 font-semibold">
                  {drink.actualPrice.toLocaleString('vi-VN')}đ × {drink.quantity}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  </View>
);

// Thêm component hiển thị danh sách đồ uống gọi thêm
const ExtraDrinksList = ({ drinks }: { drinks: BookingExtraDrink[] }) => (
  <View className="px-6 mb-4">
    <View className="bg-neutral-900 rounded-2xl p-4">
      {/* Header với icon */}
      <View className="flex-row items-center mb-4">
        <View className="w-8 h-8 rounded-full bg-yellow-500/20 items-center justify-center mr-3">
          <MaterialCommunityIcons name="glass-cocktail" size={18} color="#EAB308" />
        </View>
        <Text className="text-white/80 font-semibold flex-1">
          Thức uống gọi tại quán
        </Text>
      </View>

      <View className="space-y-4">
        {drinks.map((drink, index) => (
          <View 
            key={index} 
            className="bg-white/5 rounded-xl overflow-hidden"
          >
            {/* Phần trạng thái ở trên cùng */}
            <View className={`${getExtraDrinkStatusColor(drink.status)} px-3 py-1.5 items-center`}>
              <View className="flex-row items-center">
                <MaterialCommunityIcons 
                  name={
                    drink.status === 0 ? "timer-sand" : 
                    drink.status === 1 ? "coffee-outline" : 
                    "check-circle-outline"
                  } 
                  size={14} 
                  color="black" 
                />
                <Text className="text-black font-medium text-xs ml-1">
                  {getExtraDrinkStatusText(drink.status)}
                </Text>
              </View>
            </View>

            {/* Phần thông tin đồ uống */}
            <View className="p-3">
              <View className="flex-row">
                <Image 
                  source={{ uri: drink.image }}
                  className="mt-2 w-20 h-20 rounded-xl"
                />
                
                <View className="flex-1 ml-3">
                  <Text 
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    className="text-white font-medium text-base mb-1"
                  >
                    {drink.drinkName}
                  </Text>
                  <Text className="text-yellow-500 font-semibold mb-2">
                    {drink.actualPrice.toLocaleString('vi-VN')}đ × {drink.quantity}
                  </Text>

                  {/* Thời gian đặt */}
                  {drink.createdDate && (
                    <View className="flex-row items-center">
                      <MaterialCommunityIcons 
                        name="clock-outline" 
                        size={14} 
                        color="#9CA3AF" 
                      />
                      <Text className="text-gray-400 text-xs ml-1">
                        {format(parseISO(drink.createdDate), 'HH:mm - dd/MM/yyyy')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Thông tin nhân viên phục vụ */}
              {drink.staffId && drink.status > 0 && (
                <View className="mt-3 pt-3 border-t border-white/10">
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons 
                      name="account-tie-outline" 
                      size={14} 
                      color="#9CA3AF" 
                    />
                    <Text className="text-gray-400 text-xs ml-1">
                      Nhân viên phục vụ: {drink.staffName}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  </View>
);

const BookingInfo = ({ booking }: { booking: BookingDetail }) => (
  <View className="px-6 mb-4">
    <View className="bg-neutral-900 rounded-2xl p-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-white/60">Mã đặt bàn</Text>
        <Text className="text-white font-medium">{booking.bookingCode}</Text>
      </View>

      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-white/60">Trạng thái</Text>
        <View className={`${getStatusColor(booking.status)} px-4 py-1.5 rounded-full`}>
          <Text className="text-black font-medium text-sm">
            {getStatusText(booking.status)}
          </Text>
        </View>
      </View>

      <View className="space-y-3 mb-4">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
            <Ionicons name="calendar-outline" size={18} color="#ffffff" />
          </View>
          <Text className="text-white ml-3">
            {format(parseISO(booking.bookingDate), 'EEEE, dd/MM/yyyy', { locale: vi })}
          </Text>
        </View>

        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
            <Ionicons name="time-outline" size={18} color="#ffffff" />
          </View>
          <Text className="text-white ml-3">
            {booking.bookingTime.slice(0, 5)}
          </Text>
        </View>

        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
            <Ionicons name="people-outline" size={18} color="#ffffff" />
          </View>
          <Text className="text-white ml-3">
            {booking.numOfPeople} khách hàng
          </Text>
        </View>
      </View>

      <View>
        <Text className="text-white/80 font-semibold mb-3">Bàn đã đặt</Text>
        <View className="flex-row flex-wrap gap-2">
          {booking.tableNameList.map((table, index) => (
            <View key={index} className="bg-neutral-800 px-3 py-2 rounded-lg">
              <Text className="text-white">{table}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  </View>
);

const CustomerInfo = ({ booking }: { booking: BookingDetail }) => (
  <View className="px-6 mb-4">
    <View className="bg-neutral-900 rounded-2xl p-4">
      <Text className="text-white/80 font-semibold mb-4">Thông tin khách hàng</Text>
      <View className="space-y-4">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
            <Ionicons name="person-outline" size={18} color="#ffffff" />
          </View>
          <Text className="text-white ml-3">{booking.customerName}</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
            <Ionicons name="call-outline" size={18} color="#ffffff" />
          </View>
          <Text className="text-white ml-3">{booking.customerPhone}</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
            <Ionicons name="mail-outline" size={18} color="#ffffff" />
          </View>
          <Text className="text-white ml-3">{booking.customerEmail}</Text>
        </View>
      </View>
    </View>
  </View>
);

const PaymentInfo = ({ booking }: { booking: BookingDetail }) => {
  const totalDrinkPrice = booking.totalPrice || 0;
  const additionalFee = booking.additionalFee || 0;
  const hasPreOrderDrinks = booking.bookingDrinksList.length > 0;

  return (
    <View className="px-6 mb-4">
      <View className="bg-neutral-900 rounded-2xl p-4">
        <Text className="text-white/80 font-semibold mb-4">Chi tiết thanh toán</Text>
        <View className="space-y-3">
          {/* Chỉ hiển thị khi có đặt nước */}
          {hasPreOrderDrinks && (
            <View className="flex-row justify-between">
              <Text className="text-white/60">Tổng tiền thức uống đặt trước</Text>
              <Text className="text-white">
                {totalDrinkPrice.toLocaleString('vi-VN')}đ
              </Text>
            </View>
          )}
          
          {/* Luôn hiển thị phí phát sinh */}
          <View className="flex-row justify-between">
            <Text className="text-white/60">Tổng tiền thức uống đặt thêm</Text>
            <Text className="text-white">
              {booking.status === 3 
                ? additionalFee > 0
                  ? `${additionalFee.toLocaleString('vi-VN')}đ`
                  : 'Không có'
                : additionalFee > 0
                  ? `${additionalFee.toLocaleString('vi-VN')}đ`
                  : 'Chưa có'
              }
            </Text>
          </View>
          
          {/* Chỉ hiển thị tổng cộng khi đơn đã hoàn thành */}
          {booking.status === 3 && (
            <View className="flex-row justify-between pt-3 mt-3 border-t border-white/10">
              <Text className="text-white font-semibold">Tổng cộng</Text>
              <Text className="text-yellow-500 font-semibold">
                {(totalDrinkPrice + additionalFee).toLocaleString('vi-VN')}đ
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const QRTicket = ({ qrTicket, bookingCode }: { qrTicket: string, bookingCode: string }) => {
  const [showFullQR, setShowFullQR] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const downloadImage = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Ứng dụng cần quyền truy cập thư viện ảnh để lưu hình ảnh.');
      return;
    }

    try {
      setIsSaving(true);
      const fileUri = FileSystem.cacheDirectory + `qr-code-${bookingCode}.jpg`;
      const { uri } = await FileSystem.downloadAsync(qrTicket, fileUri);

      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('BarBuddy', asset, false);

      //Alert.alert('Thành công', 'Đã lưu ảnh QR vào thư viện của bạn.');
      showToast(
        'success',
        'Đã lưu mã QR',
        'Mã QR đã được lưu vào thư viện'
      );
    } catch (error) {
      console.error(error);
      //Alert.alert('Lỗi', 'Không thể lưu ảnh. Vui lòng thử lại sau.');
      showToast(
        'error',
        'Lỗi',
        'Không thể lưu ảnh. Vui lòng thử lại sau.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <View className="px-6 mb-4">
        <View className="bg-neutral-900 rounded-2xl p-4 items-center">
          <Text className="text-white/80 font-semibold mb-4">Mã QR Check-in</Text>
          <TouchableOpacity
            onPress={() => setShowFullQR(true)}
            className="active:opacity-80"
          >
            <Image 
              source={{ uri: qrTicket }}
              className="w-48 h-48"
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text className="text-white/60 text-center mt-4 text-sm">
            Nhấn vào mã QR để phóng to
          </Text>
          <TouchableOpacity
            onPress={downloadImage}
            className="bg-yellow-500 px-4 py-2 rounded-full mt-4"
            disabled={isSaving}
          >
            <Text className="text-black font-semibold">
              {isSaving ? 'Đang lưu...' : 'Lưu ảnh QR'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showFullQR}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View className="flex-1 bg-black/95 justify-center items-center">
          <TouchableOpacity
            className="absolute top-12 right-6 z-10"
            onPress={() => setShowFullQR(false)}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>

          <View className="w-screen h-screen items-center justify-center p-8">
            <Image 
              source={{ uri: qrTicket }}
              className="w-full aspect-square"
              resizeMode="contain"
            />
            <Text className="text-white/60 text-center mt-6">
              Vui lòng xuất trình mã QR này khi check-in tại quán
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

// Sửa lại function kiểm tra thời gian hủy
const canCancelBooking = (booking: BookingDetail) => {
  if (booking.status !== 0) return false;

  // Parse ngày và giờ đặt bàn
  const [hours, minutes] = booking.bookingTime.split(':');
  const bookingDateTime = parseISO(booking.bookingDate);
  
  // Set giờ và phút cho bookingDateTime
  bookingDateTime.setHours(parseInt(hours));
  bookingDateTime.setMinutes(parseInt(minutes));
  
  const now = new Date();
  
  // Tính khoảng cách giữa thời điểm hiện tại và thời gian đặt bàn (tính bằng phút)
  const diffInMinutes = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60);
  
  // Cho phép hủy nếu còn hơn 120 phút (2 tiếng)
  return diffInMinutes > 120;
};

export default function BookingDetailScreen() {
  const { id, reload, preventBack } = useLocalSearchParams<{ 
    id: string, 
    reload?: string,
    preventBack?: string 
  }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const scrollY = useSharedValue(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const HEADER_SCROLL_DISTANCE = 200;

  // Thêm animated style cho border
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE - 100, HEADER_SCROLL_DISTANCE],
      [0, 0, 1],
      Extrapolation.CLAMP
    );

    return {
      backgroundColor: `rgba(0, 0, 0, ${opacity})`,
      borderBottomWidth: opacity === 1 ? 1.5 : 0, // Chỉ hiện border khi opacity = 1
      borderBottomColor: '#171717', // neutral-900
    };
  });

  const titleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 100],
      [0, 1],
      { extrapolateRight: Extrapolation.CLAMP }
    );

    return {
      opacity,
    };
  });

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 200],
      [1, 0],
      { extrapolateRight: Extrapolation.CLAMP }
    );

    const scale = interpolate(
      scrollY.value,
      [0, 200],
      [1, 0.9],
      { extrapolateRight: Extrapolation.CLAMP }
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // Tách logic load booking thành function riêng
  const loadBookingDetail = async () => {
    try {
      setIsLoading(true);
      const response = await bookingService.getBookingDetail(id);
      setBooking(response.data);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tải thông tin đặt bàn');
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect để load data ban đầu và khi có reload param
  useEffect(() => {
    loadBookingDetail();
  }, [id, reload]); // Thêm reload vào dependencies

  // Thêm states để quản lý modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelStatus, setCancelStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Sửa lại handleCancelBooking để kiểm tra lại trước khi hủy
  const handleCancelBooking = async () => {
    if (!booking) return;
    
    // Kiểm tra lại một lần nữa trước khi hủy
    if (!canCancelBooking(booking)) {
      setCancelStatus('error');
      setErrorMessage('Bạn chỉ có thể hủy đặt bàn trước 2 tiếng.');
      return;
    }

    try {
      setCancelStatus('loading');
      setIsCanceling(true);
      await bookingService.cancelBooking(booking.bookingId);
      
      setCancelStatus('success');
      
      // Đợi 1.5s để hiển thị thông báo thành công
      setTimeout(() => {
        // Tắt modal trước
        setShowCancelModal(false);
        // Sau đó mới chuyển trang
        router.push({
          pathname: '/(tabs)/booking-history',
          params: { reload: 'true' }
        });
      }, 1500);
      
    } catch (error: any) {
      setCancelStatus('error');
      setErrorMessage(error.message || 'Không thể hủy đặt bàn. Vui lòng thử lại sau.');
    } finally {
      setIsCanceling(false);
    }
  };

  const resetModal = () => {
    setShowCancelModal(false);
    setCancelStatus('idle');
    setErrorMessage('');
  };

  // Thêm states cho feedback
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);

  // Thêm function renderStars
  const renderStars = (rating: number) => {
    return (
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color="#EAB308"
          />
        ))}
      </View>
    );
  };

  // Thêm function fetch feedback
  const fetchFeedback = async () => {
    if (!booking) return;
    try {
      setLoadingFeedback(true);
      const response = await feedbackService.getFeedbackByBooking(booking.bookingId);
      setFeedback(response.data.data);
      setShowFeedbackModal(true);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải đánh giá. Vui lòng thử lại sau.');
    } finally {
      setLoadingFeedback(false);
    }
  };

  // Thêm states cho rating modal
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratingStatus, setRatingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [ratingError, setRatingError] = useState('');

  // Thêm state hasRated
  const [hasRated, setHasRated] = useState(false);

  // Thêm các functions xử lý rating
  const validateForm = (): string | null => {
    if (rating < 1 || rating > 5) {
      return 'Đánh giá phải từ 1 đến 5 !';
    }

    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      return 'Nội dung đánh giá không thể trống !';
    }

    if (trimmedComment.length < 10) {
      return 'Nội dung đánh giá phải có ít nhất 10 kí tự !';
    }

    if (trimmedComment.length > 500) {
      return 'Nội dung đánh giá không được vượt quá 500 kí tự !';
    }

    return null;
  };

  // Cập nhật lại hàm handleSubmitRating
  const handleSubmitRating = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Lỗi', error);
      return;
    }

    try {
      setIsSubmitting(true);
      setRatingStatus('loading');
      
      await feedbackService.createFeedback({
        bookingId: booking!.bookingId,
        rating,
        comment: comment.trim()
      });

      setRatingStatus('success');
      setHasRated(true); // Đánh dấu là đã đánh giá
      
      // Reset form
      setRating(5);
      setComment('');
      
      setTimeout(() => {
        setShowRatingModal(false);
        setRatingStatus('idle');
        
        // Cập nhật lại booking để hiển thị nội dung xem đánh giá
        if (booking) {
          setBooking({
            ...booking,
            isRated: true
          });
        }
      }, 1500);

    } catch (error: any) {
      setRatingStatus('error');
      setRatingError(error.message || 'Không thể gửi đánh giá. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetRatingModal = () => {
    setShowRatingModal(false);
    setRating(5);
    setComment('');
    setRatingStatus('idle');
    setRatingError('');
  };

  // Thêm computed values
  const remainingChars = 500 - comment.length;
  const isCommentTooShort = comment.trim().length < 10;

  // Thêm useEffect theo dõi keyboard
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Thêm useEffect để xử lý hardware back button
  useEffect(() => {
    if (preventBack === 'true') {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          // Chuyển về trang booking history
          router.replace({
            pathname: '/(tabs)/booking-history',
            params: { reload: 'true' }
          });
          return true; // Prevent default back behavior
        }
      );

      return () => backHandler.remove();
    }
  }, [preventBack]);

  // Cập nhật lại nút back trong header
  const handleBack = () => {
    if (preventBack === 'true' || hasRated) {
      router.replace({
        pathname: '/(tabs)/booking-history',
        params: { 
          reload: 'true',
          status: hasRated ? '3' : undefined
        }
      });
    } else {
      router.back();
    }
  };

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header luôn hiển thị */}
        <Animated.View 
          className="absolute top-0 left-0 right-0 z-50"
          style={headerAnimatedStyle}
        >
          <SafeAreaView edges={['top']}>
            <View className="px-4 h-14 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={handleBack}
                className="bg-black/20 backdrop-blur-sm p-2 rounded-full w-10 h-10 items-center justify-center"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>

              <Animated.View 
                style={titleAnimatedStyle}
                className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-full"
              >
                <Text className="text-white font-medium">Chi tiết đặt bàn</Text>
              </Animated.View>

              <View className="w-10" />
            </View>
          </SafeAreaView>
        </Animated.View>

        {isLoading ? (
          <BookingDetailSkeleton />
        ) : booking ? (
          <>
            <Animated.ScrollView 
              className="flex-1"
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: booking?.status === 3 || booking?.status === 2 ? 60 : 16 // Thêm padding khi có nút đánh giá
              }}
            >
              <Animated.View entering={FadeIn}>
                {/* Bar Info với animation */}
                <Animated.View 
                  className="relative h-56"
                  style={imageAnimatedStyle}
                >
                  <Image 
                    source={{ uri: booking.images[0] }}
                    className="absolute w-full h-full"
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
                    className="absolute bottom-0 left-0 right-0 h-40"
                  >
                    <View className="absolute bottom-0 p-6 w-full">
                      <Text className="text-yellow-500 text-xl font-bold mb-2">
                        {booking.barName}
                      </Text>
                      <View className="flex-row items-center">
                        <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                        <Text className="text-gray-400 text-sm ml-1 flex-1">
                          {booking.barAddress}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Animated.View>

                <View className="pb-6">
                  <BookingInfo booking={booking} />
                  
                  {(booking.status === 0 || booking.status === 2) && booking.qrTicket && (
                    <QRTicket qrTicket={booking.qrTicket} bookingCode={booking.bookingCode} />
                  )}

                  {booking.bookingDrinksList.length > 0 && (
                    <DrinksList drinks={booking.bookingDrinksList} />
                  )}

                  {booking.bookingDrinkExtraResponses?.length > 0 && (
                    <ExtraDrinksList drinks={booking.bookingDrinkExtraResponses} />
                  )}

                  {(booking.totalPrice !== null || booking.additionalFee !== null) && (
                    <PaymentInfo booking={booking} />
                  )}

                  <CustomerInfo booking={booking} />

                  {booking.note && (
                    <View className="px-6 mb-4">
                      <View className="bg-neutral-900 rounded-2xl p-4">
                        <Text className="text-white/80 font-semibold mb-2">Ghi chú</Text>
                        <Text className="text-white">{booking.note}</Text>
                      </View>
                    </View>
                  )}

                  {booking.status === 0 && (
                    <View className="px-6 mt-1">
                      {canCancelBooking(booking) ? (
                        <TouchableOpacity
                          className="bg-red-500 py-4 rounded-xl"
                          onPress={() => setShowCancelModal(true)}
                        >
                          <Text className="text-white font-bold text-center text-lg">
                            Hủy đặt bàn
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View className="bg-neutral-800 py-4 rounded-xl">
                          <Text className="text-white/40 font-bold text-center text-lg">
                            Không thể hủy (chỉ được hủy trước 2 tiếng)
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </Animated.View>
            </Animated.ScrollView>

            {/* Footer trong suốt cho nút đánh giá hoặc gọi thức uống */}
            {(booking?.status === 3 || booking?.status === 2) && (
              <View className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-black/0 backdrop-blur-sm mb-2">
                {booking.status === 3 ? (
                  booking.isRated ? (
                    <TouchableOpacity 
                      className="bg-yellow-500/95 backdrop-blur-sm py-4 rounded-xl"
                      onPress={fetchFeedback}
                      disabled={loadingFeedback}
                    >
                      <Text className="text-black font-bold text-center text-lg">
                        {loadingFeedback ? 'Đang tải...' : 'Xem đánh giá'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      className="bg-yellow-500/95 py-4 rounded-xl"
                      onPress={() => setShowRatingModal(true)}
                    >
                      <Text className="text-black font-bold text-center text-lg">
                        Đánh giá
                      </Text>
                    </TouchableOpacity>
                  )
                ) : (
                  // Nút gọi thức uống cho status = 2
                  <TouchableOpacity 
                    className="bg-yellow-500/95 py-4 rounded-xl"
                    onPress={() => router.push({
                      pathname: `/order-drink/${booking.bookingId}` as any,
                      params: { 
                        barId: booking.barId
                      }
                    })}
                  >
                    <Text className="text-black font-bold text-center text-lg">
                      Gọi thức uống
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Cập nhật Toast Container với config */}
            <Toast config={toastConfig} />

            <Modal
              visible={showCancelModal}
              transparent
              animationType="fade"
              statusBarTranslucent
            >
              <View className="flex-1 bg-black/50 justify-center items-center p-6">
                <View className="bg-neutral-800 rounded-2xl w-full p-6">
                  {cancelStatus === 'loading' ? (
                    <View className="items-center py-4">
                      <ActivityIndicator size="large" color="#EAB308" />
                      <Text className="text-white text-lg font-bold mt-4">
                        Đang hủy đặt bàn...
                      </Text>
                    </View>
                  ) : cancelStatus === 'success' ? (
                    <View className="items-center py-4">
                      <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
                      <Text className="text-white text-lg font-bold mt-4">
                        Đã hủy đặt bàn thành công
                      </Text>
                    </View>
                  ) : cancelStatus === 'error' ? (
                    <>
                      <View className="items-center py-4">
                        <Ionicons name="alert-circle" size={48} color="#EF4444" />
                        <Text className="text-white text-lg font-bold mt-4">
                          Không thể hủy đặt bàn
                        </Text>
                        <Text className="text-white/60 text-center mt-2">
                          {errorMessage}
                        </Text>
                      </View>
                      <View className="flex-row space-x-3 mt-4">
                        <TouchableOpacity
                          className="flex-1 bg-white/10 py-3 rounded-xl"
                          onPress={resetModal}
                        >
                          <Text className="text-white font-semibold text-center">Đóng</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="flex-1 bg-yellow-500 py-3 rounded-xl"
                          onPress={() => {
                            setCancelStatus('idle');
                            setErrorMessage('');
                          }}
                        >
                          <Text className="text-black font-semibold text-center">Thử lại</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text className="text-white text-lg font-bold text-center mb-2">
                        Xác nhận hủy đặt bàn
                      </Text>
                      <Text className="text-white/60 text-center mb-6">
                        Bạn có chắc chắn muốn hủy đặt bàn này không?
                      </Text>
                      
                      <View className="flex-row space-x-3">
                        <TouchableOpacity
                          className="flex-1 bg-white/10 py-3 rounded-xl"
                          onPress={resetModal}
                          disabled={isCanceling}
                        >
                          <Text className="text-white font-semibold text-center">Không</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          className="flex-1 bg-red-500 py-3 rounded-xl"
                          onPress={handleCancelBooking}
                          disabled={isCanceling}
                        >
                          <Text className="text-white font-semibold text-center">
                            Hủy đặt bàn
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </Modal>

            <Modal
              visible={showFeedbackModal}
              transparent
              animationType="fade"
              statusBarTranslucent
              onRequestClose={() => setShowFeedbackModal(false)}
            >
              <TouchableOpacity 
                className="flex-1 bg-black/50 justify-center items-center p-6"
                activeOpacity={1}
                onPress={() => setShowFeedbackModal(false)}
              >
                <TouchableOpacity 
                  activeOpacity={1} 
                  onPress={(e) => e.stopPropagation()}
                  className="w-full"
                >
                  <View className="bg-neutral-800 rounded-2xl w-full overflow-hidden">
                    {/* Header với ảnh bar */}
                    <Image
                      source={{ uri: feedback?.barImage }}
                      className="w-full h-32"
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      className="absolute top-0 left-0 right-0 h-32"
                    />

                    {/* Nút đóng */}
                    <TouchableOpacity
                      className="absolute top-3 right-3 bg-black/20 p-2 rounded-full"
                      onPress={() => setShowFeedbackModal(false)}
                    >
                      <Ionicons name="close" size={20} color="white" />
                    </TouchableOpacity>

                    <View className="p-6">
                      {/* Thông tin bar */}
                      <Text className="text-yellow-500 text-xl font-bold mb-1">
                        {feedback?.barName}
                      </Text>
                      <View className="flex-row items-center mb-4">
                        <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                        <Text 
                          className="text-gray-400 text-sm ml-1 flex-1"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {feedback?.barAddress}
                        </Text>
                      </View>

                      {/* Thông tin người đánh giá */}
                      <View className="flex-row items-center mb-6">
                        <Image
                          source={{ uri: feedback?.customerAvatar }}
                          className="w-10 h-10 rounded-full"
                        />
                        <View className="ml-3 flex-1">
                          <Text className="text-white font-medium">
                            {feedback?.customerName}
                          </Text>
                          <Text className="text-gray-400 text-sm">
                            {feedback?.createdTime && format(parseISO(feedback.createdTime), 'HH:mm - dd/MM/yyyy')}
                          </Text>
                        </View>
                        <View className="bg-yellow-500/10 px-3 py-1 rounded-full">
                          {feedback?.rating && renderStars(feedback.rating)}
                        </View>
                      </View>

                      {/* Nội dung đánh giá */}
                      <View className="bg-neutral-700 rounded-xl p-4">
                        <Text className="text-white/90 leading-6">
                          {feedback?.comment}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>

            {/* Thêm Rating Modal */}
            <Modal
              visible={showRatingModal}
              transparent
              animationType="fade"
              statusBarTranslucent
              onRequestClose={resetRatingModal}
            >
              <TouchableOpacity 
                activeOpacity={1}
                onPress={resetRatingModal}
                className="flex-1 bg-black/50 justify-center items-center"
              >
                <TouchableOpacity 
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                  className={`w-[90%] max-h-[90%] ${keyboardHeight > 0 ? 'mb-5' : ''}`}
                  style={{ 
                    marginBottom: keyboardHeight > 0 ? keyboardHeight : 0
                  }}
                >
                  <ScrollView
                    ref={scrollViewRef}
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <View className="bg-neutral-800 rounded-2xl overflow-hidden">
                      <Image 
                        source={{ uri: booking?.images[0] }}
                        className="w-full h-32"
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        className="absolute top-0 left-0 right-0 h-32"
                      />

                      <TouchableOpacity
                        className="absolute top-3 right-3 bg-black/20 p-2 rounded-full"
                        onPress={resetRatingModal}
                      >
                        <Ionicons name="close" size={20} color="white" />
                      </TouchableOpacity>

                      <View className="p-6">
                        <Text className="text-yellow-500 text-xl font-bold mb-4">
                          {booking?.barName}
                        </Text>

                        {ratingStatus === 'loading' ? (
                          <View className="items-center py-8">
                            <ActivityIndicator size="large" color="#EAB308" />
                            <Text className="text-white text-lg font-bold mt-4">
                              Đang gửi đánh giá...
                            </Text>
                          </View>
                        ) : ratingStatus === 'success' ? (
                          <View className="items-center py-8">
                            <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
                            <Text className="text-white text-lg font-bold mt-4">
                              Đã gửi đánh giá thành công
                            </Text>
                          </View>
                        ) : ratingStatus === 'error' ? (
                          <>
                            <View className="items-center py-4">
                              <Ionicons name="alert-circle" size={48} color="#EF4444" />
                              <Text className="text-white text-lg font-bold mt-4">
                                Không thể gửi đánh giá
                              </Text>
                              <Text className="text-white/60 text-center mt-2">
                                {ratingError}
                              </Text>
                            </View>
                            <View className="flex-row space-x-3 mt-4">
                              <TouchableOpacity
                                className="flex-1 bg-white/10 py-3 rounded-xl"
                                onPress={resetRatingModal}
                              >
                                <Text className="text-white font-semibold text-center">Đóng</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                className="flex-1 bg-yellow-500 py-3 rounded-xl"
                                onPress={() => setRatingStatus('idle')}
                              >
                                <Text className="text-black font-semibold text-center">Thử lại</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        ) : (
                          <>
                            <Text className="text-white/60 text-base mb-6">
                              Hãy chia sẻ trải nghiệm của bạn về quán bar này
                            </Text>

                            {/* Rating stars */}
                            <View className="flex-row justify-center space-x-2 mb-6">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                  key={star}
                                  onPress={() => setRating(star)}
                                >
                                  <Ionicons
                                    name={star <= rating ? "star" : "star-outline"}
                                    size={32}
                                    color="#EAB308"
                                  />
                                </TouchableOpacity>
                              ))}
                            </View>

                            {/* Comment input với character counter */}
                            <View className="mb-6">
                              <TextInput
                                className={`bg-white/5 rounded-xl p-4 text-white ${
                                  isCommentTooShort ? 'border border-red-500' : ''
                                }`}
                                placeholder="Nhập đánh giá của bạn (ít nhất 10 ký tự)..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={4}
                                value={comment}
                                onChangeText={setComment}
                                style={{ 
                                  textAlignVertical: 'top',
                                  minHeight: 120,
                                  maxHeight: 200
                                }}
                                maxLength={500}
                                onFocus={() => {
                                  setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                  }, 100);
                                }}
                              />
                              <View className="flex-row justify-between mt-2">
                                <Text className={`${
                                  isCommentTooShort ? 'text-red-500' : 'text-white/60'
                                }`}>
                                  {isCommentTooShort ? 'Tối thiểu 10 ký tự' : ''}
                                </Text>
                                <Text className="text-white/60">
                                  {remainingChars}/500
                                </Text>
                              </View>
                            </View>

                            {/* Submit button */}
                            <TouchableOpacity
                              className={`py-3 rounded-xl ${
                                isCommentTooShort ? 'bg-yellow-500/50' : 'bg-yellow-500'
                              }`}
                              onPress={handleSubmitRating}
                              disabled={isSubmitting || isCommentTooShort}
                            >
                              <Text className="text-black font-semibold text-center text-lg">
                                Gửi đánh giá
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  </ScrollView>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          </>
        ) : null}
      </SafeAreaView>
    </View>
  );
}
