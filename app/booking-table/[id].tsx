import { View, Text, ScrollView, TouchableOpacity, Platform, Modal, TextInput, Image, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BarDetail, barService } from '@/services/bar';
import { TableType, tableTypeService } from '@/services/table-type';
import Animated, { FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, accountService } from '@/services/account';
import { useAuth } from '@/contexts/AuthContext';
import { BookingTableFilter, BookingTableRequest, bookingTableService } from '@/services/booking-table';

// Thêm interface cho state availableTables
interface TableUI {
  id: string;
  name: string;
  status: 'available' | 'booked';
  typeId: string;
}

// Thêm interface mới để lưu thông tin bàn đã chọn
interface SelectedTableInfo {
  id: string;
  name: string;
  typeId: string;
  typeName: string;
}

// Thêm hàm xử lý images ở đầu file
const getImageArray = (imagesString: string): string[] => {
  if (!imagesString) return [];
  return imagesString.split(',').map(img => img.trim()).filter(img => img !== '');
};

// Thêm hàm helper để lấy thông tin giờ mở cửa theo ngày
const getOperatingHours = (date: Date, barDetail: BarDetail) => {
  const dayOfWeek = date.getDay();
  const barTimeForSelectedDay = barDetail.barTimeResponses.find(
    time => time.dayOfWeek === dayOfWeek
  );

  // Format ngày trong tuần
  const getDayOfWeekText = (day: number) => {
    return day === 0 ? 'Chủ nhật' : `Thứ ${day + 1}`;
  };

  if (!barTimeForSelectedDay) {
    return {
      isOpen: false,
      hours: `Đóng cửa vào ${getDayOfWeekText(dayOfWeek)}`
    };
  }

  // Format giờ từ HH:mm:ss thành HH:mm
  const formatTime = (time: string) => {
    return time.split(':').slice(0, 2).join(':');
  };

  return {
    isOpen: true,
    hours: `${getDayOfWeekText(dayOfWeek)}: ${formatTime(barTimeForSelectedDay.startTime)} - ${formatTime(barTimeForSelectedDay.endTime)}`
  };
};

// Thêm constant cho số lượng bàn tối đa
const MAX_TABLES = 5;

// Thêm hàm helper để tính ngày tối đa có thể chọn
const getMaxBookingDate = () => {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30); // Thêm 30 ngày
  return maxDate;
};

// Thêm hàm helper để xử lý ngày booking
const getBookingDate = (date: Date, time: string) => {
  if (time.includes('(+1 ngày)')) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return format(nextDay, 'yyyy-MM-dd');
  }
  return format(date, 'yyyy-MM-dd');
};

export default function BookingTableScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth(); // Thêm useAuth hook
  const [barDetail, setBarDetail] = useState<BarDetail | null>(null);
  const [tableTypes, setTableTypes] = useState<TableType[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedTableType, setSelectedTableType] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [expandedTableType, setExpandedTableType] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [availableTables, setAvailableTables] = useState<TableUI[]>([]); // Thay any bằng interface phù hợp
  const [selectedTables, setSelectedTables] = useState<SelectedTableInfo[]>([]);
  const [accountInfo, setAccountInfo] = useState<Account | null>(null);
  const [note, setNote] = useState('');
  const [currentTableType, setCurrentTableType] = useState<{id: string, name: string} | null>(null);
  const [showSelectedTablesModal, setShowSelectedTablesModal] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [showTypeDescription, setShowTypeDescription] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoadingTableTypes, setIsLoadingTableTypes] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [closedMessage, setClosedMessage] = useState('');
  const [showMaxTablesModal, setShowMaxTablesModal] = useState(false);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [minDate] = useState(new Date()); // Ngày hiện tại
  const [maxDate] = useState(getMaxBookingDate()); // Ngày tối đa
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [bookingError, setBookingError] = useState<string>('');

  const generateAvailableTimeSlots = (selectedDate: Date, barDetail: BarDetail) => {
    const now = new Date();
    const dayOfWeek = selectedDate.getDay();
    
    // Tìm thông tin giờ mở cửa cho ngày được chọn
    const barTimeForSelectedDay = barDetail.barTimeResponses.find(
      time => time.dayOfWeek === dayOfWeek
    );

    if (!barTimeForSelectedDay) {
      return []; // Quán không mở cửa vào ngày này
    }

    const startHour = parseInt(barTimeForSelectedDay.startTime.split(':')[0]);
    let endHour = parseInt(barTimeForSelectedDay.endTime.split(':')[0]);
    
    // Xử lý trường hợp đóng cửa sau 0h
    const isAfterMidnight = endHour < startHour;
    if (isAfterMidnight) {
      endHour += 24; // Chuyển 4h thành 28h để dễ tính toán
    }

    const slots = [];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Kiểm tra nếu là ngày hiện tại
    const isToday = selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear();

    const timeInterval = barDetail.timeSlot || 1;
    
    for (let hour = startHour; hour < endHour; hour += timeInterval) {
      const normalizedHour = hour % 24;
      const timeString = `${normalizedHour.toString().padStart(2, '0')}:00`;
      
      // Kiểm tra điều kiện cho ngày hiện tại
      if (!isToday || 
          (normalizedHour > currentHour) || 
          (normalizedHour === currentHour && currentMinute <= 30)) {
        
        // Thêm "(+1 ngày)" cho các giờ sau 0h
        if (hour >= 24) {
          slots.push(`${timeString} (+1 ngày)`);
        } else {
          slots.push(timeString);
        }
      }
    }

    return slots;
  };

  const handleTimeChange = (time: string) => {
    if (time !== selectedTime) { // Chỉ thực hiện khi chọn giờ khác
      setSelectedTime(time);
      // Reset các state liên quan
      setSelectedTables([]);
      setAvailableTables([]);
      setCurrentTableType(null);
      setHasSearched(false); // Reset state hasSearched khi đổi giờ
      setShowTypeDescription(false); // Reset hiển thị description nếu có
    }
    setShowTimePicker(false);
  };

  // Load bar detail và table types khi component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!id) return;
      
      try {
        const detail = await barService.getBarDetail(id as string);
        setBarDetail(detail);
        
        if (detail) {
          await loadTableTypes();
          
          // Kiểm tra giờ mở cửa ngay khi có dữ liệu
          const today = new Date();
          const dayOfWeek = today.getDay();
          const barTimeForSelectedDay = detail.barTimeResponses.find(
            time => time.dayOfWeek === dayOfWeek
          );

          if (!barTimeForSelectedDay) {
            setClosedMessage(`Quán không mở cửa vào ${
              dayOfWeek === 0 ? 'Chủ nhật' : `Thứ ${dayOfWeek + 1}`
            }`);
            setShowClosedModal(true);
            return;
          }

          const slots = generateAvailableTimeSlots(today, detail);
          
          if (slots.length === 0) {
            setClosedMessage("Không có khung giờ nào khả dụng cho ngày này");
            setShowClosedModal(true);
          } else {
            setAvailableTimeSlots(slots);
            setSelectedTime(slots[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    
    fetchInitialData();
  }, [id]); // Chỉ phụ thuộc vào id

  // Kiểm tra giờ mở cửa khi thay đổi ngày
  useEffect(() => {
    if (!barDetail) return;

    const dayOfWeek = selectedDate.getDay();
    const barTimeForSelectedDay = barDetail.barTimeResponses.find(
      time => time.dayOfWeek === dayOfWeek
    );

    // Reset states
    setAvailableTimeSlots([]);
    setSelectedTime('');
    setSelectedTables([]);
    setAvailableTables([]);
    setCurrentTableType(null);
    setHasSearched(false);
    setShowTypeDescription(false);

    if (!barTimeForSelectedDay) {
      setClosedMessage(`Quán không mở cửa vào ${
        dayOfWeek === 0 ? 'Chủ nhật' : `Thứ ${dayOfWeek + 1}`
      }`);
      setShowClosedModal(true);
      return;
    }

    const slots = generateAvailableTimeSlots(selectedDate, barDetail);
    
    if (slots.length === 0) {
      setClosedMessage("Không có khung giờ nào khả dụng cho ngày này");
      setShowClosedModal(true);
    } else {
      setShowClosedModal(false);
      setAvailableTimeSlots(slots);
      setSelectedTime(slots[0]);
    }
  }, [selectedDate, barDetail]); // Chỉ phụ thuộc vào selectedDate và barDetail

  // Thêm cleanup function cho modal
  useEffect(() => {
    return () => {
      setShowClosedModal(false);
    };
  }, []);

  const loadTableTypes = async () => {
    if (!id) return;
    setIsLoadingTableTypes(true);
    try {
      const types = await tableTypeService.getTableTypesOfBar(id as string);
      setTableTypes(types);
    } catch (error) {
      console.error('Error loading table types:', error);
      setTableTypes([]);
    } finally {
      setIsLoadingTableTypes(false);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    
    // Nếu người dùng cancel hoặc không chọn ngày
    if (!date || event.type === 'dismissed') {
      return;
    }

    // Khi người dùng chọn ngày mới
    setSelectedDate(date);
    // Reset các state liên quan
    setSelectedTables([]);
    setAvailableTables([]);
    setCurrentTableType(null);
    setHasSearched(false);
    setShowTypeDescription(false);
  };

  const handleSearchTables = async () => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const filter: BookingTableFilter = {
        barId: id as string,
        tableTypeId: selectedTableType,
        date: format(selectedDate, 'yyyy-MM-dd'), // Luôn sử dụng ngày gốc cho filter
        timeSpan: selectedTime.replace(' (+1 ngày)', '') + ':00',
      };

      const response = await bookingTableService.findAvailableTables(filter);
      const tables = response.bookingTables[0]?.tables || [];
      
      const formattedTables: TableUI[] = tables.map(table => ({
        id: table.tableId,
        name: table.tableName,
        status: table.status === 1 ? 'available' as const : 'booked' as const,
        typeId: selectedTableType
      }));

      setAvailableTables(formattedTables);
    } catch {
      setAvailableTables([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTableSelection = (table: TableUI) => {
    setSelectedTables(prev => {
      const existingIndex = prev.findIndex(t => t.id === table.id);
      
      if (existingIndex !== -1) {
        return prev.filter(t => t.id !== table.id);
      }
      
      if (prev.length >= MAX_TABLES) {
        setShowMaxTablesModal(true);
        return prev;
      }

      const tableTypeInfo = tableTypes.find(t => t.tableTypeId === table.typeId);
      return [...prev, {
        id: table.id,
        name: table.name,
        typeId: table.typeId,
        typeName: tableTypeInfo?.typeName || ''
      }];
    });
  };

  const handleRemoveTable = (tableId: string) => {
    setSelectedTables(prev => prev.filter(t => t.id !== tableId));
  };

  const handleTableTypeSelect = (typeId: string) => {
    setSelectedTableType(typeId);
    const selectedType = tableTypes.find(t => t.tableTypeId === typeId);
    setCurrentTableType(selectedType ? { 
      id: selectedType.tableTypeId, 
      name: selectedType.typeName 
    } : null);
    setShowTypeDescription(true); // Hiển thị description khi chọn loại bàn
  };

  useEffect(() => {
    const fetchAccountInfo = async () => {
      if (!user?.accountId) return;
      setIsLoadingAccount(true);
      try {
        const data = await accountService.getAccountInfo(user.accountId);
        setAccountInfo(data);
      } catch (error) {
        console.error('Error fetching account info:', error);
      } finally {
        setIsLoadingAccount(false);
      }
    };
    
    fetchAccountInfo();
  }, [user?.accountId]); // Thêm dependency user?.accountId

  const handleBookingNow = async () => {
    setShowConfirmModal(true);
  };

  const handleBookingWithDrinks = () => {
    // Chuyển đến màn hình chn nước uống
    // router.push({
    //   pathname: "/drinks-selection/[id]" as const,
    //   params: {
    //     id: id as string,
    //     tables: JSON.stringify(selectedTables),
    //     date: format(selectedDate, 'yyyy-MM-dd'),
    //     time: selectedTime
    //   }
    // });
  };

  const handleConfirmBooking = async () => {
    if (isBooking) return;
    setIsBooking(true);
    setShowProcessingModal(true);
    setBookingStatus('processing');
    setBookingError('');
    
    try {
      const bookingDate = selectedTime.includes('(+1 ngày)') 
        ? format(addDays(selectedDate, 1), 'yyyy-MM-dd')
        : format(selectedDate, 'yyyy-MM-dd');

      const bookingRequest: BookingTableRequest = {
        barId: id as string,
        bookingDate,
        bookingTime: selectedTime.replace(' (+1 ngày)', '') + ':00',
        note: note,
        tableIds: selectedTables.map(table => table.id)
      };

      await bookingTableService.bookTable(bookingRequest);
      setBookingStatus('success');
      setShowConfirmModal(false);
      
      // Delay trước khi chuyển trang
      setTimeout(() => {
        setShowProcessingModal(false);
        router.push('/booking-history');
      }, 1500);
    } catch (error) {
      console.error('Error booking tables:', error);
      setBookingStatus('error');
      setBookingError('Có lỗi xảy ra khi đặt bàn. Vui lòng thử lại.');
    } finally {
      setIsBooking(false);
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
              className="w-10 h-10 items-center justify-center rounded-full bg-white/0"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-yellow-500 text-2xl font-bold ml-4">
              Đặt bàn
            </Text>
          </View>
        </View>

        {/* Thông tin quán */}
        <View className="bg-neutral-900 px-6 py-6 border-b border-white/10">
          {barDetail ? (
            <View>
              <View className="flex-row items-center mb-4">
                <Image 
                  source={{ 
                    uri: getImageArray(barDetail.images)[0] || 'https://placehold.co/64x64/333/FFF?text=Bar'
                  }} 
                  className="w-16 h-16 rounded-xl"
                  onError={() => {
                    // Không cần xử lý onError vì đã có fallback trong uri
                  }}
                />
                <View className="ml-4 flex-1">
                  <Text className="text-white text-xl font-bold mb-1">
                    {barDetail.barName}
                  </Text>
                  <View className="flex-row items-center">
                    <Ionicons name="location" size={16} color="#EAB308" />
                    <Text className="text-white/60 ml-1 flex-1">
                      {barDetail.address}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-row justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={16} color="#EAB308" />
                  <Text className={`ml-1 ${
                    getOperatingHours(selectedDate, barDetail).isOpen 
                      ? 'text-white/60' 
                      : 'text-red-500'
                  }`}>
                    {getOperatingHours(selectedDate, barDetail).hours}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="call-outline" size={16} color="#EAB308" />
                  <Text className="text-white/60 ml-1">
                    {barDetail.phoneNumber}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <Animated.View 
              entering={FadeIn}
              className="space-y-4"
            >
              {/* Skeleton cho phần header */}
              <View className="flex-row items-center">
                {/* Skeleton cho ảnh */}
                <View className="w-16 h-16 rounded-xl bg-white/10 animate-pulse" />
                
                <View className="ml-4 flex-1">
                  {/* Skeleton cho tên quán */}
                  <View className="h-7 w-48 bg-white/10 rounded-lg animate-pulse mb-2" />
                  
                  {/* Skeleton cho địa chỉ */}
                  <View className="flex-row items-center">
                    <View className="w-4 h-4 rounded-full bg-white/10 animate-pulse" />
                    <View className="h-4 w-56 bg-white/10 rounded animate-pulse ml-1" />
                  </View>
                </View>
              </View>

              {/* Skeleton cho phần thông tin thêm */}
              <View className="flex-row justify-between">
                {/* Skeleton cho giờ mở cửa */}
                <View className="flex-row items-center">
                  <View className="w-4 h-4 rounded-full bg-white/10 animate-pulse" />
                  <View className="h-4 w-32 bg-white/10 rounded animate-pulse ml-1" />
                </View>
                
                {/* Skeleton cho số điện thoại */}
                <View className="flex-row items-center">
                  <View className="w-4 h-4 rounded-full bg-white/10 animate-pulse" />
                  <View className="h-4 w-24 bg-white/10 rounded animate-pulse ml-1" />
                </View>
              </View>
            </Animated.View>
          )}
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 150 }}>
          {/* Thông tin khách hàng */}
          <View className="bg-neutral-900 px-6 py-6">
            {isLoadingAccount ? (
              <Animated.View 
                entering={FadeIn}
                className="flex-row items-center"
              >
                {/* Skeleton cho avatar */}
                <View className="w-12 h-12 rounded-full bg-white/10 animate-pulse" />
                
                <View className="ml-3 flex-1">
                  {/* Skeleton cho tên */}
                  <View className="h-6 w-40 bg-white/10 rounded-lg animate-pulse mb-2" />
                  
                  {/* Skeleton cho email và số điện thoại */}
                  <View className="flex-row items-center">
                    <View className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                    <View className="w-1.5 h-1.5 rounded-full bg-white/20 mx-2" />
                    <View className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                  </View>
                </View>
              </Animated.View>
            ) : (
              <View className="flex-row items-center">
                <Image 
                  source={{ 
                    uri: accountInfo?.image || 'https://ui-avatars.com/api/?name=' + accountInfo?.fullname 
                  }} 
                  className="w-12 h-12 rounded-full"
                  onError={() => {
                    setAccountInfo(prev => prev ? {
                      ...prev,
                      image: `https://ui-avatars.com/api/?name=${prev.fullname}`
                    } : null)
                  }}
                />
                <View className="ml-3 flex-1">
                  <Text className="text-white font-bold text-lg">
                    {accountInfo?.fullname || ''}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Text className="text-white/60">
                      {accountInfo?.email || ''}
                    </Text>
                    <View className="w-1.5 h-1.5 rounded-full bg-white/20 mx-2" />
                    <Text className="text-white/60">
                      {accountInfo?.phone || ''}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Phần còn lại */}
          <View className="px-6">
            <Animated.View entering={FadeIn} className="space-y-6 py-6">
              {/* Chọn ngày và giờ */}
              <View className="flex-row space-x-4">
                {/* Chọn ngày */}
                <View className="flex-1">
                  <Text className="text-white text-lg font-bold mb-4">Chọn ngày</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="bg-white/10 p-4 rounded-xl"
                  >
                    <Text className="text-white">
                      {format(selectedDate, 'dd/MM/yyyy', { locale: vi })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Chọn giờ */}
                <View className="flex-1">
                  <Text className="text-white text-lg font-bold mb-4">Chọn giờ</Text>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    className="bg-white/10 p-4 rounded-xl"
                  >
                    <Text className="text-white">
                      {selectedTime}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Chọn loại bàn */}
              <View>
                <Text className="text-white text-lg font-bold mb-4">Chọn loại bàn</Text>
                
                {isLoadingTableTypes ? (
                  <Animated.View 
                    entering={FadeIn}
                    className="space-x-3 flex-row mb-6"
                  >
                    {[1,2,3].map((i) => (
                      <View key={i} className="h-12 w-32 bg-white/10 rounded-xl animate-pulse" />
                    ))}
                  </Animated.View>
                ) : tableTypes.length === 0 ? (
                  <View className="bg-white/5 rounded-xl p-6 mb-6">
                    <View className="items-center">
                      <View className="bg-white/10 p-4 rounded-full mb-4">
                        <MaterialCommunityIcons
                          name="table-chair"
                          size={40}
                          color="#9CA3AF"
                        />
                      </View>
                      <Text className="text-gray-300 text-lg font-medium text-center">
                        Quán chưa cập nhật loại bàn
                      </Text>
                      <Text className="text-gray-500 text-sm text-center mt-2">
                        Thông tin loại bàn đang được cập nhật. Vui lòng quay lại sau hoặc liên hệ trực tiếp với quán để biết thêm chi tiết.
                      </Text>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${barDetail?.phoneNumber}`)}
                        className="bg-yellow-500 px-6 py-3 rounded-xl mt-4"
                      >
                        <Text className="text-black font-bold">Liên h quán</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View className="mb-6">
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      className="flex-row"
                    >
                      {tableTypes.map((type) => (
                        <TouchableOpacity
                          key={type.tableTypeId}
                          onPress={() => {
                            setSelectedTableType(type.tableTypeId);
                            setCurrentTableType({
                              id: type.tableTypeId,
                              name: type.typeName
                            });
                            setShowTypeDescription(true);
                          }}
                          className={`bg-white/10 px-4 py-3 rounded-xl mr-3 ${
                            selectedTableType === type.tableTypeId ? 'border border-yellow-500' : ''
                          }`}
                        >
                          <Text className="text-white font-medium">{type.typeName}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Description */}
                    {showTypeDescription && selectedTableType && (
                      <Animated.View 
                        entering={FadeIn}
                        className="bg-white/5 rounded-xl p-4 mt-4"
                      >
                        {tableTypes.map(type => {
                          if (type.tableTypeId === selectedTableType) {
                            return (
                              <View key={type.tableTypeId}>
                                <Text className="text-white/60 mb-2">
                                  {type.description}
                                </Text>
                                <View className="flex-row justify-between items-center">
                                  <Text className="text-yellow-500">
                                    Tối thiểu {type.minimumPrice.toLocaleString('vi-VN')}đ
                                  </Text>
                                  <TouchableOpacity 
                                    onPress={() => setShowTypeDescription(false)}
                                    className="bg-white/10 rounded-full p-2"
                                  >
                                    <Ionicons name="close" size={16} color="white" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          }
                          return null;
                        })}
                      </Animated.View>
                    )}
                  </View>
                )}

                {/* Nút Tìm bàn - luôn hiển thị bên dưới */}
                <TouchableOpacity
                  className={`w-full py-4 rounded-xl ${
                    selectedDate && selectedTime && selectedTableType
                      ? 'bg-yellow-500'
                      : 'bg-white/10'
                  }`}
                  disabled={!selectedDate || !selectedTime || !selectedTableType || isSearching}
                  onPress={handleSearchTables}
                >
                  <Text className={`text-center font-bold ${
                    selectedDate && selectedTime && selectedTableType
                      ? 'text-black'
                      : 'text-white/60'
                  }`}>
                    {isSearching ? 'Đang tìm...' : 'Tìm bàn'}
                  </Text>
                </TouchableOpacity>

                {/* Loading Skeleton */}
                {isSearching && (
                  <Animated.View 
                    entering={FadeIn}
                    className="space-y-4 mt-4"
                  >
                    <View className="h-6 bg-white/10 rounded-xl animate-pulse" />
                    <View className="flex-row justify-between space-x-2">
                      {[1,2,3,4,5].map((i) => (
                        <View key={i} className="flex-1 h-12 bg-white/10 rounded-xl animate-pulse" />
                      ))}
                    </View>
                  </Animated.View>
                )}

                {/* Kết quả tìm bàn */}
                {!isSearching && availableTables.length > 0 && (
                  <Animated.View entering={FadeIn}>
                    <Text className="text-white text-lg font-bold mb-4 mt-4">Chọn Bàn</Text>
                    <View className="flex-row flex-wrap justify-between">
                      {availableTables.map((table) => (
                        <TouchableOpacity
                          key={table.id}
                          onPress={() => handleTableSelection(table)}
                          disabled={table.status === 'booked'}
                          className={`mb-3 px-4 py-3 rounded-xl ${
                            table.status === 'booked' 
                              ? 'bg-yellow-500/50' 
                              : selectedTables.some(t => t.id === table.id)
                                ? 'bg-yellow-500'
                                : 'bg-white/20'
                          }`}
                        >
                          <Text className={`text-center font-bold ${
                            table.status === 'booked' || selectedTables.some(t => t.id === table.id)
                              ? 'text-black'
                              : 'text-white'
                          }`}>
                            {table.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    {/* Chú thích trạng thái */}
                    <View className="flex-row justify-between mt-4">
                      <View className="flex-row items-center">
                        <View className="w-4 h-4 rounded-full bg-yellow-500/50 mr-2" />
                        <Text className="text-white/60">Đã được đặt</Text>
                      </View>
                      <View className="flex-row items-center">
                        <View className="w-4 h-4 rounded-full bg-white/10 mr-2" />
                        <Text className="text-white/60">Trống</Text>
                      </View>
                      <View className="flex-row items-center">
                        <View className="w-4 h-4 rounded-full bg-yellow-500 mr-2" />
                        <Text className="text-white/60">Đang chọn</Text>
                      </View>
                    </View>
                  </Animated.View>
                )}
              </View>

              {/* Ghi chú */}
              <View className="mt-6">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="pencil" size={20} color="#EAB308" />
                  <Text className="text-white font-bold text-lg ml-2">Ghi chú</Text>
                </View>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Nhập ghi chú nếu cần..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  numberOfLines={3}
                  className="bg-white/10 p-4 rounded-xl text-white"
                />
              </View>
            </Animated.View>
          </View>
        </ScrollView>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={minDate}
            maximumDate={maxDate}
          />
        )}

        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-neutral-800 p-6 rounded-xl w-3/4 max-h-[70%]">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-white">Chọn giờ</Text>
                <TouchableOpacity 
                  onPress={() => setShowTimePicker(false)}
                  className="p-2"
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {availableTimeSlots.length > 0 ? (
                  availableTimeSlots.map((time) => (
                    <TouchableOpacity
                      key={time}
                      onPress={() => handleTimeChange(time)}
                      className={`p-4 rounded-xl mb-2 ${
                        selectedTime === time ? 'bg-yellow-500' : 'bg-white/10'
                      }`}
                    >
                      <Text className={`text-center ${
                        selectedTime === time ? 'text-black' : 'text-white'
                      }`}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text className="text-white text-center">
                    Không có khung giờ nào khả dụng
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Footer hiển thị bàn đã chọn */}
        {selectedTables.length > 0 && (
          <View className="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-white/10">
            <View className="px-6 py-3"> 
              {/* Phần hiển thị bàn đã chọn */}
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white font-bold text-sm">
                  Bàn đã chọn: {selectedTables.length}/{MAX_TABLES}
                </Text> 
                <TouchableOpacity 
                  onPress={() => setShowSelectedTablesModal(true)}
                  className="bg-white/10 px-2 py-0.5 rounded-full"
                >
                  <Text className="text-white text-xs">
                    Xem tất cả ({selectedTables.length})
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* ScrollView cho danh sách bàn */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                className="flex-row mb-3" 
              >
                {selectedTables.map((table) => (
                  <View 
                    key={table.id}
                    className="bg-yellow-500 rounded-lg px-2 py-1.5 mr-2" 
                  >
                    <View className="flex-row items-center">
                      <Text className="text-black font-bold text-sm mr-2"> 
                        {table.name} ({table.typeName})
                      </Text>
                      <TouchableOpacity 
                        onPress={() => handleRemoveTable(table.id)}
                        className="bg-black/20 rounded-full p-0.5" 
                      >
                        <Ionicons name="close" size={14} color="black" /> 
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Buttons */}
              <View className="flex-row space-x-2"> 
                <TouchableOpacity 
                  onPress={() => handleBookingNow()}
                  className="flex-1 bg-yellow-500 py-2.5 rounded-xl" 
                >
                  <Text className="text-black text-center font-bold text-sm"> 
                    Đặt bàn ngay
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => handleBookingWithDrinks()}
                  className="flex-1 bg-white/10 py-2.5 rounded-xl relative"
                >
                  <Text className="text-white text-center font-bold text-sm"> 
                    Đặt kèm nước uống
                  </Text>
                  {/* Badge giảm giá */}
                  <View className="absolute -top-2 -right-2 bg-yellow-500 px-1.5 py-0.5 rounded-full">
                    <Text className="text-black text-[10px] font-bold">-10%</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Modal hiển thị tất cả bàn đã chọn */}
        <Modal
          visible={showSelectedTablesModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSelectedTablesModal(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-neutral-900 rounded-t-3xl">
              <View className="px-6 pt-6 pb-4 border-b border-white/10">
                <View className="flex-row justify-between items-center">
                  <Text className="text-white text-xl font-bold">
                    Danh sách bàn đã chọn
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setShowSelectedTablesModal(false)}
                    className="p-2"
                  >
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView 
                className="px-6 py-4"
                style={{ maxHeight: 400 }}
                showsVerticalScrollIndicator={false}
              >
                {selectedTables.map((table) => (
                  <View 
                    key={table.id}
                    className="bg-white/10 rounded-xl p-4 mb-3"
                  >
                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="text-white text-lg font-bold">
                          {table.name}
                        </Text>
                        <Text className="text-white/60">
                          Loại bàn: {table.typeName}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => handleRemoveTable(table.id)}
                        className="bg-white/20 rounded-full p-2"
                      >
                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View className="px-6 py-4 border-t border-white/10">
                <TouchableOpacity 
                  onPress={() => setShowSelectedTablesModal(false)}
                  className="bg-yellow-500 rounded-xl py-4"
                >
                  <Text className="text-black text-center font-bold">
                    Đóng
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal xác nhận đặt bàn */}
        <Modal
          visible={showConfirmModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-neutral-900 rounded-xl w-[90%] max-w-md overflow-hidden">
              {/* Header */}
              <View className="border-b border-white/10 p-4">
                <Text className="text-white text-xl font-bold text-center">
                  Xác nhận đặt bàn
                </Text>
              </View>

              {/* Content */}
              <View className="p-6">
                {/* Thông tin quán */}
                <View className="mb-6">
                  <Text className="text-yellow-500 font-bold mb-2">Thông tin quán</Text>
                  <Text className="text-white text-lg font-medium mb-1">
                    {barDetail?.barName}
                  </Text>
                  <Text className="text-white/60">
                    {barDetail?.address}
                  </Text>
                </View>

                {/* Thông tin đặt bàn */}
                <View className="bg-white/5 rounded-xl p-4 mb-4">
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="calendar-outline" size={20} color="#ffffff" />
                    <Text className="text-white ml-2">
                      {format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="time-outline" size={20} color="#ffffff" />
                    <Text className="text-white ml-2">
                      {selectedTime.replace(' (+1 ngày)', '')}
                    </Text>
                  </View>

                  <View className="flex-row items-center mb-3">
                    <MaterialCommunityIcons 
                      name="table-chair"  // hoặc "table" tùy theo icon pack
                      size={20} 
                      color="#ffffff" 
                    />
                    <Text className="text-white ml-2">
                      {selectedTables.length} bàn đã chọn
                    </Text>
                  </View>

                  {/* Danh sách bàn */}
                  <View className="bg-white/5 rounded-lg p-3 mb-3">
                    {selectedTables.map((table, index) => (
                      <Text key={table.id} className="text-white/80 text-sm">
                        {index + 1}. {table.name} ({table.typeName})
                      </Text>
                    ))}
                  </View>

                  {note && (
                    <View className="flex-row items-start">
                      <Ionicons name="document-text-outline" size={20} color="#ffffff" />
                      <Text className="text-white/80 ml-2 flex-1">
                        Ghi chú: {note}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Điều khoản */}
                <Text className="text-white/60 text-sm mb-6 text-center">
                  Bằng cách nhấn "Xác nhận", bạn đồng ý với các điều khoản đặt bàn của chúng tôi
                </Text>

                {/* Buttons */}
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
                    disabled={isBooking}
                    className="flex-1 bg-yellow-500 py-4 rounded-xl"
                  >
                    {isBooking ? (
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

        {/* UI thông báo không có bàn */}
        {hasSearched && !isSearching && availableTables.length === 0 && (
          <Modal
            visible={hasSearched && !isSearching && availableTables.length === 0}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setHasSearched(false)}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => setHasSearched(false)}
              className="flex-1 justify-center items-center bg-black/50"
            >
              <TouchableOpacity 
                activeOpacity={1}
                onPress={e => e.stopPropagation()} 
                className="bg-neutral-800 w-[85%] rounded-xl p-6"
              >
                <View className="items-center">
                  {/* Header với nút đóng */}
                  <View className="w-full flex-row justify-end mb-4">
                    <TouchableOpacity 
                      onPress={() => setHasSearched(false)}
                      className="p-1"
                    >
                      <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                  </View>

                  {/* Icon và nội dung */}
                  <View className="bg-white/10 p-4 rounded-full mb-4">
                    <MaterialCommunityIcons
                      name="table-furniture"
                      size={40}
                      color="#9CA3AF"
                    />
                  </View>
                  <Text className="text-white text-lg font-medium text-center mb-2">
                    Không có bàn cho loại này
                  </Text>
                  <Text className="text-gray-400 text-center mb-6">
                    Hiện tại không có bàn nào thuộc loại {currentTableType?.name} có sẵn
                  </Text>
                  
                  {/* Nút tác vụ */}
                  <View className="w-full">
                    <TouchableOpacity 
                      onPress={() => {
                        setSelectedTableType('');
                        setCurrentTableType(null);
                        setShowTypeDescription(false);
                        setHasSearched(false);
                      }}
                      className="flex-row items-center justify-center bg-white/10 p-4 rounded-xl"
                    >
                      <MaterialCommunityIcons name="table-chair" size={20} color="#EAB308" className="mr-2" />
                      <Text className="text-white ml-2">Chọn loại bàn khác</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Modal thông báo quán đóng cửa */}
        {showClosedModal && (
          <Modal
            visible={showClosedModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowClosedModal(false)}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => setShowClosedModal(false)}
              className="flex-1 justify-center items-center bg-black/50"
            >
              <TouchableOpacity 
                activeOpacity={1}
                onPress={e => e.stopPropagation()} 
                className="bg-neutral-800 w-[85%] rounded-xl p-6"
              >
                <View className="items-center">
                  {/* Header với nút đóng */}
                  <View className="w-full flex-row justify-end mb-4">
                    <TouchableOpacity 
                      onPress={() => setShowClosedModal(false)}
                      className="p-1"
                    >
                      <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                  </View>

                  {/* Icon và nội dung */}
                  <View className="bg-white/10 p-4 rounded-full mb-4">
                    <Ionicons
                      name="time-outline"
                      size={40}
                      color="#9CA3AF"
                    />
                  </View>
                  <Text className="text-white text-lg font-medium text-center mb-2">
                    Quán đóng cửa
                  </Text>
                  <Text className="text-gray-400 text-center mb-6">
                    {closedMessage}
                  </Text>
                  
                  {/* Nút tác vụ */}
                  <View className="w-full">
                    <TouchableOpacity 
                      onPress={() => {
                        setShowClosedModal(false); // Đóng modal trước
                        setTimeout(() => {
                          setShowDatePicker(true); // Mở date picker sau một khoảng thời gian ngắn
                        }, 100);
                      }}
                      className="flex-row items-center justify-center bg-white/10 p-4 rounded-xl"
                    >
                      <Ionicons name="calendar-outline" size={20} color="#EAB308" className="mr-2" />
                      <Text className="text-white ml-2">Chọn ngày khác</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Modal thông báo đã chọn tối đa bàn */}
        {showMaxTablesModal && (
          <Modal
            visible={showMaxTablesModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowMaxTablesModal(false)}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => setShowMaxTablesModal(false)}
              className="flex-1 justify-center items-center bg-black/50"
            >
              <TouchableOpacity 
                activeOpacity={1}
                onPress={e => e.stopPropagation()} 
                className="bg-neutral-800 w-[85%] rounded-xl p-6"
              >
                <View className="items-center">
                  {/* Header với nút đóng */}
                  <View className="w-full flex-row justify-end mb-4">
                    <TouchableOpacity 
                      onPress={() => setShowMaxTablesModal(false)}
                      className="p-1"
                    >
                      <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                  </View>

                  {/* Icon và nội dung */}
                  <View className="bg-white/10 p-4 rounded-full mb-4">
                    <MaterialCommunityIcons
                      name="table-furniture"
                      size={40}
                      color="#9CA3AF"
                    />
                  </View>
                  <Text className="text-white text-lg font-medium text-center mb-2">
                    Đã đạt giới hạn bàn
                  </Text>
                  <Text className="text-gray-400 text-center mb-6">
                    Bạn chỉ có thể chọn tối đa {MAX_TABLES} bàn cho mỗi lần đặt
                  </Text>
                  
                  {/* Nút tác vụ */}
                  <View className="w-full">
                    <TouchableOpacity 
                      onPress={() => setShowMaxTablesModal(false)}
                      className="flex-row items-center justify-center bg-white/10 p-4 rounded-xl"
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color="#EAB308" className="mr-2" />
                      <Text className="text-white ml-2">Đã hiểu</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Modal xử lý booking */}
        {showProcessingModal && (
          <Modal
            visible={showProcessingModal}
            transparent={true}
            animationType="fade"
          >
            <View className="flex-1 justify-center items-center bg-black/50">
              <View className="bg-neutral-800 w-[85%] rounded-xl p-6">
                <View className="items-center">
                  {bookingStatus === 'processing' && (
                    <>
                      <ActivityIndicator size="large" color="#EAB308" className="mb-4" />
                      <Text className="text-white text-lg font-medium text-center">
                        Đang xử lý đặt bàn...
                      </Text>
                    </>
                  )}

                  {bookingStatus === 'success' && (
                    <>
                      <View className="bg-white/10 p-4 rounded-full mb-4">
                        <Ionicons name="checkmark-circle-outline" size={40} color="#22C55E" />
                      </View>
                      <Text className="text-white text-lg font-medium text-center mb-2">
                        Đặt bàn thành công!
                      </Text>
                      <Text className="text-gray-400 text-center">
                        Bạn sẽ được chuyển đến trang lịch sử đặt bàn
                      </Text>
                    </>
                  )}

                  {bookingStatus === 'error' && (
                    <>
                      <View className="bg-white/10 p-4 rounded-full mb-4">
                        <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
                      </View>
                      <Text className="text-white text-lg font-medium text-center mb-2">
                        Đặt bàn thất bại
                      </Text>
                      <Text className="text-gray-400 text-center mb-6">
                        {bookingError}
                      </Text>
                      <View className="w-full space-y-3">
                        <TouchableOpacity 
                          onPress={() => setShowProcessingModal(false)}
                          className="bg-white/10 py-4 rounded-xl"
                        >
                          <Text className="text-white text-center">Đóng</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={handleConfirmBooking}
                          className="bg-yellow-500 py-4 rounded-xl"
                        >
                          <Text className="text-black text-center font-bold">Thử lại</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </View>
  );
}
