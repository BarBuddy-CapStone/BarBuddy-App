import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Linking, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BookingDrinkRequest, bookingTableService } from '@/services/booking-table';
import { Drink, drinkService } from '@/services/drink';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BarDetail, barService } from '@/services/bar';

const LoadingPopup = ({ visible }: { visible: boolean }) => (
  <Modal transparent visible={visible}>
    <View className="flex-1 bg-black/50 items-center justify-center">
      <View className="bg-neutral-900 rounded-2xl p-6 items-center mx-4">
        <ActivityIndicator size="large" color="#EAB308" className="mb-4" />
        <Text className="text-white text-center font-medium">
          Đang xử lý thanh toán...
        </Text>
        <Text className="text-white/60 text-center text-sm mt-2">
          Vui lòng không tắt ứng dụng
        </Text>
      </View>
    </View>
  </Modal>
);

export default function PaymentDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [barDetail, setBarDetail] = useState<BarDetail | null>(null);
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);

  const bookingRequest: BookingDrinkRequest = JSON.parse(params.bookingRequest as string);
  const discount = Number(params.discount) || 0;
  const originalPrice = Number(params.originalPrice) || 0;
  const totalPrice = Number(params.totalPrice) || 0;

  useEffect(() => {
    loadDrinks();
  }, []);

  useEffect(() => {
    const loadBarDetail = async () => {
      try {
        const data = await barService.getBarDetail(bookingRequest.barId);
        setBarDetail(data);
      } catch (error) {
        console.error('Error loading bar detail:', error);
      }
    };
    
    loadBarDetail();
  }, [bookingRequest.barId]);

  const loadDrinks = async () => {
    try {
      const data = await drinkService.getDrinks(bookingRequest.barId);
      setDrinks(data);
    } catch (error) {
      console.error('Error loading drinks:', error);
    }
  };

  const handlePaymentConfirm = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmBooking = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setShowLoadingPopup(true);
      setShowConfirmModal(false);
      
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
      setShowLoadingPopup(false);
    }
  };

  const BookingInfo = () => (
    <View className="px-4 mb-4">
      <View className=" bg-neutral-900 rounded-2xl p-4">
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
      <View className="bg-neutral-900 rounded-2xl p-4">
        <Text className="text-white/80 font-semibold mb-4">Thức uống đã chọn</Text>
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
      <View className="bg-neutral-900 rounded-2xl p-4">
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
      <View className="bg-neutral-900 rounded-2xl p-4">
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
        <View className="bg-neutral-900 rounded-2xl p-4">
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
                <Text className="text-white font-medium">MoMo (Chưa khả dụng)</Text>
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

  const BarInfo = () => (
    <View className="px-4 mb-4 mt-4">
      <View className="bg-neutral-900 rounded-2xl p-4">
        <Text className="text-white/80 font-semibold mb-4">Thông tin quán</Text>
        {barDetail && (
          <View>
            {/* Thêm ảnh quán */}
            <Image 
              source={{ uri: barDetail.images.split(',')[0] }} 
              className="w-full h-40 rounded-xl mb-4"
              resizeMode="cover"
            />
            <View className="space-y-2">
              <Text className="text-yellow-500 text-lg font-medium">
                {barDetail.barName}
              </Text>
              <Text className="text-white/60">
                {barDetail.address}
              </Text>
              {barDetail.phoneNumber && (
                <View className="flex-row items-center">
                  <Ionicons name="call-outline" size={16} color="#ffffff" />
                  <Text className="text-white/60 ml-2">
                    {barDetail.phoneNumber}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1 mt-0.5">
        <View className="px-4 pt-1 pb-2 flex-row items-center border-b border-white/10">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="h-9 w-9 bg-neutral-800 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="flex-1 text-yellow-500 text-lg font-bold text-center mr-9">
            Xác nhận đặt bàn
          </Text>
        </View>

        <ScrollView className="flex-1">
          <BarInfo />
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
            onPress={handlePaymentConfirm}
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
              {isProcessing ? 'Đang xử lý...' : 'Thanh toán ngay'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Modal xác nhận thanh toán */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-neutral-900 rounded-xl w-full max-w-md max-h-[85%]">
            {/* Header */}
            <View className="border-b border-white/10 p-4">
              <Text className="text-white text-xl font-bold text-center">
                Xác nhận thanh toán
              </Text>
            </View>

            {/* Wrap content trong ScrollView */}
            <ScrollView className="max-h-full">
              <View className="p-6">
                {/* Thông tin quán */}
                {barDetail && (
                  <View className="mb-4">
                    <Text className="text-yellow-500 font-medium mb-1">
                      Thông tin quán
                    </Text>
                    <Text className="text-white text-lg font-medium">
                      {barDetail.barName}
                    </Text>
                    <Text className="text-white/60 text-sm mt-1">
                      {barDetail.address}
                    </Text>
                  </View>
                )}

                {/* Thông tin đặt bàn */}
                <View className="bg-white/5 rounded-xl p-4 mb-4">
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="calendar-outline" size={20} color="#ffffff" />
                    <Text className="text-white ml-2">
                      {format(new Date(bookingRequest.bookingDate), 'EEEE, dd/MM/yyyy', { locale: vi })}
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="time-outline" size={20} color="#ffffff" />
                    <Text className="text-white ml-2">
                      {bookingRequest.bookingTime.slice(0, -3)}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <MaterialCommunityIcons name="table-chair" size={20} color="#ffffff" />
                    <Text className="text-white ml-2">
                      {bookingRequest.tableIds.length} bàn đã chọn
                    </Text>
                  </View>
                </View>

                {/* Thêm vào trong phần content của Modal, sau phần thông tin đặt bàn và trước phần đồ uống */}
                <View className="bg-white/5 rounded-xl p-4 mb-4">
                  <Text className="text-white/80 font-medium mb-3">Bàn đã chọn</Text>
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

                {/* Thông tin đồ uống */}
                <View className="bg-white/5 rounded-xl p-4 mb-4">
                  <Text className="text-white/80 font-medium mb-3">Đồ uống đã chọn</Text>
                  <View className="space-y-3">
                    {bookingRequest.drinks.map((orderDrink) => {
                      const drink = drinks.find(d => d.drinkId === orderDrink.drinkId);
                      if (!drink) return null;
                      
                      return (
                        <View key={drink.drinkId} className="flex-row justify-between items-center">
                          <View className="flex-row items-center flex-1">
                            <Image 
                              source={{ uri: drink.images.split(',')[0] }}
                              className="w-10 h-10 rounded-lg"
                            />
                            <View className="ml-3 flex-1">
                              <Text className="text-white font-medium">
                                {drink.drinkName}
                              </Text>
                              <Text className="text-white/60 text-sm">
                                {drink.price.toLocaleString('vi-VN')}đ x {orderDrink.quantity}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-yellow-500 font-medium ml-2">
                            {(drink.price * orderDrink.quantity).toLocaleString('vi-VN')}đ
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Tổng tiền */}
                  <View className="mt-4 pt-3 border-t border-white/10">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-white">Tổng cộng</Text>
                      <Text className="text-yellow-500 font-bold">
                        {totalPrice.toLocaleString('vi-VN')}đ
                      </Text>
                    </View>
                    {discount > 0 && (
                      <View className="flex-row items-center mt-2">
                        <View className="bg-yellow-500/20 px-2 py-1 rounded-lg">
                          <Text className="text-yellow-500 text-xs font-bold">-{discount}%</Text>
                        </View>
                        <Text className="text-white/60 ml-2">Đã áp dụng giảm giá</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Điều khoản */}
                <Text className="text-white/60 text-sm mb-6 text-center">
                  Bằng cách nhấn "Xác nhận", bạn đồng ý với các điều khoản thanh toán của chúng tôi
                </Text>
              </View>
            </ScrollView>

            {/* Footer buttons */}
            <View className="p-4 border-t border-white/10">
              <View className="flex-row space-x-3">
                <TouchableOpacity 
                  onPress={() => setShowConfirmModal(false)}
                  className="flex-1 bg-white/10 py-4 rounded-xl"
                >
                  <Text className="text-white text-center font-bold">
                    Hủy
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleConfirmBooking}
                  disabled={isProcessing}
                  className="flex-1 bg-yellow-500 py-4 rounded-xl"
                >
                  {isProcessing ? (
                    <ActivityIndicator color="black" />
                  ) : (
                    <Text className="text-black text-center font-bold">
                      Xác nhận
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <LoadingPopup visible={showLoadingPopup} />
    </View>
  );
}
