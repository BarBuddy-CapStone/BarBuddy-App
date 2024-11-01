import { View, Text, TouchableOpacity, FlatList, RefreshControl, Image, ScrollView, ActivityIndicator, Modal, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { BookingHistory, bookingService } from '@/services/booking';
import { format, parseISO, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { FeedbackDetail, feedbackService } from '@/services/feedback';

const GuestView = () => {
  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        <View className="px-6 py-4 border-b border-white/10">
          <Text className="text-yellow-500 text-2xl font-bold">
            Lịch sử đặt bàn
          </Text>
        </View>

        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="lock-closed-outline" size={64} color="#EAB308" />
          <Text className="text-white text-xl font-bold mt-6 text-center">
            Đăng nhập để xem lịch sử
          </Text>
          <Text className="text-white/60 text-center mt-2 mb-6">
            Bạn cần đăng nhập để xem lịch sử đặt bàn của mình
          </Text>
          
          <TouchableOpacity
            className="bg-yellow-500 w-full py-3 rounded-xl"
            onPress={() => router.push('/login')}
          >
            <Text className="text-black font-bold text-center text-lg">
              Đăng nhập ngay
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-4 w-full py-3 rounded-xl border border-yellow-500"
            onPress={() => router.push('/register')}
          >
            <Text className="text-yellow-500 font-bold text-center text-lg">
              Đăng ký tài khoản
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const FilterTab = ({ 
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
      active ? 'bg-yellow-500' : 'bg-white/5'
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
);

const BookingItem = ({ booking, onRefreshList }: { 
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

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelStatus, setCancelStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const openCancelModal = () => {
    setShowCancelModal(true);
  };

  const handleCancelBooking = async () => {
    try {
      setCancelStatus('loading');
      setIsCanceling(true);
      await bookingService.cancelBooking(booking.bookingId);
      
      // Đánh dấu thành công
      setCancelStatus('success');
      
      // Cập nhật lại danh sách booking sau 1.5s
      setTimeout(() => {
        onRefreshList();
        setShowCancelModal(false);
        setCancelStatus('idle');
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

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const response = await feedbackService.getFeedbackByBooking(booking.bookingId);
      setFeedback(response.data.data);
      setShowFeedbackModal(true);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải đánh giá. Vui lòng thử lại sau.');
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
        bookingId: booking.bookingId,
        rating,
        comment: comment.trim()
      });

      setRatingStatus('success');
      
      // Reset form ngay sau khi gửi thành công
      setRating(5);
      setComment('');
      
      setTimeout(() => {
        setShowRatingModal(false);
        setRatingStatus('idle');
        onRefreshList();
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

  const openRatingModal = () => {
    setShowRatingModal(true);
  };

  // Thêm hiển thị số ký tự còn lại
  const remainingChars = 500 - comment.length;
  const isCommentTooShort = comment.trim().length < 10;

  return (
    <>
      <TouchableOpacity 
        className="bg-white/[0.06] backdrop-blur-lg rounded-2xl p-4 mb-4"
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
              <TouchableOpacity 
                className="bg-red-500/10 px-4 py-2 rounded-full"
                onPress={openCancelModal}
              >
                <Text className="text-red-500 font-bold text-sm">Hủy đặt bàn</Text>
              </TouchableOpacity>
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
            <View className="bg-[#1C1C1E] rounded-2xl w-full p-6">
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
            <View className="bg-[#1C1C1E] rounded-2xl w-full overflow-hidden">
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
                  <Text className="text-gray-400 text-sm ml-1 flex-1">
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
                <View className="bg-white/5 rounded-xl p-4">
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
          className="flex-1 bg-black/50 justify-center items-center p-6"
          activeOpacity={1}
          onPress={resetRatingModal}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
            className="w-full"
          >
            <View className="bg-[#1C1C1E] rounded-2xl w-full overflow-hidden">
              <Image 
                source={{ uri: booking.image || 'https://placehold.co/60x60/333/FFF?text=Bar' }}
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
                <Text className="text-yellow-500 text-xl font-bold mb-1">
                  {booking.barName}
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
                        style={{ textAlignVertical: 'top' }}
                        maxLength={500}
                      />
                      <View className="flex-row justify-between mt-2">
                        {isCommentTooShort && (
                          <Text className="text-red-500 text-xs">
                            Còn thiếu {10 - comment.trim().length} ký tự
                          </Text>
                        )}
                        <Text className={`text-xs ${
                          remainingChars <= 50 ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          {remainingChars} ký tự còn lại
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const BookingSkeleton = () => (
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
);

export default function BookingHistoryScreen() {
  const { isGuest, user } = useAuth();
  const [bookings, setBookings] = useState<BookingHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<number>(0);
  const params = useLocalSearchParams();

  // Thêm states cho filter
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterBy, setFilterBy] = useState<'createAt' | 'bookingTime'>('createAt');

  // Thêm hàm xử lý filter
  const handleFilterChange = (type: 'createAt' | 'bookingTime') => {
    setFilterBy(type);
    setShowFilterModal(false);
    // Thực hiện filter dữ liệu ở đây
    onRefresh();
  };

  const filteredBookings = useMemo(() => {
    // Lọc theo status
    const filtered = bookings.filter(booking => booking.status === selectedStatus);

    // Sort theo lựa chọn filter
    return filtered.sort((a, b) => {
      if (filterBy === 'createAt') {
        // Sort theo thời gian tạo đơn
        return new Date(b.createAt).getTime() - new Date(a.createAt).getTime();
      } else {
        // Sort theo ngày và giờ sử dụng
        // So sánh ngày trước
        const dateCompare = b.bookingDate.localeCompare(a.bookingDate);
        if (dateCompare !== 0) return dateCompare;

        // Nếu cùng ngày, so sánh giờ
        const timeA = a.bookingTime.split(':');
        const timeB = b.bookingTime.split(':');
        
        // So sánh giờ
        const hourCompare = Number(timeB[0]) - Number(timeA[0]);
        if (hourCompare !== 0) return hourCompare;
        
        // So sánh phút nếu cùng giờ
        return Number(timeB[1]) - Number(timeA[1]);
      }
    });
  }, [bookings, selectedStatus, filterBy]);

  const statusCounts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter(b => b.status === 0).length,
    cancelled: bookings.filter(b => b.status === 1).length,
    serving: bookings.filter(b => b.status === 2).length,
    completed: bookings.filter(b => b.status === 3).length,
  }), [bookings]);

  const fetchBookings = async (page: number, refresh = false) => {
    if (!user?.accountId) return;
    
    try {
      setLoading(true);
      const response = await bookingService.getBookingHistory(
        user.accountId,
        page,
        10
      );
      
      if (refresh) {
        setBookings(response.data.response);
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
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPageIndex(1);
    fetchBookings(1, true);
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = pageIndex + 1;
      setPageIndex(nextPage);
      fetchBookings(nextPage);
    }
  };

  useEffect(() => {
    if (user?.accountId) {
      fetchBookings(1, true);
    }
  }, [user?.accountId]);

  useEffect(() => {
    if (params.reload === 'true') {
      onRefresh();
      // Reset param reload
      router.setParams({ reload: 'false' });
    }
    
    // Kiểm tra và chuyển đổi kiểu dữ liệu cho status
    const statusParam = params.status;
    if (typeof statusParam === 'string') {
      const newStatus = parseInt(statusParam);
      if (!isNaN(newStatus)) {
        setSelectedStatus(newStatus);
      }
      // Reset param status
      router.setParams({ status: undefined });
    }
  }, [params.reload, params.status]);

  if (isGuest || !user?.accountId) {
    return <GuestView />;
  }

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header với nút filter */}
        <View className="px-6 py-4 border-b border-white/10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-yellow-500 text-2xl font-bold">
              Lịch sử đặt bàn
            </Text>
            
            <TouchableOpacity 
              onPress={() => setShowFilterModal(true)}
              className="bg-white/10 p-2 rounded-full"
            >
              <Ionicons name="filter" size={20} color="#EAB308" />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
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

        {/* Modal Filter */}
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
            <TouchableOpacity 
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
              className="bg-[#1C1C1E] w-full rounded-2xl overflow-hidden"
            >
              <View className="p-4 border-b border-white/10">
                <Text className="text-white text-lg font-bold text-center">
                  Sắp xếp theo
                </Text>
              </View>

              <TouchableOpacity 
                onPress={() => handleFilterChange('createAt')}
                className="flex-row items-center p-4 border-b border-white/10"
              >
                <View className="flex-1">
                  <Text className="text-white font-medium">Ngày đặt bàn</Text>
                  <Text className="text-white/60 text-sm">Sắp xếp theo thời gian tạo đơn</Text>
                </View>
                {filterBy === 'createAt' && (
                  <Ionicons name="checkmark-circle" size={24} color="#EAB308" />
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => handleFilterChange('bookingTime')}
                className="flex-row items-center p-4"
              >
                <View className="flex-1">
                  <Text className="text-white font-medium">Ngày sử dụng</Text>
                  <Text className="text-white/60 text-sm">Sắp xếp theo thời gian phục vụ</Text>
                </View>
                {filterBy === 'bookingTime' && (
                  <Ionicons name="checkmark-circle" size={24} color="#EAB308" />
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {loading && bookings.length === 0 ? (
          <ScrollView className="flex-1 px-4">
            <BookingSkeleton />
            <BookingSkeleton />
            <BookingSkeleton />
          </ScrollView>
        ) : (
          <FlatList
            data={filteredBookings}
            renderItem={({ item }) => (
              <BookingItem 
                booking={item} 
                onRefreshList={onRefresh}
              />
            )}
            keyExtractor={item => item.bookingId}
            contentContainerStyle={{ padding: 16 }}
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
            ListFooterComponent={() => (
              loading && bookings.length > 0 ? <BookingSkeleton /> : null
            )}
            ListEmptyComponent={() => (
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
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
