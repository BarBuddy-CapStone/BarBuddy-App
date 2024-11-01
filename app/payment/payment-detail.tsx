import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BookingDrinkRequest, bookingTableService } from '@/services/booking-table';
import { Drink, drinkService } from '@/services/drink';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function PaymentDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  
  const bookingRequest: BookingDrinkRequest = JSON.parse(params.bookingRequest as string);
  const discount = Number(params.discount) || 0;
  const originalPrice = Number(params.originalPrice) || 0;
  const totalPrice = Number(params.totalPrice) || 0;

  useEffect(() => {
    loadDrinks();
  }, []);

  const loadDrinks = async () => {
    try {
      const data = await drinkService.getDrinks(bookingRequest.barId);
      setDrinks(data);
    } catch (error) {
      console.error('Error loading drinks:', error);
    }
  };

  const handleConfirmBooking = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      const response = await bookingTableService.bookTableWithDrinks(bookingRequest);
      
      if (response.data?.paymentUrl) {
        await Linking.openURL(response.data.paymentUrl);
      } else {
        Alert.alert('Lỗi', 'Không nhận được đường dẫn thanh toán');
      }

    } catch (error: any) {
      console.error('Booking Error:', error);
      if (error.response) {
        console.error('Error Response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi đặt bàn và nước uống');
    } finally {
      setIsProcessing(false);
    }
  };

  const BookingInfo = () => (
    <View className="px-4 mb-4">
      <View className="bg-white/5 rounded-2xl p-4">
        <Text className="text-white/80 font-semibold mb-4">Thông tin đặt bàn</Text>
        <View className="space-y-3">
          {/* Ngày đặt */}
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={20} color="#ffffff" />
            <Text className="text-white ml-2">
              {format(new Date(bookingRequest.bookingDate), 'EEEE, dd/MM/yyyy', { locale: vi })}
            </Text>
          </View>

          {/* Giờ đặt */}
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={20} color="#ffffff" />
            <Text className="text-white ml-2">
              {bookingRequest.bookingTime.slice(0, -3)}
            </Text>
          </View>

          {/* Số bàn */}
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="table-chair" size={20} color="#ffffff" />
            <Text className="text-white ml-2">
              {bookingRequest.tableIds.length} bàn đã chọn
            </Text>
          </View>

          {/* Ghi chú */}
          {bookingRequest.note && (
            <View className="flex-row items-start">
              <Ionicons name="document-text-outline" size={20} color="#ffffff" />
              <Text className="text-white/80 ml-2 flex-1">
                Ghi chú: {bookingRequest.note}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const DrinksList = () => (
    <View className="px-4 mb-4">
      <View className="bg-white/5 rounded-2xl p-4">
        <Text className="text-white/80 font-semibold mb-4">Đồ uống đã chọn</Text>
        <View className="space-y-4">
          {bookingRequest.drinks.map((orderDrink) => {
            const drink = drinks.find(d => d.drinkId === orderDrink.drinkId);
            if (!drink) return null;
            
            return (
              <Animated.View 
                key={drink.drinkId} 
                entering={FadeIn}
                className="flex-row items-center space-x-3"
              >
                <Image 
                  source={{ uri: drink.images.split(',')[0] }}
                  className="w-16 h-16 rounded-xl"
                />
                <View className="flex-1">
                  <Text className="text-white font-medium text-base">
                    {drink.drinkName}
                  </Text>
                  <Text className="text-white/60 text-sm mt-1">
                    {drink.price.toLocaleString('vi-VN')}đ x {orderDrink.quantity}
                  </Text>
                  {/* Thêm thông tin cảm xúc */}
                  {drink.emotionsDrink && drink.emotionsDrink.length > 0 && (
                    <View className="flex-row flex-wrap gap-2 mt-2">
                      {drink.emotionsDrink.slice(0, 2).map((emotion) => (
                        <View
                          key={emotion.emotionalDrinksCategoryId}
                          className="bg-white/5 px-2 py-0.5 rounded-full"
                        >
                          <Text className="text-gray-400 text-xs">
                            {emotion.categoryName}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Text className="text-yellow-500 font-semibold">
                  {(drink.price * orderDrink.quantity).toLocaleString('vi-VN')}đ
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );

  const PaymentSummary = () => (
    <View className="px-4 mb-4">
      <View className="bg-white/5 rounded-2xl p-4">
        <Text className="text-white/80 font-semibold mb-4">Tổng quan thanh toán</Text>
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-white/60">Tổng tiền đồ uống</Text>
            <Text className="text-white">{originalPrice.toLocaleString('vi-VN')}đ</Text>
          </View>
          
          {discount > 0 && (
            <View className="flex-row justify-between">
              <View className="flex-row items-center">
                <Text className="text-white/60">Giảm giá</Text>
                <View className="bg-yellow-500/20 px-2 py-1 rounded-lg ml-2">
                  <Text className="text-yellow-500 text-xs font-bold">-{discount}%</Text>
                </View>
              </View>
              <Text className="text-yellow-500">
                -{(originalPrice - totalPrice).toLocaleString('vi-VN')}đ
              </Text>
            </View>
          )}

          <View className="flex-row justify-between pt-3 mt-2 border-t border-white/10">
            <Text className="text-white font-semibold">Tổng thanh toán</Text>
            <Text className="text-yellow-500 font-bold text-xl">
              {totalPrice.toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const TablesList = () => (
    <View className="px-4 mb-4">
      <View className="bg-white/5 rounded-2xl p-4">
        <Text className="text-white/80 font-semibold mb-4">Bàn đã chọn</Text>
        <View className="space-y-3">
          {bookingRequest.selectedTables.map((table, index) => (
            <View key={table.id} className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="table-chair" size={20} color="#ffffff" />
                <View className="ml-3">
                  <Text className="text-white font-medium">Bàn {table.name}</Text>
                  <Text className="text-white/60 text-sm">{table.typeName}</Text>
                </View>
              </View>
              {index < bookingRequest.selectedTables.length - 1 && (
                <View className="h-[1px] bg-white/10 my-2" />
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const PaymentMethods = () => {
    const [selectedMethod, setSelectedMethod] = useState<'MOMO' | 'VNPAY'>('VNPAY');

    return (
      <View className="px-4 mb-4">
        <View className="bg-white/5 rounded-2xl p-4">
          <Text className="text-white/80 font-semibold mb-4">Phương thức thanh toán</Text>
          
          <View className="space-y-3">
            {/* VNPAY */}
            <TouchableOpacity 
              onPress={() => {
                setSelectedMethod('VNPAY');
                bookingRequest.paymentDestination = 'VNPAY';
              }}
              className={`flex-row items-center p-3 rounded-xl ${
                selectedMethod === 'VNPAY' ? 'bg-white/10' : 'border border-white/10'
              }`}
            >
              <Image 
                source={require('@/assets/images/vnpay-logo.png')}
                className="w-8 h-8"
                resizeMode="contain"
              />
              <View className="flex-1 ml-3">
                <Text className="text-white font-medium">VNPAY</Text>
                <Text className="text-white/60 text-xs">Thanh toán qua VNPAY QR</Text>
              </View>
              <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                selectedMethod === 'VNPAY' 
                  ? 'border-yellow-500 bg-yellow-500' 
                  : 'border-white/30'
              }`}>
                {selectedMethod === 'VNPAY' && (
                  <Ionicons name="checkmark" size={14} color="black" />
                )}
              </View>
            </TouchableOpacity>

            {/* MOMO */}
            <TouchableOpacity 
              onPress={() => {
                setSelectedMethod('MOMO');
                bookingRequest.paymentDestination = 'MOMO';
              }}
              className={`flex-row items-center p-3 rounded-xl ${
                selectedMethod === 'MOMO' ? 'bg-white/10' : 'border border-white/10'
              }`}
            >
              <Image 
                source={require('@/assets/images/momo-logo.png')}
                className="w-8 h-8"
                resizeMode="contain"
              />
              <View className="flex-1 ml-3">
                <Text className="text-white font-medium">MoMo</Text>
                <Text className="text-white/60 text-xs">Thanh toán qua ví MoMo</Text>
              </View>
              <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                selectedMethod === 'MOMO' 
                  ? 'border-yellow-500 bg-yellow-500' 
                  : 'border-white/30'
              }`}>
                {selectedMethod === 'MOMO' && (
                  <Ionicons name="checkmark" size={14} color="black" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        <View className="px-4 flex-row items-center border-b border-white/10 pb-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="flex-1 text-white text-lg font-bold text-center mr-8">
            Xác nhận đặt bàn
          </Text>
        </View>

        <ScrollView className="flex-1">
          <BookingInfo />
          <TablesList />
          <DrinksList />
          <PaymentMethods />
          <PaymentSummary />
          
          {/* Điều khoản */}
          <Text className="text-white/60 text-sm px-4 mb-6 text-center">
            Bằng cách nhấn "Xác nhận", bạn đồng ý với các điều khoản đặt bàn của chúng tôi
          </Text>
        </ScrollView>

        <View className="border-t border-white/10 p-4">
          <TouchableOpacity
            onPress={handleConfirmBooking}
            disabled={isProcessing}
            className={`bg-yellow-500 p-4 rounded-xl flex-row items-center justify-center ${
              isProcessing ? 'opacity-50' : ''
            }`}
          >
            <Ionicons 
              name={isProcessing ? 'time-outline' : 'checkmark-circle-outline'} 
              size={20} 
              color="black" 
            />
            <Text className="text-black font-bold ml-2">
              {isProcessing ? 'Đang xử lý...' : 'Xác nhận đặt bàn'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
