import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, BackHandler, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { paymentService, PaymentDetail } from '@/services/payment';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function PaymentSuccessScreen() {
  const { paymentId } = useLocalSearchParams();
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentDetail = async () => {
      try {
        const processedPaymentId = Array.isArray(paymentId) ? paymentId[0] : paymentId;
        const data = await paymentService.getPaymentDetail(processedPaymentId as string);
        setPayment(data);
      } catch (error) {
        router.replace('/payment/error/' + paymentId as any);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetail();
  }, [paymentId]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace({
          pathname: '/(tabs)/booking-history',
          params: { reload: 'true' }
        });
        return true;
      });
      return () => backHandler.remove();
    }
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#EAB308" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="items-center py-8 bg-neutral-900 mt-12">
          <View className="bg-green-500/20 p-4 rounded-full mb-4">
            <Ionicons name="checkmark-circle-outline" size={48} color="#22C55E" />
          </View>
          <Text className="text-white text-xl font-bold">Thanh toán thành công!</Text>
          <Text className="text-white/60 mt-2">Cảm ơn bạn đã sử dụng dịch vụ</Text>
        </View>

        {payment && (
          <View className="px-4 py-6">
            {/* QR Code */}
            <View className="bg-neutral-900 rounded-2xl p-4 mb-4">
              <View className="items-center">
                <Image 
                  source={{ uri: payment.booking.qrTicket }}
                  className="w-48 h-48"
                  resizeMode="contain"
                />
                <Text className="text-white/60 text-sm mt-2">
                  Vui lòng xuất trình mã QR khi đến quán
                </Text>
              </View>
            </View>

            {/* Thông tin đặt ch */}
            <View className="bg-neutral-900 rounded-2xl p-4 mb-4">
              <Text className="text-yellow-500 font-bold text-lg mb-4">
                {payment.booking.barName}
              </Text>
              
              <View className="space-y-3">
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                  <Text className="text-white/60 ml-2 flex-1">
                    {payment.booking.barAddress}
                  </Text>
                </View>
                
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                  <Text className="text-white/60 ml-2">
                    {format(parseISO(payment.booking.bookingDate), 'dd/MM/yyyy')} {payment.booking.bookingTime.slice(0, 5)}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Ionicons name="ticket-outline" size={20} color="#9CA3AF" />
                  <Text className="text-white/60 ml-2">
                    Mã đặt bàn: {payment.booking.bookingCode}
                  </Text>
                </View>
              </View>
            </View>

            {/* Thông tin thanh toán */}
            <View className="bg-neutral-900 rounded-2xl p-4 mb-4">
              <Text className="text-white font-bold mb-4">Chi tiết thanh toán</Text>
              
              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <Text className="text-white/60">Phương thức</Text>
                  <Text className="text-white">{payment.providerName}</Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-white/60">Mã giao dịch</Text>
                  <Text className="text-white">{payment.transactionCode}</Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-white/60">Thời gian</Text>
                  <Text className="text-white">
                    {format(parseISO(payment.paymentDate), 'HH:mm - dd/MM/yyyy')}
                  </Text>
                </View>

                <View className="h-px bg-white/10 my-2" />

                <View className="flex-row justify-between">
                  <Text className="text-white/60">Tổng tiền</Text>
                  <Text className="text-yellow-500 font-bold">
                    {payment.totalPrice.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View className="p-4 border-t border-white/10">
        <TouchableOpacity
          onPress={() => {
            router.replace({
              pathname: '/(tabs)/booking-history',
              params: {
                reload: 'true'
              }
            });
          }}
          className="bg-yellow-500 py-3 rounded-xl"
        >
          <Text className="text-black font-bold text-center">
            Về trang chủ
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
} 