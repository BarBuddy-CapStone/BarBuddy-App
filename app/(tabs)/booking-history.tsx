import { View, Text, TouchableOpacity, FlatList, RefreshControl, Image, ScrollView, ActivityIndicator, Modal, Alert, TextInput, Keyboard, Platform, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useCallback, useEffect, useMemo, memo, useRef } from 'react';
import { BookingHistory, bookingService } from '@/services/booking';
import { format, parseISO, differenceInDays } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { FeedbackDetail, feedbackService } from '@/services/feedback';
import { GuestView } from '@/components/GuestView';

type LoadingStatus = 'loading' | 'success' | 'error';

const LoadingPopup = ({ 
  visible, 
  status = 'loading',
  errorMessage = '',
  successMessage = ''
}: { 
  visible: boolean;
  status?: LoadingStatus;
  errorMessage?: string;
  successMessage?: string;
}) => (
  <Modal transparent visible={visible}>
    <View className="flex-1 bg-black/50 items-center justify-center">
      <View className="bg-neutral-900 rounded-2xl p-6 items-center mx-4 w-[60%] max-w-[300px]">
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#EAB308" className="mb-4" />
            <Text className="text-white text-center font-medium">
              Đang hủy đặt bàn...
            </Text>
            <Text className="text-white/60 text-center text-sm mt-2">
              Vui lòng không tắt ứng dụng
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View className="mb-4 bg-green-500/20 p-3 rounded-full">
              <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
            </View>
            <Text className="text-white text-center font-medium">
              {successMessage || 'Hủy đặt bàn thành công!'}
            </Text>
            <Text className="text-white/60 text-center text-sm mt-2">
              Yêu cầu của bạn đã được xử lý
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View className="mb-4 bg-red-500/20 p-3 rounded-full">
              <Ionicons name="close-circle" size={32} color="#EF4444" />
            </View>
            <Text className="text-white text-center font-medium">
              Hủy đặt bàn thất bại
            </Text>
            <Text className="text-white/60 text-center text-sm mt-2">
              {errorMessage || 'Vui lòng thử lại sau'}
            </Text>
          </>
        )}
      </View>
    </View>
  </Modal>
);

const FeedbackLoadingPopup = ({ 
  visible, 
  status = 'loading',
  errorMessage = '',
  successMessage = ''
}: { 
  visible: boolean;
  status?: LoadingStatus;
  errorMessage?: string;
  successMessage?: string;
}) => (
  <Modal transparent visible={visible}>
    <View className="flex-1 bg-black/50 items-center justify-center">
      <View className="bg-neutral-900 rounded-2xl p-6 items-center mx-4 w-[60%] max-w-[300px]">
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#EAB308" className="mb-4" />
            <Text className="text-white text-center font-medium">
              Đang gửi đánh giá...
            </Text>
            <Text className="text-white/60 text-center text-sm mt-2">
              Vui lòng không tắt ứng dụng
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View className="mb-4 bg-green-500/20 p-3 rounded-full">
              <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
            </View>
            <Text className="text-white text-center font-medium">
              {successMessage || 'Gửi đánh giá thành công!'}
            </Text>
            <Text className="text-white/60 text-center text-sm mt-2">
              Cảm ơn bạn đã đánh giá
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View className="mb-4 bg-red-500/20 p-3 rounded-full">
              <Ionicons name="close-circle" size={32} color="#EF4444" />
            </View>
            <Text className="text-white text-center font-medium">
              Gửi đánh giá thất bại
            </Text>
            <Text className="text-white/60 text-center text-sm mt-2">
              {errorMessage || 'Vui lòng thử lại sau'}
            </Text>
          </>
        )}
      </View>
    </View>
  </Modal>
);

const FilterTab = memo(({ 
  active, 
  label, 
  count, 
  onPress 
}: { 
  active: boolean; 
  label: string; 
  count: number;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    className={`px-4 py-2 rounded-full mr-2 ${
      active ? 'bg-yellow-500' : 'bg-neutral-900'
    }`}
  >
    <View className="flex-row items-center">
      <Text className={`${active ? 'text-black' : 'text-white'} font-medium`}>
        {label}
      </Text>
      <View className={`ml-1 px-2 rounded-full ${
        active ? 'bg-black/10' : 'bg-white/10'
      }`}>
        <Text className={`${active ? 'text-black' : 'text-white/60'} text-xs`}>
          {count}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
), (prevProps, nextProps) => {
  return (
    prevProps.active === nextProps.active &&
    prevProps.label === nextProps.label &&
    prevProps.count === nextProps.count
  );
});

const BookingItem = memo(({ booking, onRefreshList }: { 
  booking: BookingHistory;
  onRefreshList: () => void;
}) => {
  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-yellow-500 text-yellow-500';  // Đang chờ
      case 1: return 'bg-red-500 text-red-500';     // Đã hủy
      case 2: return 'bg-blue-500 text-blue-500';    // Đang phục vụ
      case 3: return 'bg-green-500 text-green-500';   // Đã hoàn thành
      default: return 'bg-gray-500 text-gray-500';
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Đang chờ';
      case 1: return 'Đã hủy';
      case 2: return 'Đang phục vụ';
      case 3: return 'Đã hoàn thành';
      default: return 'Không xác định';
    }
  };

  const canSendFeedback = useMemo(() => {
    // Kiểm tra trạng thái đã hoàn thành và chưa gửi feedback
    if (booking.status !== 3 || booking.isRated) return false;

    // Lấy ngày booking
    const bookingDate = parseISO(booking.bookingDate);
    
    // Lấy ngày hiện tại
    const today = new Date();
    
    // Tính số ngày từ ngày booking đến hiện tại
    const diffInDays = differenceInDays(today, bookingDate);
    
    // Cho phép feedback trong vòng 14 ngày
    return diffInDays <= 14;
  }, [booking.status, booking.isRated, booking.bookingDate]);

  // States cho cancel booking
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Kiểm tra thời gian hủy
  const canCancelBooking = useMemo(() => {
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
  }, [booking.status, booking.bookingDate, booking.bookingTime]);

  // Xử lý hủy đặt bàn
  const handleCancelBooking = async () => {
    // Kiểm tra lại một lần nữa trước khi hủy
    if (!canCancelBooking) {
      setLoadingStatus('error');
      setErrorMessage('Bạn chỉ có thể hủy đặt bàn trước 2 tiếng.');
      setShowLoadingPopup(true);
      return;
    }

    try {
      setShowCancelModal(false); // Đóng modal xác nhận
      setLoadingStatus('loading');
      setShowLoadingPopup(true);
      
      const result = await bookingService.cancelBooking(booking.bookingId);
      
      if (result.success) {
        setLoadingStatus('success');
        setSuccessMessage(result.message); // Sử dụng message từ backend
        // Đợi 1.5s để hiển thị thông báo thành công
        setTimeout(() => {
          setShowLoadingPopup(false);
          onRefreshList();
        }, 1500);
      }
      
    } catch (error: any) {
      setLoadingStatus('error');
      setErrorMessage(error.message || 'Không thể hủy đặt bàn. Vui lòng thử lại sau.');
      // Hiển thị error message trong 1.5s
      setTimeout(() => {
        setShowLoadingPopup(false);
        setLoadingStatus('loading'); // Reset status
        setErrorMessage('');
      }, 1500);
    }
  };

  const resetModal = () => {
    setShowCancelModal(false);
    setLoadingStatus('loading');
    setErrorMessage('');
  };

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const response = await feedbackService.getFeedbackByBooking(booking.bookingId);
      setFeedback(response);
      setShowFeedbackModal(true);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tải đánh giá. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

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

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratingStatus, setRatingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [ratingError, setRatingError] = useState('');

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

  const [showFeedbackLoadingPopup, setShowFeedbackLoadingPopup] = useState(false);
  const [feedbackLoadingStatus, setFeedbackLoadingStatus] = useState<LoadingStatus>('loading');
  const [feedbackErrorMessage, setFeedbackErrorMessage] = useState('');

  const handleSubmitRating = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Lỗi', error);
      return;
    }

    try {
      setShowRatingModal(false); // Đóng modal rating
      setFeedbackLoadingStatus('loading');
      setShowFeedbackLoadingPopup(true);
      
      const response = await feedbackService.createFeedback({
        bookingId: booking.bookingId,
        rating,
        comment: comment.trim()
      });

      setFeedbackLoadingStatus('success');
      // Lưu message từ backend
      setSuccessMessage(response.message || 'Gửi đánh giá thành công!');
      
      // Reset form
      setRating(5);
      setComment('');
      
      // Đợi 1.5s để hiển thị thông báo thành công
      setTimeout(() => {
        setShowFeedbackLoadingPopup(false);
        // Gọi onRefresh để cập nhật toàn bộ danh sách
        onRefreshList();
      }, 1500);

    } catch (error: any) {
      setFeedbackLoadingStatus('error');
      setFeedbackErrorMessage(error.message || 'Không thể gửi đánh giá. Vui lòng thử lại sau.');
      // Hiển thị error message trong 1.5s
      setTimeout(() => {
        setShowFeedbackLoadingPopup(false);
        setFeedbackLoadingStatus('loading');
        setFeedbackErrorMessage('');
        setShowRatingModal(true); // Mở lại modal rating để user có thể thử lại
      }, 1500);
    }
  };

  const resetRatingModal = () => {
    setShowRatingModal(false);
    setRating(5);
    setComment('');
    setRatingStatus('idle');
    setRatingError('');
  };

  const openRatingModal = () => {
    setShowRatingModal(true);
  };

  // Thêm hiển thị số ký tự còn lại
  const remainingChars = 500 - comment.length;
  const isCommentTooShort = comment.trim().length < 10;

  // Thêm hàm openCancelModal
  const openCancelModal = () => {
    setShowCancelModal(true);
    setLoadingStatus('loading');
    setErrorMessage('');
  };

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Theo dõi keyboard
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

  // Thêm xử lý keyboard cho iOS
  useEffect(() => {
    if (Platform.OS === 'ios') {
      const keyboardWillShow = Keyboard.addListener('keyboardWillShow', () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 150); // Tăng delay cho iOS
      });

      return () => {
        keyboardWillShow.remove();
      };
    }
  }, []);

  return (
    <>
      <TouchableOpacity 
        className="bg-neutral-900 backdrop-blur-lg rounded-2xl p-4 mb-4"
        activeOpacity={0.7}
        onPress={() => router.push(`/booking-detail/${booking.bookingId}`)}
      >
        <View className="flex-row items-start space-x-3">
          <Image 
            source={{ uri: booking.image || 'https://placehold.co/60x60/333/FFF?text=Bar' }}
            className="w-20 h-20 rounded-xl"
            style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
          />
          
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">{booking.barName}</Text>
            
            <Text className="text-white/40 text-xs mt-1">
              {booking.bookingCode}
            </Text>

            <View className={`self-start mt-2 px-3 py-1 rounded-full ${getStatusColor(booking.status)}`}>
              <Text className="text-xs font-medium">
                {getStatusText(booking.status)}
              </Text>
            </View>
          </View>
        </View>

        <View className="h-[1px] bg-white/5 my-4" />

        <View className="flex-row items-center justify-between">
          <View className="space-y-2">
            <View className="flex-row items-center space-x-3">
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                <Text className="text-gray-400 ml-1.5 text-sm">
                  {format(parseISO(booking.bookingDate), 'dd/MM/yyyy')}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                <Text className="text-gray-400 ml-1.5 text-sm">
                  {booking.bookingTime.slice(0, 5)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <Ionicons name="create-outline" size={14} color="#9CA3AF" />
              <Text className="text-gray-400 ml-1.5 text-sm">
                {format(parseISO(booking.createAt), 'HH:mm - dd/MM/yyyy')}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center space-x-2">
            {booking.status === 3 && (
              <>
                {booking.isRated ? (
                  <TouchableOpacity 
                    className="bg-white/10 px-4 py-2 rounded-full"
                    onPress={fetchFeedback}
                    disabled={loading}
                  >
                    <Text className="text-white font-bold text-sm">
                      {loading ? 'Đang tải...' : 'Xem đánh giá'}
                    </Text>
                  </TouchableOpacity>
                ) : canSendFeedback && (
                  <TouchableOpacity 
                    className="bg-yellow-500 px-4 py-2 rounded-full"
                    onPress={openRatingModal}
                  >
                    <Text className="text-black font-bold text-sm">Đánh giá</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            
            {booking.status === 0 && (
              <>
                {canCancelBooking ? (
                  <TouchableOpacity 
                    className="bg-red-500/10 px-4 py-2 rounded-full"
                    onPress={openCancelModal}
                  >
                    <Text className="text-red-500 font-bold text-sm">
                      Hủy đặt bàn
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View className="bg-neutral-800 px-4 py-2 rounded-full">
                    <Text className="text-white/40 font-bold text-sm">
                      Không thể hủy
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        <Modal
          visible={showCancelModal}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <View className="flex-1 bg-black/50 justify-center items-center p-6">
            <View className="bg-neutral-900 rounded-2xl w-full max-w-sm p-6">
              <Text className="text-white text-lg font-bold text-center mb-2">
                Xác nhận hủy đặt bàn
              </Text>
              <Text className="text-white/60 text-center mb-6">
                Bạn có chắc chắn muốn hủy đặt bàn này không?
              </Text>
              
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  className="flex-1 bg-white/10 py-3 rounded-xl"
                  onPress={() => setShowCancelModal(false)}
                >
                  <Text className="text-white font-semibold text-center">Không</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  className="flex-1 bg-red-500 py-3 rounded-xl"
                  onPress={handleCancelBooking}
                >
                  <Text className="text-white font-semibold text-center">
                    Hủy đặt bàn
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <LoadingPopup 
          visible={showLoadingPopup} 
          status={loadingStatus}
          errorMessage={errorMessage}
          successMessage={successMessage}
        />
      </TouchableOpacity>

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

                {/* Nội dung đánh gi */}
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
                {/* Header */}
                <View className="p-6 pb-0">
                  <Text className="text-white text-xl font-bold text-center">
                    Đánh giá trải nghiệm
                  </Text>
                  <TouchableOpacity
                    className="absolute right-4 top-4 p-2"
                    onPress={resetRatingModal}
                  >
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <View className="p-6">
                  {ratingStatus === 'loading' ? (
                    <View className="items-center py-4">
                      <ActivityIndicator size="large" color="#EAB308" />
                      <Text className="text-white text-lg font-bold mt-4">
                        Đang gửi đánh giá...
                      </Text>
                    </View>
                  ) : ratingStatus === 'success' ? (
                    <View className="items-center py-4">
                      <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
                      <Text className="text-white text-lg font-bold mt-4">
                        Gửi đánh giá thành công
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

      <FeedbackLoadingPopup 
        visible={showFeedbackLoadingPopup}
        status={feedbackLoadingStatus}
        errorMessage={feedbackErrorMessage}
        successMessage={successMessage}
      />
    </>
  );
}, (prevProps, nextProps) => {
  return prevProps.booking.bookingId === nextProps.booking.bookingId;
});

const BookingSkeleton = memo(() => (
  <View className="bg-white/5 rounded-xl p-4 mb-4 animate-pulse">
    <View className="flex-row mb-3">
      {/* Ảnh */}
      <View className="w-16 h-16 rounded-lg bg-white/10" />
      
      <View className="flex-1 ml-3">
        {/* Tên quán */}
        <View className="h-5 w-40 bg-white/10 rounded-full" />
        
        {/* Ngày */}
        <View className="flex-row items-center mt-2">
          <View className="h-4 w-32 bg-white/10 rounded-full" />
        </View>
        
        {/* Giờ */}
        <View className="flex-row items-center mt-2">
          <View className="h-4 w-24 bg-white/10 rounded-full" />
        </View>
      </View>

      {/* Status */}
      <View className="h-6 w-20 bg-white/10 rounded-full" />
    </View>

    {/* Bottom section */}
    <View className="bg-white/5 rounded-lg p-3">
      <View className="h-4 w-48 bg-white/10 rounded-full" />
    </View>
  </View>
), () => true);

export default function BookingHistoryScreen() {
  const { isGuest, user } = useAuth();
  const params = useLocalSearchParams();
  const fromBooking = params.fromBooking === 'true';

  // Nhóm tất cả useState hooks
  const [bookings, setBookings] = useState<BookingHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<number>(0);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterBy, setFilterBy] = useState<'createAt' | 'bookingTime'>('createAt');
  const [searchText, setSearchText] = useState('');

  // Nhóm tất cả useCallback hooks
  const handleFilterChange = useCallback((type: 'createAt' | 'bookingTime') => {
    setFilterBy(type);
    setShowFilterModal(false);
    onRefresh();
  }, []);

  const fetchBookings = useCallback(async (page: number, refresh = false) => {
    if (!user?.accountId) return;
    
    try {
      setLoading(true);
      const response = await bookingService.getBookingHistory(
        user.accountId,
        page,
        1000,
      );
      
      if (refresh) {
        setBookings(response.data.response);
        setPageIndex(1); // Reset page index khi refresh
      } else {
        setBookings(prev => [...prev, ...response.data.response]);
      }
      
      setHasMore(page < response.data.totalPage);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.accountId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setBookings([]); // Clear current bookings trước khi fetch mới
    await fetchBookings(1, true);
  }, [fetchBookings]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = pageIndex + 1;
      setPageIndex(nextPage);
      fetchBookings(nextPage);
    }
  }, [loading, hasMore, pageIndex, fetchBookings]);

  const renderBookingItem = useCallback(({ item }: { item: BookingHistory }) => (
    <BookingItem 
      booking={item}
      onRefreshList={onRefresh} 
    />
  ), [onRefresh]);

  const ListEmptyComponent = useCallback(() => (
    !loading && (
      <View className="flex-1 items-center justify-center py-20">
        <Ionicons name="calendar-outline" size={48} color="#EAB308" />
        <Text className="text-white text-lg font-bold mt-4">
          Chưa có lịch sử đặt bàn
        </Text>
        <Text className="text-white/60 text-center mt-2">
          Không có đơn đặt bàn nào ở trạng thái này
        </Text>
      </View>
    )
  ), [loading]);

  const ListFooterComponent = useCallback(() => (
    loading && bookings.length > 0 ? <BookingSkeleton /> : null
  ), [loading, bookings.length]);

  const keyExtractor = useCallback((item: BookingHistory) => item.bookingId, []);

  // Nhm tất cả useMemo hooks
  const filteredBookings = useMemo(() => {
    // Lọc theo status
    let filtered = bookings.filter(booking => booking.status === selectedStatus);

    // Lọc theo search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(booking => {
        // Tìm theo mã booking
        if (booking.bookingCode.toLowerCase().includes(searchLower)) {
          return true;
        }

        // Tìm theo giờ (định dạng HH:mm hoặc H:mm)
        const bookingTimeFormatted = booking.bookingTime.slice(0, 5); // Lấy chỉ HH:mm
        if (bookingTimeFormatted.includes(searchText)) {
          return true;
        }

        try {
          // Tìm theo ngày với nhiều định dạng
          const searchDate = searchText.trim();
          const bookingDate = parseISO(booking.bookingDate);
          
          // Trường hợp 1: Chỉ nhập ngày (1-31)
          if (/^\d{1,2}$/.test(searchDate)) {
            const day = parseInt(searchDate);
            if (day === bookingDate.getDate()) {
              return true;
            }
          }
          
          // Trường hợp 2: Ngày/tháng (dd/MM hoặc d/M)
          if (/^\d{1,2}[-/]\d{1,2}$/.test(searchDate)) {
            const [inputDay, inputMonth] = searchDate.split(/[-/]/).map(Number);
            if (
              inputDay === bookingDate.getDate() &&
              inputMonth - 1 === bookingDate.getMonth()
            ) {
              return true;
            }
          }
          
          // Trường hợp 3: Ngày/tháng/năm đầy đủ (dd/MM/yyyy)
          if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(searchDate)) {
            const [inputDay, inputMonth, inputYear] = searchDate.split(/[-/]/).map(Number);
            if (
              inputDay === bookingDate.getDate() &&
              inputMonth - 1 === bookingDate.getMonth() &&
              inputYear === bookingDate.getFullYear()
            ) {
              return true;
            }
          }
          
          // Trường hợp 4: Ngày/tháng/năm rút gọn (dd/MM/yy)
          if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/.test(searchDate)) {
            const [inputDay, inputMonth, inputYear] = searchDate.split(/[-/]/).map(Number);
            const fullYear = 2000 + inputYear;
            if (
              inputDay === bookingDate.getDate() &&
              inputMonth - 1 === bookingDate.getMonth() &&
              fullYear === bookingDate.getFullYear()
            ) {
              return true;
            }
          }

        } catch (error) {
          console.error('Error parsing date:', error);
        }

        return false;
      });
    }

    // Sort theo lựa chọn filter
    return filtered.sort((a, b) => {
      if (filterBy === 'createAt') {
        return new Date(b.createAt).getTime() - new Date(a.createAt).getTime();
      } else {
        const dateCompare = b.bookingDate.localeCompare(a.bookingDate);
        if (dateCompare !== 0) return dateCompare;
        const timeA = a.bookingTime.split(':');
        const timeB = b.bookingTime.split(':');
        return timeB[0].localeCompare(timeA[0]) || timeB[1].localeCompare(timeA[1]);
      }
    });
  }, [bookings, selectedStatus, filterBy, searchText]);

  const statusCounts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter(b => b.status === 0).length,
    cancelled: bookings.filter(b => b.status === 1).length,
    serving: bookings.filter(b => b.status === 2).length,
    completed: bookings.filter(b => b.status === 3).length,
  }), [bookings]);

  // Nhóm tất cả useEffect hooks
  useEffect(() => {
    if (user?.accountId) {
      fetchBookings(1, true);
    }
  }, [user?.accountId, fetchBookings]);

  useEffect(() => {
    if (params.reset === 'true') {
      onRefresh();
      router.setParams({
        reset: undefined,
        status: undefined,
        screen: undefined,
        initial: undefined
      });
    }
    
    const statusParam = params.status;
    if (typeof statusParam === 'string') {
      const newStatus = parseInt(statusParam);
      if (!isNaN(newStatus)) {
        setSelectedStatus(newStatus);
      }
      router.setParams({ status: undefined });
    }
  }, [params.reset, params.status, onRefresh, router]);

  useEffect(() => {
    if (params.reload === 'true') {
      // Clear param
      router.setParams({});
      // Refresh list
      onRefresh();
    }
  }, [params.reload]);

  useEffect(() => {
    if (params.fromPayment === 'true') {
      // Clear param
      router.setParams({});
      
      // Disable back gesture và hardware back button
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        return true; // Prevents default back action
      });

      return () => backHandler.remove();
    }
  }, [params.fromPayment]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Nếu từ booking hoặc payment thì không cho back
        if (fromBooking || params.fromPayment === 'true') {
          return true;
        }
        return false;
      });
      return () => backHandler.remove();
    }
  }, [fromBooking, params.fromPayment]);

  // Thêm FilterModal component
  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity 
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
        className="flex-1 bg-black/50 justify-center items-center p-6"
      >
        <View className="bg-neutral-800 rounded-2xl w-full overflow-hidden">
          <View className="p-4 border-b border-white/10">
            <Text className="text-white text-lg font-bold text-center">
              Sắp xếp theo
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => handleFilterChange('createAt')}
            className={`p-4 flex-row items-center justify-between ${
              filterBy === 'createAt' ? 'bg-yellow-500/10' : ''
            }`}
          >
            <Text className={`text-base ${
              filterBy === 'createAt' ? 'text-yellow-500' : 'text-white'
            }`}>
              Thời gian đặt bàn
            </Text>
            {filterBy === 'createAt' && (
              <Ionicons name="checkmark" size={24} color="#EAB308" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleFilterChange('bookingTime')}
            className={`p-4 flex-row items-center justify-between ${
              filterBy === 'bookingTime' ? 'bg-yellow-500/10' : ''
            }`}
          >
            <Text className={`text-base ${
              filterBy === 'bookingTime' ? 'text-yellow-500' : 'text-white'
            }`}>
              Thời gian phục vụ
            </Text>
            {filterBy === 'bookingTime' && (
              <Ionicons name="checkmark" size={24} color="#EAB308" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (isGuest || !user?.accountId) {
    return <GuestView screenName="booking-history" />;
  }

  return Platform.OS === 'ios' ? (
    // iOS Layout
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      {/* Header và Search */}
      <View className="px-4 pt-1 mb-4">
        {/* Search và Filter */}
        <View className="flex-row items-center space-x-3 mb-4">
          <View className="flex-1 bg-neutral-900 rounded-full flex-row items-center h-9 px-3">
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <TextInput
              placeholder="Tìm theo ngày, giờ, mã đặt bàn..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-white text-sm"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText !== '' && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter button */}
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            className={`h-9 w-auto rounded-full items-center justify-center ml-3 px-3 ${
              filterBy === 'bookingTime' ? 'bg-yellow-500' : 'bg-neutral-900'
            }`}
          >
            <View className="flex-row items-center">
              <Ionicons 
                name={filterBy === 'bookingTime' ? "time" : "time-outline"} 
                size={18} 
                color={filterBy === 'bookingTime' ? "black" : "white"} 
              />
              <Text className={`ml-2 text-xs font-medium ${
                filterBy === 'bookingTime' ? 'text-black' : 'text-white'
              }`}>
                {filterBy === 'bookingTime' ? 'Giờ phục vụ' : 'Thời gian đặt'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Status Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="space-x-3"
        >
          <FilterTab
            active={selectedStatus === 0}
            label="Đang chờ"
            count={statusCounts.pending}
            onPress={() => setSelectedStatus(0)}
          />
          <FilterTab
            active={selectedStatus === 2}
            label="Đang phục vụ"
            count={statusCounts.serving}
            onPress={() => setSelectedStatus(2)}
          />
          <FilterTab
            active={selectedStatus === 3}
            label="Hoàn thành"
            count={statusCounts.completed}
            onPress={() => setSelectedStatus(3)}
          />
          <FilterTab
            active={selectedStatus === 1}
            label="Đã hủy"
            count={statusCounts.cancelled}
            onPress={() => setSelectedStatus(1)}
          />
        </ScrollView>
      </View>

      {/* Content */}
      {loading && bookings.length === 0 ? (
        <ScrollView className="flex-1 px-4">
          <BookingSkeleton />
          <BookingSkeleton />
          <BookingSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ 
            padding: 16, 
            paddingBottom: 100 // Tăng padding bottom cho iOS
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#EAB308"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          initialNumToRender={5}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
        />
      )}
      <FilterModal />
    </SafeAreaView>
  ) : (
    // Android Layout
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header và Search */}
        <View className="px-4 pt-1 mb-4">
          {/* Search và Filter */}
          <View className="flex-row items-center space-x-3 mb-4">
            <View className="flex-1 bg-neutral-900 rounded-full flex-row items-center h-9 px-3">
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                placeholder="Tìm theo ngày, giờ, mã đặt bàn..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 ml-2 text-white text-sm"
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText !== '' && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter button */}
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              className={`h-9 w-auto rounded-full items-center justify-center ml-3 px-3 ${
                filterBy === 'bookingTime' ? 'bg-yellow-500' : 'bg-neutral-900'
              }`}
            >
              <View className="flex-row items-center">
                <Ionicons 
                  name={filterBy === 'bookingTime' ? "time" : "time-outline"} 
                  size={18} 
                  color={filterBy === 'bookingTime' ? "black" : "white"} 
                />
                <Text className={`ml-2 text-xs font-medium ${
                  filterBy === 'bookingTime' ? 'text-black' : 'text-white'
                }`}>
                  {filterBy === 'bookingTime' ? 'Giờ phục vụ' : 'Thời gian đặt'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Status Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="space-x-3"
          >
            <FilterTab
              active={selectedStatus === 0}
              label="Đang chờ"
              count={statusCounts.pending}
              onPress={() => setSelectedStatus(0)}
            />
            <FilterTab
              active={selectedStatus === 2}
              label="Đang phục vụ"
              count={statusCounts.serving}
              onPress={() => setSelectedStatus(2)}
            />
            <FilterTab
              active={selectedStatus === 3}
              label="Hoàn thành"
              count={statusCounts.completed}
              onPress={() => setSelectedStatus(3)}
            />
            <FilterTab
              active={selectedStatus === 1}
              label="Đã hủy"
              count={statusCounts.cancelled}
              onPress={() => setSelectedStatus(1)}
            />
          </ScrollView>
        </View>

        {/* Content */}
        {loading && bookings.length === 0 ? (
          <ScrollView className="flex-1 px-4">
            <BookingSkeleton />
            <BookingSkeleton />
            <BookingSkeleton />
          </ScrollView>
        ) : (
          <FlatList
            data={filteredBookings}
            renderItem={renderBookingItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ 
              padding: 16, 
              paddingBottom: 72 // Giữ nguyên padding cho Android
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#EAB308"
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            windowSize={5}
            initialNumToRender={5}
            ListFooterComponent={ListFooterComponent}
            ListEmptyComponent={ListEmptyComponent}
          />
        )}
        <FilterModal />
      </SafeAreaView>
    </View>
  );
}
