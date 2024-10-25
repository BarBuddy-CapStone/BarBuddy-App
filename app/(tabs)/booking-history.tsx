import { View, Text, TouchableOpacity, FlatList, RefreshControl, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useState, useCallback, useEffect } from 'react';
import { BookingHistory, bookingService } from '@/services/booking';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useRouter } from 'expo-router';

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

const BookingItem = ({ booking }: { booking: BookingHistory }) => {
  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-yellow-500';  // Đang chờ
      case 1: return 'bg-red-500';     // Đã hủy
      case 2: return 'bg-blue-500';    // Đang phục vụ
      case 3: return 'bg-green-500';   // Đã hoàn thành
      default: return 'bg-gray-500';
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

  // Chỉ hiện nút đánh giá khi đơn đã hoàn thành và chưa được đánh giá
  const showRatingButton = booking.status === 3 && booking.isRated === false;

  return (
    <TouchableOpacity 
      className="bg-white/5 rounded-xl p-4 mb-4"
      activeOpacity={0.7}
      onPress={() => router.push(`/booking-detail/${booking.bookingId}`)}
    >
      <View className="flex-row mb-3">
        <Image 
          source={{ uri: booking.image || 'https://placehold.co/60x60/333/FFF?text=Bar' }}
          className="w-16 h-16 rounded-lg"
        />
        <View className="flex-1 ml-3">
          <Text className="text-white font-bold text-lg">{booking.barName}</Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
            <Text className="text-gray-400 ml-1">
              {format(parseISO(booking.bookingDate), 'EEEE, dd/MM/yyyy', { locale: vi })}
            </Text>
          </View>
          <View className="flex-row items-center mt-1">
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text className="text-gray-400 ml-1">
              {booking.bookingTime.slice(0, 5)}
            </Text>
          </View>
        </View>
        <View className={`${getStatusColor(booking.status)} px-3 py-1 rounded-full h-6 items-center justify-center`}>
          <Text className="text-black text-xs font-bold">
            {getStatusText(booking.status)}
          </Text>
        </View>
      </View>

      <View className="bg-white/5 rounded-lg p-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-white/60 text-sm">
            Ngày đặt: {format(parseISO(booking.createAt), 'dd/MM/yyyy HH:mm')}
          </Text>
          {showRatingButton && (
            <TouchableOpacity 
              className="bg-yellow-500 px-3 py-1 rounded-full"
              onPress={() => {
                // TODO: Navigate to rating screen
                // router.push(`/rating/${booking.bookingId}`);
              }}
            >
              <Text className="text-black text-xs font-bold">Đánh giá</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Thêm nút Hủy đơn nếu đơn đang ở trạng thái chờ */}
      {booking.status === 0 && (
        <TouchableOpacity 
          className="mt-3 border border-red-500 rounded-lg py-2"
          onPress={() => {
            // TODO: Implement cancel booking
            // showCancelConfirmation(booking.bookingId);
          }}
        >
          <Text className="text-red-500 text-center font-bold">
            Hủy đơn
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
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

  if (isGuest || !user?.accountId) {
    return <GuestView />;
  }

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 border-b border-white/10">
          <Text className="text-yellow-500 text-2xl font-bold">
            Lịch sử đặt bàn
          </Text>
        </View>

        {loading && bookings.length === 0 ? (
          // Hiển thị skeleton khi đang loading lần đầu
          <ScrollView 
            className="flex-1 p-4"
            showsVerticalScrollIndicator={false}
          >
            <BookingSkeleton />
            <BookingSkeleton />
            <BookingSkeleton />
          </ScrollView>
        ) : (
          <FlatList
            data={bookings}
            renderItem={({ item }) => <BookingItem booking={item} />}
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
              // Hiển thị skeleton khi loading more
              loading && bookings.length > 0 ? (
                <BookingSkeleton />
              ) : null
            )}
            ListEmptyComponent={() => (
              !loading && (
                <View className="flex-1 items-center justify-center py-20">
                  <Ionicons name="calendar-outline" size={48} color="#EAB308" />
                  <Text className="text-white text-lg font-bold mt-4">
                    Chưa có lịch sử đặt bàn
                  </Text>
                  <Text className="text-white/60 text-center mt-2">
                    Bạn chưa thực hiện đặt bàn nào
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
