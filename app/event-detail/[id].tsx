import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { eventService, type EventDetail } from '@/services/event';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import { toastConfig, showToast } from '@/components/CustomToast';


// Thêm EventSkeleton component
const EventSkeleton = () => (
  <View className="flex-1 bg-black">
    <View className="relative h-[400px] bg-neutral-800 animate-pulse" />
    
    <View className="p-6">
      {/* Time Section Skeleton */}
      <View className="bg-neutral-900 rounded-3xl p-5 mb-6">
        <View className="flex-row items-center mb-4">
          <View className="h-10 w-10 bg-neutral-800 rounded-full animate-pulse" />
          <View className="h-6 w-40 bg-neutral-800 rounded-lg ml-3 animate-pulse" />
        </View>
        
        {[1, 2].map(i => (
          <View key={i} className="bg-neutral-800 rounded-2xl p-4 mb-3 animate-pulse">
            <View className="h-5 w-48 bg-neutral-700 rounded mb-2" />
            <View className="h-4 w-32 bg-neutral-700 rounded" />
          </View>
        ))}
      </View>

      {/* Description Skeleton */}
      <View className="bg-neutral-900 rounded-3xl p-5 mb-6">
        <View className="flex-row items-center mb-4">
          <View className="h-10 w-10 bg-neutral-800 rounded-full animate-pulse" />
          <View className="h-6 w-40 bg-neutral-800 rounded-lg ml-3 animate-pulse" />
        </View>
        <View className="space-y-2">
          <View className="h-4 w-full bg-neutral-800 rounded animate-pulse" />
          <View className="h-4 w-5/6 bg-neutral-800 rounded animate-pulse" />
          <View className="h-4 w-4/6 bg-neutral-800 rounded animate-pulse" />
        </View>
      </View>

      {/* Voucher Skeleton */}
      <View className="bg-neutral-900 rounded-3xl p-5">
        <View className="flex-row items-center mb-4">
          <View className="h-10 w-10 bg-neutral-800 rounded-full animate-pulse" />
          <View className="h-6 w-40 bg-neutral-800 rounded-lg ml-3 animate-pulse" />
        </View>
        <View className="bg-neutral-800 rounded-2xl p-4 animate-pulse">
          <View className="h-6 w-32 bg-neutral-700 rounded mb-2" />
          <View className="h-4 w-48 bg-neutral-700 rounded mb-3" />
          <View className="h-12 w-full bg-neutral-700 rounded" />
        </View>
      </View>
    </View>
  </View>
);

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventDetail = async () => {
      try {
        const data = await eventService.getEventDetail(id as string);
        setEvent(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEventDetail();
  }, [id]);

  const formatEventTime = (time: EventDetail['eventTimeResponses'][0]) => {
    if (time.date) {
      return {
        date: format(new Date(time.date), 'EEEE, dd/MM/yyyy', { locale: vi }),
        time: `${time.startTime.slice(0,5)} - ${time.endTime.slice(0,5)}`
      };
    } else if (time.dayOfWeek !== null) {
      const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      return {
        date: `${days[time.dayOfWeek]} hàng tuần`,
        time: `${time.startTime.slice(0,5)} - ${time.endTime.slice(0,5)}`
      };
    }
    return null;
  };

  const handleCopyVoucher = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      showToast(
        'success',
        'Đã sao chép',
        'Mã giảm giá đã được sao chép'
      );
    } catch (error) {
      showToast(
        'error',
        'Lỗi',
        'Không thể sao chép mã giảm giá'
      );
    }
  };

  if (loading) {
    return <EventSkeleton />;
  }

  if (!event) return null;

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="absolute top-0 left-0 right-0 z-10">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="h-10 w-10 bg-black/30 backdrop-blur-md rounded-full items-center justify-center m-4"
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View className="relative h-[400px]">
          <Image
            source={{ uri: event.images.split(',')[0].trim() }}
            className="w-full h-full"
            resizeMode="cover"
          />
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
            className="absolute bottom-0 left-0 right-0 h-48"
          />

          {/* Event Name & Bar */}
          <View className="absolute bottom-0 p-6 w-full">
            <Text className="text-yellow-500 text-2xl font-bold mb-2" numberOfLines={2}>
              {event.eventName}
            </Text>
            <TouchableOpacity 
              className="flex-row items-center"
              onPress={() => router.push(`/bar-detail/${event.barId}`)}
            >
              <Ionicons name="business" size={16} color="#9CA3AF" />
              <Text className="text-gray-400 ml-2 text-base flex-1" numberOfLines={1}>
                {event.barName}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View className="p-6">
          {/* Time Section */}
          <View className="bg-neutral-900 rounded-3xl p-5 mb-6">
            <View className="flex-row items-center mb-4">
              <View className="h-10 w-10 bg-yellow-500 rounded-full items-center justify-center">
                <Ionicons name="time" size={20} color="black" />
              </View>
              <Text className="text-white text-lg font-bold ml-3">
                Thời gian diễn ra
              </Text>
            </View>

            {event.eventTimeResponses.map((time, index) => {
              const formattedTime = formatEventTime(time);
              if (!formattedTime) return null;

              return (
                <View 
                  key={time.timeEventId} 
                  className={`bg-neutral-800 rounded-2xl p-4 ${
                    index !== event.eventTimeResponses.length - 1 ? 'mb-3' : ''
                  }`}
                >
                  <Text className="text-yellow-500 font-medium mb-1">
                    {formattedTime.date}
                  </Text>
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                    <Text className="text-gray-400 ml-2">
                      {formattedTime.time}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Description */}
          <View className="bg-neutral-900 rounded-3xl p-5 mb-6">
            <View className="flex-row items-center mb-4">
              <View className="h-10 w-10 bg-yellow-500 rounded-full items-center justify-center">
                <Ionicons name="information" size={20} color="black" />
              </View>
              <Text className="text-white text-lg font-bold ml-3">
                Thông tin chi tiết
              </Text>
            </View>
            <Text className="text-gray-400 leading-6">
              {event.description}
            </Text>
          </View>

          {/* Voucher Section */}
          {event.eventVoucherResponse && (
            <View className="bg-neutral-900 rounded-3xl p-5">
              <View className="flex-row items-center mb-4">
                <View className="h-10 w-10 bg-yellow-500 rounded-full items-center justify-center">
                  <Ionicons name="ticket" size={20} color="black" />
                </View>
                <Text className="text-white text-lg font-bold ml-3">
                  Ưu đãi đặc biệt
                </Text>
              </View>

              <View className="bg-neutral-800 rounded-2xl p-4">
                <Text className="text-yellow-500 font-medium text-lg mb-2">
                  Giảm {event.eventVoucherResponse.discount}%
                </Text>
                <Text className="text-gray-400 mb-3">
                  Tối đa {event.eventVoucherResponse.maxPrice.toLocaleString('vi-VN')}đ
                </Text>
                <View className="flex-row items-center justify-between bg-neutral-700 rounded-xl p-3">
                  <Text className="text-white font-medium">
                    {event.eventVoucherResponse.voucherCode}
                  </Text>
                  <TouchableOpacity 
                    className="bg-yellow-500 px-3 py-1 rounded-lg"
                    onPress={() => handleCopyVoucher(event.eventVoucherResponse.voucherCode)}
                  >
                    <Text className="text-black font-medium">Sao chép</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Cập nhật Toast Container với config */}
      <Toast config={toastConfig} />
    </View>
  );
}
