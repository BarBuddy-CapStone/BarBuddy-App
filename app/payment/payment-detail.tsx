import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Modal,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  BookingDrinkRequest,
  bookingTableService,
} from "@/services/booking-table";
import { Drink, drinkService } from "@/services/drink";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Animated, { FadeIn } from "react-native-reanimated";
import { BarDetail, barService } from "@/services/bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { voucherService, VoucherResponse } from "@/services/voucher";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

const LoadingPopup = ({ 
  visible, 
  status = 'loading',
  errorMessage = '',
  successMessage = ''
}: { 
  visible: boolean;
  status?: 'loading' | 'success' | 'error';
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
              Đang xử lý thanh toán...
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
              {successMessage || 'Đặt bàn thành công!'}
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
              Đặt bàn thất bại
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

export default function PaymentDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [bookingRequestState, setBookingRequestState] = useState<BookingDrinkRequest>(
    typeof params.bookingRequest === "string"
      ? {
          ...JSON.parse(params.bookingRequest),
          voucherCode: null
        }
      : {
          ...params.bookingRequest,
          voucherCode: null
        }
  );

  const discount = Number(params.discount) || 0;
  const originalPrice = Number(params.originalPrice) || 0;
  const totalPrice = Number(params.totalPrice) || 0;

  const [isProcessing, setIsProcessing] = useState(false);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [barDetail, setBarDetail] = useState<BarDetail | null>(null);
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherResponse | null>(
    null
  );
  const [currentTotalPrice, setCurrentTotalPrice] = useState(totalPrice);
  const [bookingStatus, setBookingStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    loadDrinks();
  }, []);

  useEffect(() => {
    const loadBarDetail = async () => {
      try {
        const data = await barService.getBarDetail(bookingRequestState.barId);
        setBarDetail(data);
      } catch (error) {
        console.error("Error loading bar detail:", error);
      }
    };

    loadBarDetail();
  }, [bookingRequestState.barId]);

  const loadDrinks = async () => {
    try {
      const data = await drinkService.getDrinks(bookingRequestState.barId);
      setDrinks(data);
    } catch (error) {
      console.error("Error loading drinks:", error);
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
      setBookingStatus('loading');
      setBookingError('');

      // Lưu booking data vào storage
      const bookingData = {
        bookingRequest: bookingRequestState,
        selectedTables: bookingRequestState.selectedTables,
        drinks: bookingRequestState.drinks,
        discount,
        originalPrice,
        totalPrice,
      };

      await AsyncStorage.setItem(
        "temp_booking_data",
        JSON.stringify(bookingData)
      );

      const response = await bookingTableService.bookTableWithDrinks(
        bookingRequestState,
        () => {
          setIsProcessing(false);
          setShowLoadingPopup(false);
        }
      );

      if (response.data?.paymentUrl) {
        await router.replace({
          pathname: "/(tabs)/booking-history",
          params: { fromPayment: "true" },
        });

        await new Promise((resolve) => setTimeout(resolve, 300));
        await Linking.openURL(response.data.paymentUrl);
      } else {
        throw new Error("Không nhận được đường dẫn thanh toán");
      }
    } catch (error: any) {
      console.error("Booking Error:", error);
      // Thay vì redirect, hiển thị lỗi trên popup
      setBookingStatus('error');
      setBookingError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi đặt bàn. Vui lòng thử lại.');
      
      // Tự động ẩn popup lỗi sau 2 giây
      setTimeout(() => {
        setShowLoadingPopup(false);
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  const BookingInfo = () => (
    <View className="px-4 mb-4">
      <View className=" bg-neutral-900 rounded-2xl p-4">
        <Text className="text-white/80 font-semibold mb-4">
          Thông tin đặt bàn
        </Text>
        <View className="space-y-3">
          {/* Ngày đặt */}
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={20} color="#ffffff" />
            <Text className="text-white ml-2">
              {format(
                new Date(bookingRequestState.bookingDate),
                "EEEE, dd/MM/yyyy",
                { locale: vi }
              )}
            </Text>
          </View>

          {/* Giờ đặt */}
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={20} color="#ffffff" />
            <Text className="text-white ml-2">
              {bookingRequestState.bookingTime.slice(0, -3)}
            </Text>
          </View>

          {/* Thêm số người */}
          <View className="flex-row items-center">
            <Ionicons name="people-outline" size={20} color="#ffffff" />
            <Text className="text-white ml-2">
              {bookingRequestState.numOfPeople} khách hàng
            </Text>
          </View>

          {/* Số bàn */}
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="table-chair"
              size={20}
              color="#ffffff"
            />
            <Text className="text-white ml-2">
              {bookingRequestState.tableIds.length} bàn đã chọn
            </Text>
          </View>

          {/* Ghi chú */}
          {bookingRequestState.note && (
            <View className="flex-row items-start">
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#ffffff"
              />
              <Text className="text-white/80 ml-2 flex-1">
                Ghi chú: {bookingRequestState.note}
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
        <Text className="text-white/80 font-semibold mb-4">
          Thức uống đã chọn
        </Text>
        <View className="space-y-4">
          {bookingRequestState.drinks.map((orderDrink) => {
            const drink = drinks.find((d) => d.drinkId === orderDrink.drinkId);
            if (!drink) return null;

            return (
              <Animated.View
                key={drink.drinkId}
                entering={FadeIn}
                className="flex-row items-center space-x-3"
              >
                <Image
                  source={{ uri: drink.images.split(",")[0] }}
                  className="w-16 h-16 rounded-xl"
                />
                <View className="flex-1">
                  <Text className="text-white font-medium text-base">
                    {drink.drinkName}
                  </Text>
                  <Text className="text-white/60 text-sm mt-1">
                    {drink.price.toLocaleString("vi-VN")}đ x{" "}
                    {orderDrink.quantity}
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
                  {(drink.price * orderDrink.quantity).toLocaleString("vi-VN")}đ
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );

  // Trong PaymentSummary component
  const PaymentSummary = () => {
    // Tính toán số tiền giảm giá từ quán
    const barDiscountAmount = originalPrice * (discount / 100);
    const priceAfterBarDiscount = originalPrice - barDiscountAmount;

    // Tính toán số tiền giảm giá từ voucher (nếu có)
    const voucherDiscountAmount = appliedVoucher
      ? Math.min(
          priceAfterBarDiscount * (appliedVoucher.discount / 100),
          appliedVoucher.maxPrice
        )
      : 0;

    return (
      <View className="px-4 mb-4">
        <View className="bg-neutral-900 rounded-2xl p-4">
          <Text className="text-white/80 font-semibold mb-4">
            Tổng quan thanh toán
          </Text>

          {/* Phần 1: Tổng tiền đồ uống và giảm giá quán */}
          <View className="space-y-3">
            {/* Tổng tiền gốc */}
            <View className="flex-row justify-between">
              <Text className="text-white/60">Tổng tiền đồ uống</Text>
              <Text className="text-white">
                {originalPrice.toLocaleString("vi-VN")}đ
              </Text>
            </View>

            {/* Giảm giá từ quán */}
            {discount > 0 && (
              <View className="flex-row justify-between">
                <View className="flex-row items-center">
                  <Text className="text-white/60">Chiết khấu khi đặt trước</Text>
                  <View className="bg-yellow-500/20 px-2 py-0.5 rounded-lg ml-2">
                    <Text className="text-yellow-500 text-xs font-bold">
                      -{discount}%
                    </Text>
                  </View>
                </View>
                <Text className="text-yellow-500">
                  -{barDiscountAmount.toLocaleString("vi-VN")}đ
                </Text>
              </View>
            )}
          </View>

          {/* Phần 2: Tổng sau chiết khấu và Voucher (nếu có) */}
          {appliedVoucher && (
            <View className="border-t border-white/10 mt-3">
              <View className="space-y-3 pt-3">
                {/* Tổng sau giảm giá quán */}
                <View className="flex-row justify-between">
                  <Text className="text-white font-medium">
                    Tổng tiền sau chiết khấu
                  </Text>
                  <Text className="text-white font-medium">
                    {priceAfterBarDiscount.toLocaleString("vi-VN")}đ
                  </Text>
                </View>

                {/* Voucher */}
                <View className="flex-row justify-between">
                  <View className="flex-row items-center flex-1 mr-3">
                    <Text 
                      className="text-white/60 flex-shrink" 
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Voucher {appliedVoucher.eventVoucherName}
                    </Text>
                    <View className="bg-yellow-500/20 px-2 py-0.5 rounded-lg ml-2 flex-shrink-0">
                      <Text className="text-yellow-500 text-xs font-bold">
                        -{appliedVoucher.discount}%
                      </Text>
                    </View>
                  </View>
                  <Text className="text-yellow-500 flex-shrink-0">
                    -{(Math.min(
                      (originalPrice - (originalPrice * discount) / 100) * (appliedVoucher.discount / 100),
                      appliedVoucher.maxPrice
                    )).toLocaleString("vi-VN")}đ
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Phần 3: Tổng thanh toán cuối cùng */}
          <View className="border-t border-white/10 mt-3">
            <View className="flex-row justify-between pt-3">
              <Text className="text-white font-semibold">Tổng thanh toán</Text>
              <Text className="text-yellow-500 font-bold text-xl">
                {currentTotalPrice.toLocaleString("vi-VN")}đ
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const TablesList = () => (
    <View className="px-4 mb-4">
      <View className="bg-neutral-900 rounded-2xl p-4">
        <Text className="text-white/80 font-semibold mb-4">Bàn đã chọn</Text>
        <View className="space-y-3">
          {bookingRequestState.selectedTables.map((table, index) => (
            <View
              key={table.id}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name="table-chair"
                  size={20}
                  color="#ffffff"
                />
                <View className="ml-3">
                  <Text className="text-white font-medium">
                    Bàn {table.name}
                  </Text>
                  <Text className="text-white/60 text-sm">
                    {table.typeName}
                  </Text>
                </View>
              </View>
              {index < bookingRequestState.selectedTables.length - 1 && (
                <View className="h-[1px] bg-white/10 my-2" />
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const PaymentMethods = () => {
    const [selectedMethod, setSelectedMethod] = useState<"VNPAY">("VNPAY");

    return (
      <View className="px-4 mb-4">
        <View className="bg-neutral-900 rounded-2xl p-4">
          <Text className="text-white/80 font-semibold mb-4">
            Phương thức thanh toán
          </Text>

          {/* VNPAY */}
          <TouchableOpacity
            onPress={() => {
              setSelectedMethod("VNPAY");
              bookingRequestState.paymentDestination = "VNPAY";
            }}
            className="flex-row items-center p-3 rounded-xl bg-white/10"
          >
            <Image
              source={require("@/assets/images/vnpay-logo.png")}
              className="w-8 h-8"
              resizeMode="contain"
            />
            <View className="flex-1 ml-3">
              <Text className="text-white font-medium">VNPAY</Text>
              <Text className="text-white/60 text-xs">
                Thanh toán qua VNPAY QR
              </Text>
            </View>
            <View className="w-6 h-6 rounded-full border-2 border-yellow-500 bg-yellow-500 items-center justify-center">
              <Ionicons name="checkmark" size={14} color="black" />
            </View>
          </TouchableOpacity>
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
              source={{ uri: barDetail.images.split(",")[0] }}
              className="w-full h-40 rounded-xl mb-4"
              resizeMode="cover"
            />
            <View className="space-y-2">
              <Text className="text-yellow-500 text-lg font-medium">
                {barDetail.barName}
              </Text>
              <Text className="text-white/60">{barDetail.address}</Text>
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

  const VoucherInput = () => {
    const [voucherCode, setVoucherCode] = useState("");
    const [isApplying, setIsApplying] = useState(false);
    const [error, setError] = useState("");

    const handleApplyVoucher = async () => {
      if (!voucherCode.trim()) return;

      try {
        setIsApplying(true);
        setError("");

        const response = await voucherService.getVoucher(
          bookingRequestState.bookingDate,
          bookingRequestState.bookingTime,
          voucherCode.trim(),
          bookingRequestState.barId
        );

        if (response.statusCode === 200 && response.data) {
          // Tính toán giá sau khi áp dụng giảm giá của quán
          const priceAfterBarDiscount = originalPrice - (originalPrice * discount) / 100;

          // Tính toán số tiền giảm từ voucher
          const voucherDiscountAmount = Math.min(
            priceAfterBarDiscount * (response.data.discount / 100),
            response.data.maxPrice
          );

          // Tính giá cuối cùng
          const finalPrice = priceAfterBarDiscount - voucherDiscountAmount;

          // Cập nhật bookingRequest với mã voucher
          setBookingRequestState(prev => ({
            ...prev,
            voucherCode: voucherCode.trim()
          }));

          setAppliedVoucher(response.data);
          setCurrentTotalPrice(finalPrice);
        }
      } catch (error: any) {
        setError(error.message || 'Có lỗi xảy ra khi áp dụng voucher');
      } finally {
        setIsApplying(false);
      }
    };

    const handleRemoveVoucher = () => {
      setAppliedVoucher(null);
      setVoucherCode("");
      setError("");
      
      setBookingRequestState(prev => ({
        ...prev,
        voucherCode: null
      }));
      
      const priceAfterBarDiscount = originalPrice - (originalPrice * discount) / 100;
      setCurrentTotalPrice(priceAfterBarDiscount);
    };

    return (
      <View className="px-4 mb-4">
        <View className="bg-neutral-900 rounded-2xl p-4">
          <Text className="text-white/80 font-semibold mb-4">Mã giảm giá</Text>

          <View className="flex-row space-x-3">
            <View className="flex-1 bg-white/5 rounded-xl px-4 py-3">
              <TextInput
                value={voucherCode}
                onChangeText={setVoucherCode}
                placeholder="Nhập mã giảm giá"
                placeholderTextColor="#9CA3AF"
                className="text-white"
                autoCapitalize="characters"
                editable={!appliedVoucher}
              />
            </View>

            {appliedVoucher ? (
              <TouchableOpacity
                onPress={handleRemoveVoucher}
                className="bg-red-500/20 px-4 rounded-xl items-center justify-center"
              >
                <Text className="text-red-500 font-medium">Hủy</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleApplyVoucher}
                disabled={isApplying || !voucherCode.trim()}
                className={`bg-yellow-500 px-4 rounded-xl items-center justify-center ${
                  isApplying || !voucherCode.trim() ? "opacity-50" : ""
                }`}
              >
                <Text className="text-black font-medium">
                  {isApplying ? "Đang áp dụng..." : "Áp dụng"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {error ? (
            <Text className="text-red-500 text-sm mt-2">{error}</Text>
          ) : appliedVoucher ? (
            <View className="mt-3 bg-yellow-500/20 p-3 rounded-xl">
              <Text className="text-yellow-500 font-medium">
                Đã áp dụng voucher {appliedVoucher.eventVoucherName}
              </Text>
              <Text className="text-yellow-500/80 text-sm mt-1">
                Giảm {appliedVoucher.discount}% (tối đa{" "}
                {appliedVoucher.maxPrice.toLocaleString("vi-VN")}đ)
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  useFocusEffect(
    useCallback(() => {
      // Reset các state liên quan đến modal
      setShowConfirmModal(false);
      setShowLoadingPopup(false);
    }, [])
  );

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1 mt-0.5" edges={["top"]}>
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
          <VoucherInput />
          <PaymentMethods />
          <PaymentSummary />

          {/* Điều khoản */}
          <Text className="text-white/60 text-sm mb-6 text-center">
            Bằng cách nhấn "Xác nhận", bạn đã đồng ý với{' '}
            <Text 
              onPress={() => {
                setShowConfirmModal(false); // Đóng modal trước khi navigate
                router.push('/terms-and-policies');
              }} 
              className="text-yellow-500 underline"
            >
              Điều khoản dịch vụ
            </Text> và{' '}
            <Text 
              onPress={() => {
                setShowConfirmModal(false); // Đóng modal trước khi navigate
                router.push('/privacy-policy');
              }} 
              className="text-yellow-500 underline"
            >
              Chính sách bảo mật
            </Text> của chúng tôi.
          </Text>
        </ScrollView>

        <View className="border-t border-white/10 p-4 mb-2">
          <TouchableOpacity
            onPress={handlePaymentConfirm}
            disabled={isProcessing}
            className={`bg-yellow-500 p-4 rounded-xl flex-row items-center justify-center ${
              isProcessing ? "opacity-50" : ""
            }`}
          >
            <Ionicons
              name={isProcessing ? "time-outline" : "checkmark-circle-outline"}
              size={20}
              color="black"
            />
            <Text className="text-black font-bold ml-2">
              {isProcessing ? "Đang xử lý..." : "Thanh toán ngay"}
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
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#ffffff"
                    />
                    <Text className="text-white ml-2">
                      {format(
                        new Date(bookingRequestState.bookingDate),
                        "EEEE, dd/MM/yyyy",
                        { locale: vi }
                      )}
                    </Text>
                  </View>

                  <View className="flex-row items-center mb-3">
                    <Ionicons name="time-outline" size={20} color="#ffffff" />
                    <Text className="text-white ml-2">
                      {bookingRequestState.bookingTime.slice(0, -3)}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <MaterialCommunityIcons
                      name="table-chair"
                      size={20}
                      color="#ffffff"
                    />
                    <Text className="text-white ml-2">
                      {bookingRequestState.tableIds.length} bàn đã chọn
                    </Text>
                  </View>
                </View>

                {/* Thêm vào trong phần content của Modal, sau phần thông tin đặt bàn và trước phần đồ uống */}
                <View className="bg-white/5 rounded-xl p-4 mb-4">
                  <Text className="text-white/80 font-medium mb-3">
                    Bàn đã chọn
                  </Text>
                  <View className="space-y-3">
                    {bookingRequestState.selectedTables.map((table, index) => (
                      <View
                        key={table.id}
                        className="flex-row items-center justify-between"
                      >
                        <View className="flex-row items-center">
                          <MaterialCommunityIcons
                            name="table-chair"
                            size={20}
                            color="#ffffff"
                          />
                          <View className="ml-3">
                            <Text className="text-white font-medium">
                              Bàn {table.name}
                            </Text>
                            <Text className="text-white/60 text-sm">
                              {table.typeName}
                            </Text>
                          </View>
                        </View>
                        {index < bookingRequestState.selectedTables.length - 1 && (
                          <View className="h-[1px] bg-white/10 my-2" />
                        )}
                      </View>
                    ))}
                  </View>
                </View>

                {/* Thông tin đồ uống */}
                <View className="bg-white/5 rounded-xl p-4 mb-4">
                  <Text className="text-white/80 font-medium mb-3">
                    Đồ uống đã chọn
                  </Text>
                  <View className="space-y-3">
                    {bookingRequestState.drinks.map((orderDrink) => {
                      const drink = drinks.find(
                        (d) => d.drinkId === orderDrink.drinkId
                      );
                      if (!drink) return null;

                      return (
                        <View
                          key={drink.drinkId}
                          className="flex-row justify-between items-center"
                        >
                          <View className="flex-row items-center flex-1">
                            <Image
                              source={{ uri: drink.images.split(",")[0] }}
                              className="w-10 h-10 rounded-lg"
                            />
                            <View className="ml-3 flex-1">
                              <Text className="text-white font-medium">
                                {drink.drinkName}
                              </Text>
                              <Text className="text-white/60 text-sm">
                                {drink.price.toLocaleString("vi-VN")}đ x{" "}
                                {orderDrink.quantity}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-yellow-500 font-medium ml-2">
                            {(drink.price * orderDrink.quantity).toLocaleString(
                              "vi-VN"
                            )}
                            đ
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Tổng tiền */}
                  <View className="mt-4 pt-3 border-t border-white/10">
                    <View className="space-y-3">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-white/60">Tổng tiền đồ uống</Text>
                        <Text className="text-white">
                          {originalPrice.toLocaleString("vi-VN")}đ
                        </Text>
                      </View>

                      {discount > 0 && (
                        <View className="flex-row justify-between items-center">
                          <View className="flex-row items-center">
                            <Text className="text-white/60">Chiết khấu khi đặt trước</Text>
                            <View className="bg-yellow-500/20 px-2 py-0.5 rounded-lg ml-2">
                              <Text className="text-yellow-500 text-xs font-bold">
                                -{discount}%
                              </Text>
                            </View>
                          </View>
                          <Text className="text-yellow-500">
                            -{((originalPrice * discount) / 100).toLocaleString("vi-VN")}đ
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Phần Voucher n��u có */}
                    {appliedVoucher && (
                      <View className="border-t border-white/10 mt-3">
                        <View className="space-y-3 pt-3">
                          {/* Tổng sau giảm giá quán */}
                          <View className="flex-row justify-between">
                            <Text className="text-white font-medium">Tổng sau chiết khấu</Text>
                            <Text className="text-white font-medium">
                              {(originalPrice - (originalPrice * discount) / 100).toLocaleString("vi-VN")}đ
                            </Text>
                          </View>

                          {/* Voucher */}
                          <View className="flex-row justify-between">
                            <View className="flex-row items-center flex-1 mr-3">
                              <Text 
                                className="text-white/60 flex-shrink" 
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                Voucher {appliedVoucher.eventVoucherName}
                              </Text>
                              <View className="bg-yellow-500/20 px-2 py-0.5 rounded-lg ml-2 flex-shrink-0">
                                <Text className="text-yellow-500 text-xs font-bold">
                                  -{appliedVoucher.discount}%
                                </Text>
                              </View>
                            </View>
                            <Text className="text-yellow-500 flex-shrink-0">
                              -{(Math.min(
                                (originalPrice - (originalPrice * discount) / 100) * (appliedVoucher.discount / 100),
                                appliedVoucher.maxPrice
                              )).toLocaleString("vi-VN")}đ
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Tổng thanh toán cuối cùng */}
                    <View className="border-t border-white/10 mt-3">
                      <View className="flex-row justify-between pt-3">
                        <Text className="text-white font-semibold mt-1">Tổng thanh toán</Text>
                        <Text className="text-yellow-500 font-bold text-lg">
                          {currentTotalPrice.toLocaleString("vi-VN")}đ
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Điều khoản */}
                <Text className="text-white/60 text-sm mb-6 text-center">
                  Bằng cách nhấn "Xác nhận", bạn đã đồng ý với{' '}
                  <Text 
                    onPress={() => {
                      setShowConfirmModal(false); // Đóng modal trước khi navigate
                      router.push('/terms-and-policies');
                    }} 
                    className="text-yellow-500 underline"
                  >
                    Điều khoản dịch vụ
                  </Text> và{' '}
                  <Text 
                    onPress={() => {
                      setShowConfirmModal(false); // Đóng modal trước khi navigate
                      router.push('/privacy-policy');
                    }} 
                    className="text-yellow-500 underline"
                  >
                    Chính sách bảo mật
                  </Text> của chúng tôi.
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
                  <Text className="text-white text-center font-bold">Hủy</Text>
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

      <LoadingPopup 
        visible={showLoadingPopup}
        status={bookingStatus}
        errorMessage={bookingError}
        successMessage="Đặt bàn thành công!"
      />
    </View>
  );
}
