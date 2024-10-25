import { View, Text, ScrollView, TouchableOpacity, Platform, Modal, TextInput, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BarDetail, barService } from '@/services/bar';
import { TableType, tableTypeService } from '@/services/table-type';
import Animated, { FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, accountService } from '@/services/account';
import { useAuth } from '@/contexts/AuthContext';
import { bookingTableService } from '@/services/booking-table';

// Thêm interface cho state availableTables
interface TableUI {
  id: string;
  name: string;
  status: 'available' | 'booked';
}

// Thêm interface mới để lưu thông tin bàn đã chọn
interface SelectedTableInfo {
  id: string;
  name: string;
  typeId: string;
  typeName: string;
}

// Thêm interface cho request
export interface BookingTableRequest {
  barId: string;
  bookingDate: string; // Format: yyyy-MM-dd
  bookingTime: string; // Format: HH:
  note: string;
  tableIds: string[];
}

// Thêm hàm xử lý images ở đầu file
const getImageArray = (imagesString: string): string[] => {
  if (!imagesString) return [];
  return imagesString.split(',').map(img => img.trim()).filter(img => img !== '');
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

  const generateAvailableTimeSlots = (selectedDate: Date, barDetail: BarDetail) => {
    const now = new Date();
    const startHour = parseInt(barDetail.startTime.split(':')[0]); // Ví dụ: 18
    let endHour = parseInt(barDetail.endTime.split(':')[0]);   // Ví dụ: 3
    
    // Xử lý trường hợp đóng cửa sau 0h
    const isAfterMidnight = endHour < startHour;
    if (isAfterMidnight) {
      endHour += 24; // Chuyển 3h thành 27h để dễ tính toán
    }
    
    const slots = [];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Kiểm tra nếu là ngày hiện tại
    const isToday = selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear();

    // Thêm khung giờ đêm trớc (0h-3h của ngày được chọn)
    if (!isToday || (isToday && currentHour < endHour % 24)) {
      for (let hour = 0; hour < endHour % 24; hour++) {
        if (!isToday || hour > currentHour || (hour === currentHour && currentMinute <= 30)) {
          slots.push(`${hour.toString().padStart(2, '0')}:00`);
        }
      }
    }

    // Thêm khung giờ buổi tối (18h-23h của ngày được chọn)
    for (let hour = startHour; hour < 24; hour++) {
      if (!isToday || hour > currentHour || (hour === currentHour && currentMinute <= 30)) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
      }
    }

    // Thêm khung giờ đêm sau (0h-3h của ngày hôm sau)
    for (let hour = 0; hour < endHour % 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00 (+1 ngày)`);
    }
    
    return slots;
  };

  const handleTimeChange = (time: string) => {
    // Xử lý trường hợp khung giờ của ngày hôm sau
    if (time.includes('(+1 ngày)')) {
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setSelectedDate(nextDay);
      // Loại bỏ "(+1 ngày)" khi lưu giờ
      setSelectedTime(time.replace(' (+1 ngày)', ''));
    } else {
      setSelectedTime(time);
    }
    setShowTimePicker(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        const detail = await barService.getBarDetail(id as string);
        setBarDetail(detail);
        
        if (detail) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          // Kiểm tra nếu là ngày hiện tại và đã quá muộn
          const isToday = selectedDate.getDate() === now.getDate() &&
            selectedDate.getMonth() === now.getMonth() &&
            selectedDate.getFullYear() === now.getFullYear();
          
          // Nếu là ngày hiện tại và đã quá muộn (23:01 hoặc sau đó)
          if (isToday && (currentHour === 23 && currentMinute > 0)) {
            // Tự động chuyển sang ngày hôm sau
            const nextDay = new Date(selectedDate);
            nextDay.setDate(nextDay.getDate() + 1);
            setSelectedDate(nextDay);
            return; // Thoát để useEffect chạy lại với ngày mới
          }

          const slots = generateAvailableTimeSlots(selectedDate, detail);
          setAvailableTimeSlots(slots);
          if (slots.length > 0) {
            setSelectedTime(slots[0]);
          }
        }
      }
      await loadTableTypes();
    };
    
    fetchData();
  }, [id, selectedDate]); // Thêm selectedDate vào dependencies

  const loadTableTypes = async () => {
    const types = await tableTypeService.getTableTypes();
    setTableTypes(types);
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleSearchTables = async () => {
    setIsSearching(true);
    try {
      const filter = {
        barId: id as string,
        tableTypeId: selectedTableType,
        date: format(selectedDate, 'yyyy-MM-dd'),
        timeSpan: selectedTime,
      };

      const response = await bookingTableService.findAvailableTables(filter);
      
      // Lấy danh sách bàn từ response
      const tables = response.bookingTables[0]?.tables || [];
      
      // Chuyển đổi dữ liệu để phù hợp với giao diện
      const formattedTables: TableUI[] = tables.map(table => ({
        id: table.tableId,
        name: table.tableName,
        status: table.status === 1 ? 'available' as const : 'booked' as const
      }));

      setAvailableTables(formattedTables);
    } catch (error) {
      console.error('Error searching tables:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTableSelection = (table: TableUI) => {
    setSelectedTables(prev => {
      const existingIndex = prev.findIndex(t => t.id === table.id);
      if (existingIndex !== -1) {
        // Nếu bàn đã được chọn, xóa nó
        return prev.filter(t => t.id !== table.id);
      }
      // Thêm bàn mới với thông tin loại bàn
      return [...prev, {
        id: table.id,
        name: table.name,
        typeId: selectedTableType,
        typeName: currentTableType?.name || ''
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
      try {
        const data = await accountService.getAccountInfo(user.accountId);
        setAccountInfo(data);
      } catch (error) {
        console.error('Error fetching account info:', error);
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
    try {
      // Tạo booking request với time format HH:mm
      const bookingRequest: BookingTableRequest = {
        barId: id as string,
        bookingDate: format(selectedDate, 'yyyy-MM-dd'),
        bookingTime: selectedTime.replace(' (+1 ngày)', '') + ':00',
        note: note,
        tableIds: selectedTables.map(table => table.id)
      };

      console.log('Booking Request:', JSON.stringify(bookingRequest, null, 2));

      await bookingTableService.bookTable(bookingRequest);
      setShowConfirmModal(false);
      router.push('/booking-history');
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data: any } };
        // if (axiosError.response) {
        //   console.log('Error Response:', JSON.stringify(axiosError.response.data, null, 2));
        // }
      }
      console.error('Error booking tables:', error);
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
              className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
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
                  <Text className="text-white/60 ml-1">
                    {barDetail.startTime} - {barDetail.endTime}
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
            <View className="animate-pulse">
              <View className="flex-row items-center mb-4">
                <View className="w-16 h-16 rounded-xl bg-white/10" />
                <View className="ml-4 flex-1">
                  <View className="h-6 bg-white/10 rounded w-3/4 mb-2" />
                  <View className="h-4 bg-white/10 rounded w-1/2" />
                </View>
              </View>
              <View className="flex-row justify-between">
                <View className="h-4 bg-white/10 rounded w-1/3" />
                <View className="h-4 bg-white/10 rounded w-1/3" />
              </View>
            </View>
          )}
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 150 }}>
          {/* Thông tin khách hàng */}
          <View className="bg-neutral-900 px-6 py-6">
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
                
                {/* Danh sách loại bàn nằm ngang */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
                  {tableTypes.map((type) => (
                    <TouchableOpacity
                      key={type.tableTypeId}
                      onPress={() => handleTableTypeSelect(type.tableTypeId)}
                      className={`mr-4 px-6 py-3 rounded-xl ${
                        selectedTableType === type.tableTypeId ? 'bg-yellow-500' : 'bg-white/10'
                      }`}
                    >
                      <Text className={`${
                        selectedTableType === type.tableTypeId ? 'text-black' : 'text-white'
                      }`}>
                        {type.typeName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Description panel */}
                {showTypeDescription && selectedTableType && (
                  <Animated.View 
                    entering={FadeIn}
                    className="bg-white/5 rounded-xl p-4 mb-6"
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

                {/* Nút Tìm bàn */}
                <TouchableOpacity
                  className={`w-full py-4 rounded-xl mb-6 ${
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
                    className="space-y-4"
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
                    <Text className="text-white text-lg font-bold mb-4">Chọn Bàn</Text>
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
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
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
                    Không có khung giờ no khả dụng
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
                <Text className="text-white font-bold text-sm">Bàn đã chọn:</Text> 
                <TouchableOpacity 
                  onPress={() => setShowSelectedTablesModal(true)}
                  className="bg-white/10 px-2 py-0.5 rounded-full"
                >
                  <Text className="text-white text-xs">Xem tất cả ({selectedTables.length})</Text>
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
      </SafeAreaView>
    </View>
  );
}
