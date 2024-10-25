import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BookingDetail, bookingService } from '@/services/booking';
import Animated, { FadeIn } from 'react-native-reanimated';

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

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingDetail();
  }, [id]);

  const fetchBookingDetail = async () => {
    try {
      setLoading(true);
      const response = await bookingService.getBookingDetail(id as string);
      setBooking(response.data);
    } catch (error) {
      console.error('Error fetching booking detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-yellow-500';
      case 1: return 'bg-red-500';
      case 2: return 'bg-blue-500';
      case 3: return 'bg-green-500';
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

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 pb-4 border-b border-white/10">
          <View className="flex-row items-center mt-4">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-yellow-500 text-2xl font-bold ml-4">
              Chi tiết đặt bàn
            </Text>
          </View>
        </View>

        {loading ? (
          <BookingDetailSkeleton />
        ) : booking ? (
          <ScrollView className="flex-1">
            <Animated.View entering={FadeIn}>
              {/* Thông tin quán */}
              <View className="p-6 border-b border-white/10">
                <View className="flex-row">
                  <Image 
                    source={{ uri: booking.images[0] }}
                    className="w-20 h-20 rounded-xl"
                  />
                  <View className="flex-1 ml-4">
                    <Text className="text-white text-xl font-bold mb-1">
                      {booking.barName}
                    </Text>
                    <View className="flex-row items-center">
                      <Ionicons name="location" size={16} color="#EAB308" />
                      <Text className="text-white/60 ml-1 flex-1">
                        {booking.barAddress}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Thông tin đặt bàn */}
              <View className="p-6">
                <View className="bg-white/5 rounded-xl p-4 mb-4">
                  {/* Mã đơn */}
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-white/60">Mã đơn</Text>
                    <Text className="text-white font-bold">{booking.bookingCode}</Text>
                  </View>

                  {/* Trạng thái */}
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-white/60">Trạng thái</Text>
                    <View className={`${getStatusColor(booking.status)} px-3 py-1 rounded-full`}>
                      <Text className="text-black font-bold text-xs">
                        {getStatusText(booking.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Thời gian */}
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="calendar-outline" size={20} color="#ffffff" />
                    <Text className="text-white ml-2">
                      {format(parseISO(booking.bookingDate), 'EEEE, dd/MM/yyyy', { locale: vi })}
                    </Text>
                  </View>

                  <View className="flex-row items-center mb-4">
                    <Ionicons name="time-outline" size={20} color="#ffffff" />
                    <Text className="text-white ml-2">
                      {booking.bookingTime.slice(0, 5)}
                    </Text>
                  </View>

                  {/* Danh sách bàn */}
                  <View className="mb-4">
                    <Text className="text-white/60 mb-2">Bàn đã đặt</Text>
                    <View className="bg-white/5 rounded-lg p-3">
                      {booking.tableNameList.map((table, index) => (
                        <Text key={index} className="text-white">
                          {index + 1}. {table}
                        </Text>
                      ))}
                    </View>
                  </View>

                  {/* Ghi chú */}
                  {booking.note && (
                    <View>
                      <Text className="text-white/60 mb-2">Ghi chú</Text>
                      <Text className="text-white">{booking.note}</Text>
                    </View>
                  )}
                </View>

                {/* Thông tin khách hàng */}
                <View className="bg-white/5 rounded-xl p-4">
                  <Text className="text-white/60 mb-4">Thông tin khách hàng</Text>
                  <View className="space-y-3">
                    <View className="flex-row items-center">
                      <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                      <Text className="text-white ml-2">{booking.customerName}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                      <Text className="text-white ml-2">{booking.customerPhone}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                      <Text className="text-white ml-2">{booking.customerEmail}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </View>
  );
}
