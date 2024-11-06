import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Modal, Image, Animated as RNAnimated, PanResponder, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { paymentService, type PaymentHistory } from '@/services/payment';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';

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
    prevProps.count === nextProps.count &&
    prevProps.label === nextProps.label
  );
});

const PaymentItem = memo(({ 
  payment,
  onPress 
}: { 
  payment: PaymentHistory;
  onPress: () => void;
}) => {
  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'text-blue-500';
      case 1: return 'text-green-500';
      case 2: return 'text-red-500';
      default: return 'text-white/60';
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Đang chờ';
      case 1: return 'Thành công';
      case 2: return 'Thất bại';
      default: return 'Không xác định';
    }
  };

  return (
    <TouchableOpacity 
      onPress={onPress}
      className="bg-neutral-900 rounded-2xl p-4 mb-4"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="bg-yellow-500/20 p-2 rounded-xl mr-3">
            <Ionicons name="card-outline" size={20} color="#EAB308" />
          </View>
          <View>
            <Text className="text-white font-medium">{payment.barName}</Text>
            <Text className="text-white/60 text-sm">
              {format(new Date(payment.paymentDate), 'dd/MM/yyyy HH:mm', { locale: vi })}
            </Text>
          </View>
        </View>
        <Text className={`font-medium ${getStatusColor(payment.status)}`}>
          {getStatusText(payment.status)}
        </Text>
      </View>

      <View className="flex-row items-center justify-between border-t border-white/10 pt-3">
        <View>
          <Text className="text-white/60 text-sm mb-1">Mã giao dịch</Text>
          <Text className="text-white">{formatTransactionCode(payment.transactionCode)}</Text>
        </View>
        <View className="items-end">
          <Text className="text-white/60 text-sm mb-1">Tổng tiền</Text>
          <Text className="text-yellow-500 font-bold">
            {payment.totalPrice.toLocaleString('vi-VN')}đ
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const PaymentSkeleton = memo(() => (
  <View className="bg-neutral-900 rounded-2xl p-4 mb-4 animate-pulse">
    <View className="flex-row items-center justify-between mb-3">
      <View className="flex-row items-center">
        <View className="bg-neutral-800 w-10 h-10 rounded-xl mr-3" />
        <View>
          <View className="bg-neutral-800 w-32 h-5 rounded mb-2" />
          <View className="bg-neutral-800 w-24 h-4 rounded" />
        </View>
      </View>
      <View className="bg-neutral-800 w-20 h-5 rounded" />
    </View>
    <View className="border-t border-white/10 pt-3">
      <View className="flex-row justify-between">
        <View className="bg-neutral-800 w-28 h-4 rounded" />
        <View className="bg-neutral-800 w-24 h-4 rounded" />
      </View>
    </View>
  </View>
));

const formatTransactionCode = (code: string) => {
  if (code.length > 20) {
    return `${code.slice(0, 8)}...${code.slice(-8)}`;
  }
  return code;
};

const PaymentDetailModal = memo(({ 
  visible, 
  payment,
  onClose 
}: { 
  visible: boolean;
  payment: PaymentHistory | null;
  onClose: () => void;
}) => {
  if (!payment) return null;

  const panY = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(Dimensions.get('screen').height)).current;

  const resetPositionAnim = RNAnimated.timing(translateY, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true,
  });

  const closeAnim = RNAnimated.timing(translateY, {
    toValue: Dimensions.get('screen').height,
    duration: 300,
    useNativeDriver: true,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Cho phép trượt khi kéo xuống
        return gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        // Chỉ cho phép trượt xuống
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          closeAnim.start(onClose);
        } else {
          RNAnimated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      resetPositionAnim.start();
      panY.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    closeAnim.start(onClose);
  };

  const top = panY.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, 0, 1],
  });

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-blue-500';
      case 1: return 'bg-green-500';
      case 2: return 'bg-red-500';
      default: return 'bg-neutral-500';
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Đang chờ thanh toán';
      case 1: return 'Thanh toán thành công';
      case 2: return 'Thanh toán thất bại';
      default: return 'Không xác định';
    }
  };

  const getProviderLogo = (provider: string) => {
    switch (provider.toUpperCase()) {
      case 'VNPAY':
        return require('@/assets/images/vnpay-logo.png');
      case 'MOMO':
        return require('@/assets/images/momo-logo.png');
      default:
        return null;
    }
  };

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(payment.transactionCode);
      // Có thể thêm Toast thông báo đã copy thành công
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/80 justify-end">
        <TouchableOpacity 
          className="absolute inset-0"
          onPress={handleClose}
          activeOpacity={1}
        />
        <RNAnimated.View 
          {...panResponder.panHandlers}
          style={{
            transform: [{ translateY: translateY }, { translateY: panY }],
          }}
          className="bg-neutral-900 rounded-t-3xl"
        >
          {/* Drag Indicator */}
          <View className="w-full items-center py-2">
            <View className="w-12 h-1.5 rounded-full bg-neutral-700" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pb-6 border-b border-white/10">
            <Text className="text-white text-xl font-bold">
              Chi tiết giao dịch
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="p-6">
            {/* Status Badge */}
            <View className="items-center mb-6">
              <View className={`px-6 py-2 rounded-full ${getStatusColor(payment.status)}`}>
                <Text className="text-white font-medium text-base">
                  {getStatusText(payment.status)}
                </Text>
              </View>
            </View>

            {/* Customer Info */}
            <View className="bg-black/40 rounded-2xl p-4 mb-6">
              <View className="flex-row items-center mb-4">
                <View className="bg-yellow-500/20 p-3 rounded-xl mr-3">
                  <Ionicons name="person-outline" size={24} color="#EAB308" />
                </View>
                <View>
                  <Text className="text-white/60 text-sm">Khách hàng</Text>
                  <Text className="text-white font-medium">{payment.customerName}</Text>
                  <Text className="text-white/60">{payment.phoneNumber}</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="bg-yellow-500/20 p-3 rounded-xl mr-3">
                  <Ionicons name="business-outline" size={24} color="#EAB308" />
                </View>
                <View>
                  <Text className="text-white/60 text-sm">Quán bar</Text>
                  <Text className="text-white font-medium">{payment.barName}</Text>
                </View>
              </View>
            </View>

            {/* Transaction Details */}
            <View className="space-y-4 mb-6">
              <TouchableOpacity 
                onPress={handleCopyCode}
                className="flex-row justify-between items-start"
              >
                <Text className="text-white/60">Mã giao dịch</Text>
                <View className="flex-row items-center">
                  <Text className="text-white font-medium mr-2">
                    {formatTransactionCode(payment.transactionCode)}
                  </Text>
                  <Ionicons name="copy-outline" size={16} color="#9CA3AF" />
                </View>
              </TouchableOpacity>

              <View className="flex-row justify-between items-center">
                <Text className="text-white/60">Nhà cung cấp</Text>
                <View className="flex-row items-center">
                  {getProviderLogo(payment.providerName) && (
                    <Image 
                      source={getProviderLogo(payment.providerName)}
                      className="w-6 h-6 rounded-full mr-2"
                      resizeMode="contain"
                    />
                  )}
                  <Text className="text-white font-medium">
                    {payment.providerName}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-white/60">Thời gian</Text>
                <Text className="text-white font-medium">
                  {format(new Date(payment.paymentDate), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-white/60">Phí giao dịch</Text>
                <Text className="text-white font-medium">
                  {payment.paymentFee.toLocaleString('vi-VN')}đ
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-white/60">Tổng tiền</Text>
                <Text className="text-yellow-500 font-bold text-lg">
                  {payment.totalPrice.toLocaleString('vi-VN')}đ
                </Text>
              </View>
            </View>

            {payment.note && (
              <View className="bg-yellow-500/10 p-4 rounded-xl">
                <Text className="text-yellow-500 font-medium mb-1">Ghi chú</Text>
                <Text className="text-white">{payment.note}</Text>
              </View>
            )}
          </View>
        </RNAnimated.View>
      </View>
    </Modal>
  );
});

export default function PaymentHistoryScreen() {
  const { id } = useLocalSearchParams();
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(-1); // -1 là tất cả
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistory | null>(null);

  const statusCounts = useMemo(() => ({
    all: payments.length,
    success: payments.filter(p => p.status === 1).length,
    pending: payments.filter(p => p.status === 0).length,
    failed: payments.filter(p => p.status === 2).length,
  }), [payments]);

  const filteredPayments = useMemo(() => {
    let filtered = selectedStatus === -1 
      ? payments 
      : payments.filter(payment => payment.status === selectedStatus);

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(payment => {
        // Tìm theo nhà cung cấp
        if (payment.providerName.toLowerCase().includes(searchLower)) {
          return true;
        }

        // Tìm theo số tiền
        const amountString = payment.totalPrice.toString();
        if (amountString.includes(searchText)) {
          return true;
        }

        try {
          // Tìm theo ngày với nhiều định dạng
          const searchDate = searchText.trim();
          const paymentDate = new Date(payment.paymentDate);
          
          // Trường hợp 1: Chỉ nhập ngày (1-31)
          if (/^\d{1,2}$/.test(searchDate)) {
            const day = parseInt(searchDate);
            if (day === paymentDate.getDate()) {
              return true;
            }
          }
          
          // Trường hợp 2: Ngày/tháng (dd/MM hoặc d/M)
          if (/^\d{1,2}[-/]\d{1,2}$/.test(searchDate)) {
            const [inputDay, inputMonth] = searchDate.split(/[-/]/).map(Number);
            if (
              inputDay === paymentDate.getDate() &&
              inputMonth - 1 === paymentDate.getMonth()
            ) {
              return true;
            }
          }
          
          // Trường hợp 3: Ngày/tháng/năm đầy đủ (dd/MM/yyyy)
          if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(searchDate)) {
            const [inputDay, inputMonth, inputYear] = searchDate.split(/[-/]/).map(Number);
            if (
              inputDay === paymentDate.getDate() &&
              inputMonth - 1 === paymentDate.getMonth() &&
              inputYear === paymentDate.getFullYear()
            ) {
              return true;
            }
          }
          
          // Trường hợp 4: Ngày/tháng/năm rút gọn (dd/MM/yy)
          if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/.test(searchDate)) {
            const [inputDay, inputMonth, inputYear] = searchDate.split(/[-/]/).map(Number);
            const fullYear = 2000 + inputYear;
            if (
              inputDay === paymentDate.getDate() &&
              inputMonth - 1 === paymentDate.getMonth() &&
              fullYear === paymentDate.getFullYear()
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

    return filtered.sort((a, b) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  }, [payments, selectedStatus, searchText]);

  const fetchPayments = useCallback(async () => {
    try {
      const data = await paymentService.getPaymentHistory(id as string);
      setPayments(data.response);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const renderItem = useCallback(({ item }: { item: PaymentHistory }) => (
    <PaymentItem 
      payment={item} 
      onPress={() => setSelectedPayment(item)}
    />
  ), []);

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header và Search */}
        <View className="px-4 pt-1 mb-4">
          <View className="flex-row items-center space-x-3 mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-9 h-9 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View className="flex-1 bg-neutral-900 rounded-full flex-row items-center h-9 px-3">
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                placeholder="Tìm theo ngày, số tiền, nhà cung cấp..."
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
          </View>

          {/* Status Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <FilterTab
              active={selectedStatus === -1}
              label="Tất cả"
              count={statusCounts.all}
              onPress={() => setSelectedStatus(-1)}
            />
            <FilterTab
              active={selectedStatus === 1}
              label="Thành công"
              count={statusCounts.success}
              onPress={() => setSelectedStatus(1)}
            />
            <FilterTab
              active={selectedStatus === 2}
              label="Thất bại"
              count={statusCounts.failed}
              onPress={() => setSelectedStatus(2)}
            />
            <FilterTab
              active={selectedStatus === 0}
              label="Đang chờ"
              count={statusCounts.pending}
              onPress={() => setSelectedStatus(0)}
            />
          </ScrollView>
        </View>

        <View className="h-[1px] bg-neutral-900" />

        {/* List */}
        {loading ? (
          <View className="p-4">
            {[1, 2, 3].map(i => <PaymentSkeleton key={i} />)}
          </View>
        ) : (
          <Animated.View entering={FadeIn} className="flex-1">
            <FlatList
              data={filteredPayments}
              renderItem={renderItem}
              keyExtractor={item => item.transactionCode}
              contentContainerStyle={{ padding: 16 }}
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPayments();
              }}
              ListEmptyComponent={
                <View className="items-center justify-center py-8">
                  <Text className="text-white/60 text-center">
                    Chưa có giao dịch nào
                  </Text>
                </View>
              }
            />
          </Animated.View>
        )}
      </SafeAreaView>

      <PaymentDetailModal
        visible={!!selectedPayment}
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />
    </View>
  );
}
