import { View, Text, ScrollView, TouchableOpacity, Platform, Modal, TextInput, Image, ActivityIndicator, Alert, Linking, Keyboard, Dimensions, ViewProps, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BarDetail, barService } from '@/services/bar';
import { TableType, tableTypeService } from '@/services/table-type';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Account, accountService } from '@/services/account';
import { useAuth } from '@/contexts/AuthContext';
import { BookingTableFilter, BookingTableRequest, bookingTableService, HoldTableRequest, GetHoldTableParams, HoldTableInfo } from '@/services/booking-table';
import { useFocusEffect } from '@react-navigation/native';
import { bookingSignalRService, TableHoldEvent } from '@/services/booking-signalr';
import { useBookingSignalR } from '@/contexts/BookingSignalRContext';

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

// Cập nhật LoadingPopup component với thiết kế mới
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
              Đang xử lý đặt bàn...
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

// Thêm enum để quản lý trạng thái modal
enum ModalState {
  NONE = 'NONE',
  UPDATE_PROFILE = 'UPDATE_PROFILE',
  CLOSED_DAY = 'CLOSED_DAY',
  MAX_TABLES = 'MAX_TABLES',
  PROCESSING = 'PROCESSING'
}

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
  const [bookingStatus, setBookingStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [bookingError, setBookingError] = useState('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(selectedDate);
  const [showUpdateProfileModal, setShowUpdateProfileModal] = useState(false);
  const [isUserValidated, setIsUserValidated] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');

  // Thay thế các state quản lý modal riêng lẻ bằng một state duy nhất
  const [currentModal, setCurrentModal] = useState<ModalState>(ModalState.NONE);

  // Thêm state để theo dõi việc redirect từ profile-detail
  const [isRedirectFromProfile, setIsRedirectFromProfile] = useState(false);

  // Thêm state để theo dõi việc cần refresh account info
  const [needRefreshAccount, setNeedRefreshAccount] = useState(false);

  // Thêm state để theo dõi trạng thái loading của từng bàn
  const [loadingTables, setLoadingTables] = useState<{ [key: string]: boolean }>({});

  // Thêm state để lưu danh sách bàn đã giữ
  const [heldTables, setHeldTables] = useState<HoldTableInfo[]>([]);

  // Thêm state mới
  const [numOfPeople, setNumOfPeople] = useState<number>(1);

  // Thêm state để quản lý modal chọn số lượng khách hàng
  const [showPeoplePickerModal, setShowPeoplePickerModal] = useState(false);

  // Thêm hàm tạo danh sách số khách hàng từ 1-30
  const generatePeopleOptions = () => {
    return Array.from({ length: 30 }, (_, i) => i + 1);
  };

  const generateAvailableTimeSlots = (selectedDate: Date, barDetail: BarDetail) => {
    if (!barDetail?.barTimeResponses) {
      return [];
    }

    const dayOfWeek = selectedDate.getDay();
    const barTimeForSelectedDay = barDetail.barTimeResponses.find(
      time => time.dayOfWeek === dayOfWeek
    );

    if (!barTimeForSelectedDay?.startTime || !barTimeForSelectedDay?.endTime) {
      return [];
    }

    const currentDate = new Date();
    const isToday = selectedDate.getDate() === currentDate.getDate() &&
                    selectedDate.getMonth() === currentDate.getMonth() &&
                    selectedDate.getFullYear() === currentDate.getFullYear();

    try {
      // Tạo date objects cho thời gian bắt đ���u và kết thúc
      const startTimeDate = new Date(selectedDate);
      const [startHour, startMinute] = barTimeForSelectedDay.startTime.split(':');
      startTimeDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

      const endTimeDate = new Date(selectedDate);
      const [endHour, endMinute] = barTimeForSelectedDay.endTime.split(':');
      endTimeDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

      // Xử lý trường hợp đóng cửa sau nửa đêm
      if (endTimeDate <= startTimeDate) {
        endTimeDate.setDate(endTimeDate.getDate() + 1);
      }

      const timeSlots: string[] = [];
      const slotInterval = barDetail.timeSlot || 1; // Sử dụng timeSlot từ barDetail hoặc mặc định 1 giờ

      // Tạo thời gian cuối cùng có thể đặt (trừ đi 1 timeSlot từ giờ đóng cửa)
      const lastPossibleSlot = new Date(endTimeDate);
      lastPossibleSlot.setHours(lastPossibleSlot.getHours() - slotInterval);

      const currentTime = new Date(startTimeDate);

      while (currentTime <= lastPossibleSlot) {
        const timeString = format(currentTime, 'HH:mm');
        const isNextDay = currentTime.getDate() !== selectedDate.getDate();
        const formattedTime = isNextDay ? `${timeString} (+1 ngày)` : timeString;

        if (isToday) {
          const now = new Date();
          // Tạo thời điểm cho khung giờ tiếp theo
          const nextSlot = new Date(now);
          nextSlot.setHours(nextSlot.getHours() + 1, 0, 0, 0);

          // Chỉ thêm time slot nếu nó là khung giờ tiếp theo hoặc sau đó
          if (currentTime >= nextSlot) {
            timeSlots.push(formattedTime);
          }
        } else {
          timeSlots.push(formattedTime);
        }

        // Tăng thêm một khoảng thời gian slot
        currentTime.setHours(currentTime.getHours() + slotInterval);
      }

      return timeSlots;

    } catch (error) {
      console.error('Error generating time slots:', error);
      return [];
    }
  };

  // Thêm hàm releaseAllTables
  const releaseAllTables = async () => {
    try {
      // Release từng bàn đã chọn
      const releasePromises = selectedTables.map(table => {
        const request: HoldTableRequest = {
          tableId: table.id,
          time: selectedTime.replace(' (+1 ngày)', '') + ':00',
          barId: id as string,
          date: selectedTime.includes('(+1 ngày)') 
            ? format(addDays(selectedDate, 1), 'yyyy-MM-dd')
            : format(selectedDate, 'yyyy-MM-dd')
        };
        return bookingTableService.releaseTable(request);
      });

      await Promise.all(releasePromises);
    } catch (error) {
      console.error('Error releasing tables:', error);
    }
  };

  // Cập nhật xử lý khi thay đổi ngày
  const handleDateChange = useCallback((event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setIsDatePickerVisible(false);
      
      if (!date || event.type === 'dismissed') {
        return;
      }

      // Release tất cả bàn trước khi thay đổi ngày
      releaseAllTables();
      setSelectedDate(date);
      setSelectedTables([]);
      setAvailableTables([]);
      setCurrentTableType(null);
      setHasSearched(false);
      setShowTypeDescription(false);
    } else {
      if (date) {
        setTempDate(date);
      }
    }
  }, [selectedTables, selectedTime, id]);

  const handleConfirmDate = () => {
    setSelectedDate(tempDate);
    setSelectedTables([]);
    setAvailableTables([]);
    setCurrentTableType(null);
    setHasSearched(false);
    setShowTypeDescription(false);
    setShowDatePicker(false);
    setIsDatePickerVisible(false);
  };

  // Cập nhật xử lý khi thay đổi giờ
  const handleTimeChange = (time: string) => {
    if (time !== selectedTime) {
      // Release tất cả bàn trước khi thay đổi giờ
      releaseAllTables();
      setSelectedTime(time);
      setSelectedTables([]);
      setAvailableTables([]);
      setCurrentTableType(null);
      setHasSearched(false);
      setShowTypeDescription(false);
    }
    setShowTimePicker(false);
  };

  // Cập nhật xử lý khi nhấn nút back
  const handleBack = async () => {
    await releaseAllTables();
    router.back();
  };

  // Thêm state để kiểm soát việc back
  const [isReleasing, setIsReleasing] = useState(false);

  // Thêm useEffect để xử lý back hệ thống
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isReleasing) return true; // Prevent back while releasing
      
      setIsReleasing(true);
      releaseAllTables().finally(() => {
        setIsReleasing(false);
        router.back();
      });
      
      return true; // Prevent default back behavior
    });

    return () => {
      backHandler.remove();
    };
  }, [selectedTables, selectedTime, id, isReleasing]);

  // Thêm cleanup khi component unmount
  useEffect(() => {
    return () => {
      releaseAllTables();
    };
  }, []);

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
    if (!barDetail || !isUserValidated || currentModal === ModalState.UPDATE_PROFILE) {
      return;
    }

    const dayOfWeek = selectedDate.getDay();
    const barTimeForSelectedDay = barDetail.barTimeResponses.find(
      time => time.dayOfWeek === dayOfWeek
    );

    // Reset các state liên quan
    setAvailableTimeSlots([]);
    setSelectedTime('');
    setSelectedTables([]);
    setAvailableTables([]);
    setCurrentTableType(null);
    setHasSearched(false);
    setShowTypeDescription(false);

    if (!barTimeForSelectedDay) {
      const dayName = dayOfWeek === 0 ? 'Chủ nhật' : `Thứ ${dayOfWeek + 1}`;
      setClosedMessage(`Quán không mở cửa vào ${dayName}`);
      setCurrentModal(ModalState.CLOSED_DAY);
      return;
    }

    const slots = generateAvailableTimeSlots(selectedDate, barDetail);
    
    if (slots.length === 0) {
      setClosedMessage("Không có khung giờ nào khả dụng cho ngày này");
      setCurrentModal(ModalState.CLOSED_DAY);
    } else {
      setCurrentModal(ModalState.NONE);
      setAvailableTimeSlots(slots);
      setSelectedTime(slots[0]);
    }
  }, [selectedDate, barDetail, isUserValidated]);

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

  const handleSearchTables = async () => {
    setIsSearching(true);
    setHasSearched(true);
    setAvailableTables([]);
    setSelectedTables([]); // Reset selectedTables trước khi tìm kiếm
    
    try {
      // Gọi cả 2 API song song để tối ưu performance
      const [holdTablesResponse, availableTablesResponse] = await Promise.all([
        bookingTableService.getHoldTable({
          barId: id as string,
          date: selectedTime.includes('(+1 ngày)') 
            ? format(addDays(selectedDate, 1), 'yyyy-MM-dd')
            : format(selectedDate, 'yyyy-MM-dd'),
          timeSpan: selectedTime.replace(' (+1 ngày)', '') + ':00'
        }),
        bookingTableService.findAvailableTables({
          barId: id as string,
          tableTypeId: selectedTableType,
          date: format(selectedDate, 'yyyy-MM-dd'),
          timeSpan: selectedTime.replace(' (+1 ngày)', '') + ':00',
        })
      ]);

      // Lưu danh sách bàn đã giữ
      setHeldTables(holdTablesResponse);

      // Lọc ra các bàn do user hiện tại giữ
      const userHeldTables = holdTablesResponse.filter(ht => ht.accountId === user?.accountId);
      
      // Map thông tin bàn đã giữ vào selectedTables
      if (userHeldTables.length > 0) {
        const selectedTablesFromHold = userHeldTables.map(ht => ({
          id: ht.tableId,
          name: ht.tableName,
          typeId: selectedTableType,
          typeName: tableTypes.find(t => t.tableTypeId === selectedTableType)?.typeName || ''
        }));
        setSelectedTables(selectedTablesFromHold);
      }

      // Xử lý danh sách bàn có sẵn
      const tables = availableTablesResponse.bookingTables[0]?.tables || [];
      
      // Map thông tin bàn có sẵn, kết hợp với thông tin bàn đã giữ
      const formattedTables: TableUI[] = tables.map(table => {
        // Tìm thông tin bàn đã giữ tương ứng
        const heldTable = holdTablesResponse.find(ht => ht.tableId === table.tableId);
        
        return {
          id: table.tableId,
          name: table.tableName,
          // Nếu bàn được giữ bởi người khác hoặc đã được đặt -> booked
          status: (heldTable && heldTable.accountId !== user?.accountId) || table.status !== 1 
            ? 'booked' 
            : 'available',
          typeId: selectedTableType
        };
      });

      setAvailableTables(formattedTables);

    } catch (error) {
      console.error('Error searching tables:', error);
      setAvailableTables([]);
      setSelectedTables([]);
      setHeldTables([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Sửa lại useEffect để không tự động gọi fetchHoldTables
  useEffect(() => {
    if (selectedTime && selectedTableType) {
      // Chỉ reset các state khi thay đổi thời gian hoặc loại bàn
      setSelectedTables([]);
      setAvailableTables([]);
      setHeldTables([]);
    }
  }, [selectedTime, selectedTableType]);

  const handleTableSelection = async (table: TableUI) => {
    if (loadingTables[table.id]) return;

    setLoadingTables(prev => ({
      ...prev,
      [table.id]: true
    }));

    try {
      const existingIndex = selectedTables.findIndex(t => t.id === table.id);
      const request: HoldTableRequest = {
        tableId: table.id,
        time: selectedTime.replace(' (+1 ngày)', '') + ':00',
        barId: id as string,
        date: selectedTime.includes('(+1 ngày)') 
          ? format(addDays(selectedDate, 1), 'yyyy-MM-dd')
          : format(selectedDate, 'yyyy-MM-dd')
      };

      if (existingIndex !== -1) {
        // Release table
        await bookingTableService.releaseTable(request);
        setSelectedTables(prev => prev.filter(t => t.id !== table.id));
      } else {
        // Check max tables
        const uniqueTablesCount = new Set(selectedTables.map(t => t.id)).size;
        if (uniqueTablesCount >= MAX_TABLES) {
          setShowMaxTablesModal(true);
          return;
        }

        // Hold table
        await bookingTableService.holdTable(request);
        const tableTypeInfo = tableTypes.find(t => t.tableTypeId === table.typeId);
        setSelectedTables(prev => [...prev, {
          id: table.id,
          name: table.name,
          typeId: table.typeId,
          typeName: tableTypeInfo?.typeName || ''
        }]);
      }
    } catch (error) {
      console.error('Error handling table selection:', error);
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Không thể thực hiện thao tác. Vui lòng thử lại.'
      );
    } finally {
      setLoadingTables(prev => ({
        ...prev,
        [table.id]: false
      }));
    }
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
    setHasSearched(false); // Reset trạng thái hasSearched khi thay đổi loại bàn
  };

  const isOver18 = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age >= 18;
  };

  const validateUserInfo = (account: Account) => {
    if (!account.phone || account.phone.trim() === '') {
      return false;
    }
    
    if (!account.dob) {
      return false;
    }
    
    return isOver18(account.dob);
  };

  useEffect(() => {
    const fetchAccountInfo = async () => {
      if (!user?.accountId) return;
      
      setIsLoadingAccount(true);
      try {
        const data = await accountService.getAccountInfo(user.accountId);
        setAccountInfo(data);
        
        if (data) {
          const isValid = validateUserInfo(data);
          setIsUserValidated(isValid);
          
          if (!isValid && !isRedirectFromProfile) {
            setCurrentModal(ModalState.UPDATE_PROFILE);
          }
        } else {
          setIsUserValidated(false);
        }
      } catch (error) {
        console.error('Error fetching account info:', error);
        setAccountInfo(null);
        setIsUserValidated(false);
      } finally {
        setIsLoadingAccount(false);
      }
    };

    fetchAccountInfo();
  }, [user?.accountId]);

  // Thêm hàm xử lý khi nhấn nút đặt bàn ngay
  const handleBookNow = () => {
    if (!validateForm()) return;
    setShowConfirmModal(true);
  };

  const handleBookingWithDrinks = () => {
    // Lọc ra danh sách bàn unique
    const uniqueTables = Array.from(
      new Map(selectedTables.map(table => [table.id, table])).values()
    );

    router.push({
      pathname: `/booking-drink/${id}` as any,
      params: {
        date: selectedTime.includes('(+1 ngày)') 
          ? format(addDays(selectedDate, 1), 'yyyy-MM-dd')
          : format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime.replace(' (+1 ngày)', '') + ':00',
        tableIds: JSON.stringify(uniqueTables.map(table => table.id)),
        selectedTables: JSON.stringify(uniqueTables.map(table => ({
          id: table.id,
          name: table.name,
          typeId: table.typeId,
          typeName: table.typeName
        }))),
        note: note.trim(),
        numOfPeople: numOfPeople.toString(),
        discount: barDetail?.discount?.toString() || '0'
      }
    });
  };

  const handleConfirmBooking = async () => {
    if (isBooking) return;
    setIsBooking(true);
    setShowConfirmModal(false);
    setShowProcessingModal(true);
    setBookingStatus('loading');
    setBookingError('');
    
    try {
      const bookingDate = selectedTime.includes('(+1 ngày)') 
        ? format(addDays(selectedDate, 1), 'yyyy-MM-dd')
        : format(selectedDate, 'yyyy-MM-dd');

      const bookingRequest: BookingTableRequest = {
        barId: id as string,
        bookingDate,
        bookingTime: selectedTime.replace(' (+1 ngày)', '') + ':00',
        note: note.trim(),
        tableIds: selectedTables.map(table => table.id),
        numOfPeople: numOfPeople // Thêm số khách hàng
      };

      await bookingTableService.bookTable(bookingRequest);
      setBookingStatus('success');
      setBookingSuccess('Đặt bàn thành công!');
      
      // Thay đổi cách navigation
      setTimeout(() => {
        setShowProcessingModal(false);
        // Replace thay vì push để không thể back lại
        router.replace({
          pathname: '/(tabs)/booking-history',
          params: { 
            reload: 'true',
            fromBooking: 'true' // Thêm param để biết là từ booking
          }
        });
      }, 1500);

    } catch (error) {
      setBookingStatus('error');
      if (error instanceof Error) {
        setBookingError(error.message);
      } else {
        setBookingError('Có lỗi xảy ra khi đặt bàn. Vui lòng thử lại.');
      }
      setTimeout(() => {
        setShowProcessingModal(false);
      }, 2000);
    } finally {
      setIsBooking(false);
    }
  };

  const handleUpdateProfile = () => {
    setIsRedirectFromProfile(true);
    setNeedRefreshAccount(true);
    setCurrentModal(ModalState.NONE);
    router.push(`/profile-detail/${user?.accountId}`);
  };

  const handleBackToBar = () => {
    setCurrentModal(ModalState.NONE);
    router.back();
  };

  const handleMaxTables = () => {
    setCurrentModal(ModalState.MAX_TABLES);
  };

  // Render modals
  const renderModals = () => {
    switch (currentModal) {
      case ModalState.UPDATE_PROFILE:
        return (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setCurrentModal(ModalState.NONE)}
          >
            <View className="flex-1 bg-black/50 justify-center items-center px-4">
              <View className="bg-neutral-800 w-full rounded-2xl p-6">
                {/* Modal content */}
                <View className="items-center mb-4">
                  <View className="w-12 h-12 bg-yellow-500/10 rounded-full items-center justify-center mb-2">
                    <Ionicons name="alert-circle" size={28} color="#EAB308" />
                  </View>
                  <Text className="text-white text-lg font-bold text-center">
                    Cập nhật thông tin
                  </Text>
                </View>
                
                <Text className="text-white/60 text-center mb-6">
                  Vui lòng cập nhật đầy đủ thông tin cá nhân (ngày sinh và số điện thoại) để tiếp tục đặt bàn
                </Text>
                
                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    onPress={handleBackToBar}
                    className="flex-1 bg-neutral-700 py-3 rounded-xl"
                  >
                    <Text className="text-white text-center font-medium">
                      Quay lại
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleUpdateProfile}
                    className="flex-1 bg-yellow-500 py-3 rounded-xl"
                  >
                    <Text className="text-black text-center font-medium">
                      Cập nhật ngay
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );

      case ModalState.CLOSED_DAY:
        return (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setCurrentModal(ModalState.NONE)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={() => setCurrentModal(ModalState.NONE)}
              className="flex-1 justify-center items-center bg-black/50 px-4"
            >
              <TouchableOpacity 
                activeOpacity={1}
                onPress={e => e.stopPropagation()}
                className="bg-neutral-800 w-[85%] max-w-[320px] rounded-xl p-6"
              >
                <View className="items-center">
                  {/* Icon và nội dung */}
                  <View className="bg-white/10 p-4 rounded-full mb-4">
                    <Ionicons name="time" size={32} color="#9CA3AF" />
                  </View>
                  <Text className="text-white text-lg font-medium text-center mb-2">
                    Quán đóng cửa
                  </Text>
                  <Text className="text-gray-400 text-center mb-6">
                    {closedMessage}
                  </Text>
                  
                  {/* Nút tác vụ */}
                  <View className="w-full space-y-3">
                    <TouchableOpacity 
                      onPress={() => {
                        setCurrentModal(ModalState.NONE);
                        setShowDatePicker(true);
                      }}
                      className="w-full bg-yellow-500 py-3 rounded-xl"
                    >
                      <Text className="text-black text-center font-medium">
                        Chọn ngày khác
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => setCurrentModal(ModalState.NONE)}
                      className="w-full bg-white/10 py-3 rounded-xl"
                    >
                      <Text className="text-white text-center font-medium">
                        Đóng
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        );

      case ModalState.PROCESSING:
        return (
          <LoadingPopup 
            visible={showProcessingModal}
            status={bookingStatus}
            errorMessage={bookingError}
            successMessage={bookingSuccess}
          />
        );

      default:
        return null;
    }
  };

  // Thay thế useEffect cũ bằng useFocusEffect
  useFocusEffect(
    useCallback(() => {
      const checkValidation = async () => {
        if (isRedirectFromProfile || needRefreshAccount) {
          // Reset flags
          setIsRedirectFromProfile(false);
          setNeedRefreshAccount(false);
          
          // Fetch lại thông tin account
          if (user?.accountId) {
            try {
              const data = await accountService.getAccountInfo(user.accountId);
              setAccountInfo(data);
              
              if (data) {
                const isValid = validateUserInfo(data);
                setIsUserValidated(isValid);
                
                if (!isValid) {
                  setCurrentModal(ModalState.UPDATE_PROFILE);
                }
              }
            } catch (error) {
              console.error('Error refreshing account info:', error);
            }
          }
        }
      };

      checkValidation();
    }, [user?.accountId, isRedirectFromProfile, needRefreshAccount])
  );

  const operatingHours = useMemo(() => {
    if (!barDetail || !selectedDate) return null;
    return getOperatingHours(selectedDate, barDetail);
  }, [barDetail, selectedDate]);

  const availableSlots = useMemo(() => {
    if (!barDetail || !selectedDate) return [];
    return generateAvailableTimeSlots(selectedDate, barDetail);
  }, [barDetail, selectedDate]);

  const scrollViewRef = useRef<ScrollView>(null);
  const noteInputRef = useRef<View>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Cập nhật hàm scrollToNoteInput
  const scrollToNoteInput = () => {
    if (noteInputRef.current && scrollViewRef.current) {
      noteInputRef.current.measure((x, y, width, height, pageX, pageY) => {
        const offset = pageY - 0; // Trừ đi một khoảng để input không bị che
        scrollViewRef.current?.scrollTo({
          y: offset,
          animated: true
        });
      });
    }
  };

  // Cập nhật useEffect để theo dõi keyboard
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // Đợi một chút để bàn phím hiện lên hoàn toàn
        setTimeout(scrollToNoteInput, 250);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Thêm context của SignalR
  const { isConnected } = useBookingSignalR();

  // Thêm useEffect để lắng nghe các sự kiện SignalR
  useEffect(() => {
    if (!isConnected) return;

    // Đăng ký lắng nghe sự kiện TableHold
    const unsubscribeTableHold = bookingSignalRService.onTableHold((event) => {
      console.log('TableHold event received:', event);
      
      // Cập nhật UI khi có bàn được hold bởi người khác
      setAvailableTables(prev => prev.map(table => {
        if (table.id === event.tableId) {
          // Nếu bàn được hold bởi người khác
          if (event.accountId !== user?.accountId) {
            return {
              ...table,
              status: 'booked'
            };
          }
        }
        return table;
      }));

      // Nếu bàn được hold bởi user hiện tại (trường hợp đa thiết bị)
      if (event.accountId === user?.accountId) {
        const tableType = tableTypes.find(t => t.tableTypeId === selectedTableType);
        setSelectedTables(prev => {
          // Kiểm tra xem bàn đã được chọn chưa
          if (!prev.some(t => t.id === event.tableId)) {
            return [...prev, {
              id: event.tableId,
              name: event.tableName, // Sử dụng tableName từ event
              typeId: selectedTableType,
              typeName: tableType?.typeName || ''
            }];
          }
          return prev;
        });
      }
    });

    // Đăng ký lắng nghe sự kiện TableRelease
    const unsubscribeTableRelease = bookingSignalRService.onTableRelease((event) => {
      console.log('TableRelease event received:', event);
      
      // Cập nhật UI khi có bàn được release
      setAvailableTables(prev => prev.map(table => {
        if (table.id === event.tableId) {
          return {
            ...table,
            status: 'available'
          };
        }
        return table;
      }));

      // Nếu bàn được release bởi user hiện tại (trường hợp đa thiết bị)
      if (event.accountId === user?.accountId) {
        setSelectedTables(prev => prev.filter(t => t.id !== event.tableId));
      }
    });

    // Cleanup
    return () => {
      unsubscribeTableHold();
      unsubscribeTableRelease();
    };
  }, [isConnected, user?.accountId, selectedTableType, tableTypes]);

  // Xử lý khi nhấn nút đặt bàn
  const handleBookTableOnly = async () => {
    if (!validateForm()) return;

    setShowConfirmModal(false);
    setShowProcessingModal(true);
    setBookingStatus('loading');
    setBookingError('');
    
    try {
      // Lọc ra danh sách bàn unique
      const uniqueTables = Array.from(
        new Map(selectedTables.map(table => [table.id, table])).values()
      );

      const bookingRequest: BookingTableRequest = {
        barId: id as string,
        bookingDate: selectedTime.includes('(+1 ngày)') 
          ? format(addDays(selectedDate, 1), 'yyyy-MM-dd')
          : format(selectedDate, 'yyyy-MM-dd'),
        bookingTime: selectedTime.replace(' (+1 ngày)', '') + ':00',
        note: note.trim(),
        tableIds: uniqueTables.map(table => table.id),
        numOfPeople: numOfPeople
      };

      await bookingTableService.bookTable(bookingRequest);
      setBookingStatus('success');
      setBookingSuccess('Đặt bàn thành công!');
      
      // Delay navigation để người dùng thấy thông báo thành công
      setTimeout(() => {
        router.replace('/booking-history');
      }, 2000);
    } catch (error) {
      console.error('Error booking table:', error);
      setBookingStatus('error');
      setBookingError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  };

  // Xử lý khi nhấn nút đặt bàn kèm đồ uống
  const handleBookWithDrinks = () => {
    // Lọc ra danh sách bàn unique
    const uniqueTables = Array.from(
      new Map(selectedTables.map(table => [table.id, table])).values()
    );

    router.push({
      pathname: `/booking-drink/${id}` as any,
      params: {
        date: selectedTime.includes('(+1 ngày)') 
          ? format(addDays(selectedDate, 1), 'yyyy-MM-dd')
          : format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime.replace(' (+1 ngày)', '') + ':00',
        tableIds: JSON.stringify(uniqueTables.map(table => table.id)),
        selectedTables: JSON.stringify(uniqueTables.map(table => ({
          id: table.id,
          name: table.name,
          typeId: table.typeId,
          typeName: table.typeName
        }))),
        note: note.trim(),
        numOfPeople: numOfPeople.toString(),
        discount: barDetail?.discount?.toString() || '0'
      }
    });
  };

  // Thêm hàm validateForm
  const validateForm = () => {
    // Kiểm tra số lượng bàn đã chọn
    const uniqueTablesCount = new Set(selectedTables.map(table => table.id)).size;
    if (uniqueTablesCount === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một bàn');
      return false;
    }

    // Kiểm tra thời gian đã chọn
    if (!selectedTime) {
      Alert.alert('Thông báo', 'Vui lòng chọn thời gian đặt bàn');
      return false;
    }

    // Kiểm tra loại bàn đã chọn
    if (!selectedTableType) {
      Alert.alert('Thông báo', 'Vui lòng chọn loại bàn');
      return false;
    }

    // Kiểm tra số lượng khách
    if (numOfPeople < 1) {
      Alert.alert('Thông báo', 'Vui lòng chọn số lượng khách hàng');
      return false;
    }

    // Kiểm tra thông tin người dùng
    if (!accountInfo?.phone || !accountInfo?.dob) {
      setShowUpdateProfileModal(true);
      return false;
    }

    return true;
  };

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header mới với thông tin quán */}
        <View className="border-b border-white/10">
          {/* Phần navigation */}
          <View className="px-4 pt-1.5 pb-2 flex-row items-center">
            <TouchableOpacity
              onPress={handleBack}
              className="h-9 w-9 bg-neutral-800 rounded-full items-center justify-center mr-3"
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
            <Text className="text-yellow-500 text-lg font-bold">
              Đặt bàn
              </Text>
          </View>

          {/* Thông tin quán */}
          {barDetail ? (
            <View className="px-4 pb-3">
              <View className="flex-row items-center">
                <Image 
                  source={{ 
                    uri: getImageArray(barDetail.images)[0] || 'https://placehold.co/64x64/333/FFF?text=Bar'
                  }} 
                  className="w-20 h-20 rounded-lg mt-1"
                />
                <View className="ml-4 flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text 
                      className="text-white font-bold text-base flex-1"
                      numberOfLines={1}
                    >
                      {barDetail.barName}
                    </Text>
                    {!operatingHours?.isOpen && (
                      <View className="ml-2 px-2 py-0.5 bg-red-500/20 rounded">
                        <Text className="text-red-500 text-[10px] font-medium">Đóng cửa</Text>
                      </View>
                    )}
                  </View>
                  
                  <View className="space-y-1 mt-0.5">
                    <View className="flex-row items-center">
                      <View className="w-5 items-center">
                        <Ionicons name="location" size={14} color="#9CA3AF" />
                      </View>
                      <Text 
                        className="text-gray-400 text-xs flex-1"
                        numberOfLines={1}
                      >
                        {barDetail.address}
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center">
                      <View className="w-5 items-center">
                        <Ionicons name="call-outline" size={14} color="#9CA3AF" />
                      </View>
                      <Text 
                        className="text-gray-400 text-xs flex-1"
                        numberOfLines={1}
                      >
                        {barDetail.phoneNumber}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <View className="w-5 items-center">
                        <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                      </View>
                      <Text 
                        className="text-gray-400 text-xs flex-1"
                        numberOfLines={1}
                      >
                        {operatingHours?.hours}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View className="px-4 pb-3">
              <Animated.View entering={FadeIn} className="flex-row items-center">
                <View className="w-20 h-20 rounded-lg bg-white/10 animate-pulse" />
                <View className="ml-3 flex-1">
                  <View className="h-4 w-32 bg-white/10 rounded animate-pulse mb-2" />
                  <View className="space-y-1.5 mt-0.5">
                    <View className="h-3 w-48 bg-white/10 rounded animate-pulse" />
                    <View className="h-3 w-32 bg-white/10 rounded animate-pulse" />
                    <View className="h-3 w-40 bg-white/10 rounded animate-pulse" />
                  </View>
                </View>
              </Animated.View>
            </View>
          )}
        </View>

        <ScrollView 
          ref={scrollViewRef}
          className="flex-1" 
          contentContainerStyle={{ 
            paddingBottom: keyboardVisible ? 400 : (selectedTables.length > 0 ? 200 : 150)
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Thông tin khách hàng */}
          <View className="px-4 my-4">
            <View className="bg-neutral-900 rounded-2xl px-6 py-4">
              {isLoadingAccount ? (
                <Animated.View entering={FadeIn} className="flex-row">
                  <View className="w-20 h-20 rounded-full bg-white/10 animate-pulse" />
                  <View className="flex-1 ml-4 space-y-2">
                    {[1, 2, 3].map((i) => (
                      <View key={i} className="flex-row items-center">
                        <View className="w-5 h-5 rounded-full bg-white/10 animate-pulse" />
                        <View className="h-4 flex-1 bg-white/10 rounded animate-pulse ml-3" />
                      </View>
                    ))}
                  </View>
                </Animated.View>
              ) : accountInfo ? (
                <View className="flex-row">
                  {/* Avatar */}
                  <Image 
                    source={{ 
                      uri: accountInfo?.image || `https://ui-avatars.com/api/?name=${accountInfo?.fullname}&background=334155&color=fff`
                    }}
                    defaultSource={require('@/assets/images/default-avatar.png')}
                    onError={() => {
                      // Khi có lỗi load ảnh, set lại state với image là undefined
                      setAccountInfo(prev => prev ? {
                        ...prev,
                        image: undefined
                      } : null);
                    }}
                    className="w-20 h-20 rounded-full bg-slate-600"
                  />

                  {/* Thông tin chi tiết */}
                  <View className="flex-1 ml-4 space-y-2">
                    {/* Tên */}
                    <View className="flex-row items-center">
                      <View className="w-5 items-center">
                        <Ionicons name="person-outline" size={16} color="#9CA3AF" />
                      </View>
                      <Text 
                        className="text-white font-bold text-base ml-3 flex-1"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {accountInfo?.fullname || ''}
                      </Text>
                    </View>

                    {/* Email */}
                    <View className="flex-row items-center">
                      <View className="w-5 items-center">
                        <Ionicons name="mail-outline" size={16} color="#9CA3AF" />
                      </View>
                      <Text 
                        className="text-white/60 text-sm ml-3 flex-1"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {accountInfo?.email || ''}
                      </Text>
                    </View>

                    {/* Số điện thoại */}
                    <View className="flex-row items-center">
                      <View className="w-5 items-center">
                        <Ionicons name="call-outline" size={16} color="#9CA3AF" />
                      </View>
                      <Text 
                        className="text-white/60 text-sm ml-3 flex-1"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {accountInfo?.phone || ''}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="items-center py-4">
                  <Text className="text-white/60">Không thể tải thông tin người dùng</Text>
                </View>
              )}
            </View>
          </View>

          {/* Phần còn lại */}
          <View className="px-4 mt-1">
            <Animated.View entering={FadeIn} className="space-y-6">
              {/* Khối đặt bàn */}
              <View className="bg-neutral-900 rounded-2xl px-6 py-4 space-y-6">
                {isLoadingTableTypes ? (
                  <Animated.View entering={FadeIn} className="space-y-6">
                    {/* Skeleton cho chọn ngày và giờ */}
                    <View className="flex-row space-x-4">
                      {/* Skeleton chọn ngày */}
                      <View className="flex-1">
                        <View className="h-5 w-24 bg-white/10 rounded animate-pulse mb-3" />
                        <View className="bg-white/10 p-4 rounded-xl flex-row items-center justify-between animate-pulse">
                          <View className="h-4 w-24 bg-white/5 rounded" />
                          <View className="w-5 h-5 bg-white/5 rounded" />
                        </View>
                      </View>

                      {/* Skeleton chọn giờ */}
                      <View className="flex-1">
                        <View className="h-5 w-20 bg-white/10 rounded animate-pulse mb-3" />
                        <View className="bg-white/10 p-4 rounded-xl flex-row items-center justify-between animate-pulse">
                          <View className="h-4 w-16 bg-white/5 rounded" />
                          <View className="w-5 h-5 bg-white/5 rounded" />
                        </View>
                      </View>
                    </View>

                    {/* Thêm phần chọn số lượng khách hàng */}
                    <View className="mt-6">
                      <Text className="text-white text-base font-bold mb-3">Số khách hàng</Text>
                      <TouchableOpacity
                        onPress={() => setShowPeoplePickerModal(true)}
                        className="bg-white/10 p-4 rounded-xl flex-row items-center justify-between"
                      >
                        <View className="flex-row items-center">
                          <Ionicons name="people-outline" size={20} color="#9CA3AF" />
                          <Text className="text-white ml-2">
                            {numOfPeople} khách hàng
                          </Text>
                        </View>
                        <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>

                    {/* Skeleton cho loại bàn */}
                    <View className="space-y-3">
                      <View className="h-5 w-28 bg-white/10 rounded animate-pulse" />
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        className="flex-row"
                      >
                        {[1,2,3,4].map((i) => (
                          <View key={i} className="mr-3">
                            <View className="h-11 w-32 bg-white/10 rounded-xl animate-pulse" />
                          </View>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Skeleton cho nút tìm bàn */}
                    <View className="h-12 bg-white/10 rounded-xl animate-pulse" />
                  </Animated.View>
                ) : (
                  <>
                    {/* Chọn ngày và giờ */}
                    <View className="flex-row space-x-4">
                      {/* Chọn ngày */}
                      <View className="flex-1">
                        <Text className="text-white text-base font-bold mb-3">Chọn ngày</Text>
                        <TouchableOpacity
                          onPress={() => setShowDatePicker(true)}
                          className="bg-white/10 p-4 rounded-xl flex-row items-center justify-between"
                        >
                          <Text className="text-white">
                            {format(selectedDate, 'dd/MM/yyyy', { locale: vi })}
                          </Text>
                          <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

                      {/* Chọn giờ */}
                      <View className="flex-1">
                        <Text className="text-white text-base font-bold mb-3">Chọn giờ</Text>
                        <TouchableOpacity
                          onPress={() => setShowTimePicker(true)}
                          className="bg-white/10 p-4 rounded-xl flex-row items-center justify-between"
                        >
                          <Text className="text-white">
                            {selectedTime || 'Chọn giờ'}
                          </Text>
                          <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Thêm phần chọn số lượng khách hàng */}
   <View className="mt-6">
     <Text className="text-white text-base font-bold mb-3">Số khách hàng</Text>
     <TouchableOpacity
       onPress={() => setShowPeoplePickerModal(true)}
       className="bg-white/10 p-4 rounded-xl flex-row items-center justify-between"
     >
       <View className="flex-row items-center">
         <Ionicons name="people-outline" size={20} color="#9CA3AF" />
         <Text className="text-white ml-2">
           {numOfPeople} khách hàng
         </Text>
       </View>
       <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
     </TouchableOpacity>
   </View>

                    {/* Chọn loại bàn */}
                    <View>
                      <Text className="text-white text-base font-bold mb-3">Chọn loại bàn</Text>
                      {isLoadingTableTypes ? (
                        <View className="space-y-4">
                          {/* Skeleton cho loại bàn */}
                          <View className="space-y-2">
                            <View className="flex-row space-x-3">
                              {[1,2,3].map((i) => (
                                <View key={i} className="h-11 w-24 bg-white/10 rounded-xl animate-pulse" />
                              ))}
                            </View>
                          </View>
                        </View>
                      ) : tableTypes.length === 0 ? (
                        <Text className="text-white/60 text-center py-4">
                          Không có loại bàn nào
                        </Text>
                      ) : (
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          className=""
                        >
                          <View className="flex-row space-x-4">
                            {tableTypes.map((type) => (
                              <TouchableOpacity
                                key={type.tableTypeId}
                                onPress={() => handleTableTypeSelect(type.tableTypeId)}
                                className={`px-4 py-3 rounded-xl ${
                                  selectedTableType === type.tableTypeId 
                                    ? 'bg-yellow-500' 
                                    : 'bg-white/10'
                                }`}
                              >
                                <Text className={
                                  selectedTableType === type.tableTypeId 
                                    ? 'text-black font-medium' 
                                    : 'text-white'
                                }>
                                  {type.typeName}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
                      )}

                      {/* Mô tả loại bàn */}
                      {showTypeDescription && currentTableType && (
                        <Animated.View 
                          entering={FadeIn}
                          className="bg-white/5 rounded-xl mt-4 overflow-hidden"
                        >
                          {/* Header */}
                          <View className="bg-white/10 px-4 py-3 flex-row items-center justify-between">
                            <View className="flex-row items-center">
                              <MaterialCommunityIcons name="table-furniture" size={20} color="#EAB308" />
                              <Text className="text-white font-medium ml-2">
                                {currentTableType.name}
                              </Text>
                            </View>
                            <View className="bg-yellow-500/20 px-2 py-1 rounded">
                              <Text className="text-yellow-500 text-xs font-medium">
                                Tối thiểu {tableTypes.find(t => t.tableTypeId === currentTableType.id)?.minimumPrice?.toLocaleString('vi-VN')}đ
                              </Text>
                            </View>
                          </View>

                          {/* Nội dung */}
                          <View className="p-4 space-y-4">
                            {/* Mô tả */}
                            <View>
                              <Text className="text-white/60 text-sm mb-1">Mô tả</Text>
                              <Text className="text-white">
                                {tableTypes.find(t => t.tableTypeId === currentTableType.id)?.description || 'Không có mô tả'}
                              </Text>
                            </View>

                            {/* Thông tin khách */}
                            <View className="flex-row space-x-4">
                              <View className="flex-1">
                                <View className="flex-row items-center mb-1">
                                  <Ionicons name="people-outline" size={14} color="#9CA3AF" />
                                  <Text className="text-white/60 text-sm ml-1">Số khách tối thiểu</Text>
                                </View>
                                <View className="bg-white/10 rounded-lg py-2 px-3">
                                  <Text className="text-white font-medium">
                                    {tableTypes.find(t => t.tableTypeId === currentTableType.id)?.minimumGuest || 0} khách hàng
                                  </Text>
                                </View>
                              </View>

                              <View className="flex-1">
                                <View className="flex-row items-center mb-1">
                                  <Ionicons name="people" size={14} color="#9CA3AF" />
                                  <Text className="text-white/60 text-sm ml-1">Số khách tối đa</Text>
                                </View>
                                <View className="bg-white/10 rounded-lg py-2 px-3">
                                  <Text className="text-white font-medium">
                                    {tableTypes.find(t => t.tableTypeId === currentTableType.id)?.maximumGuest || 0} khách hàng
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {/* Lưu ý về giá tối thiểu */}
                            <View className="bg-yellow-500/10 rounded-lg p-3">
                              <View className="flex-row items-start">
                                <Ionicons name="information-circle" size={18} color="#EAB308" />
                                <Text className="text-yellow-500/80 text-sm ml-2 flex-1">
                                  Đây là loại bàn có giá tiêu thụ tối thiểu {tableTypes.find(t => t.tableTypeId === currentTableType.id)?.minimumPrice?.toLocaleString('vi-VN')}đ. 
                                  Quý khách vui lòng đặt thức uống đạt mức tối thiểu này.
                                </Text>
                              </View>
                            </View>
                          </View>
                        </Animated.View>
                      )}
                    </View>

                    {/* Nút tìm bàn */}
                    <TouchableOpacity
                      onPress={handleSearchTables}
                      disabled={!selectedTime || !selectedTableType || isSearching}
                      className={`py-4 rounded-xl ${
                        !selectedTime || !selectedTableType || isSearching
                          ? 'bg-white/10' 
                          : 'bg-yellow-500'
                      }`}
                    >
                      {isSearching ? (
                        <ActivityIndicator color="#EAB308" />
                      ) : (
                        <Text className={`text-center font-medium ${
                          !selectedTime || !selectedTableType
                            ? 'text-white/60' 
                            : 'text-black'
                        }`}>
                          Tìm bàn trống
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Hiển thị bàn sau khi t��m kiếm */}
                    {hasSearched && !isSearching && availableTables.length > 0 && (
                      <Animated.View entering={FadeIn}>
                        <View className="bg-neutral-900 rounded-2xl">
                          <Text className="text-white text-base font-bold mb-3">Chọn bàn</Text>
                          <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
                            {availableTables.map((table) => (
                              <View key={table.id} style={{ width: '50%', padding: 4 }}>
                                <TouchableOpacity
                                  onPress={() => handleTableSelection(table)}
                                  disabled={table.status === 'booked' || loadingTables[table.id]}
                                  className={`flex-row items-center rounded-xl px-3 py-2 ${
                                    table.status === 'booked' 
                                      ? 'bg-white/5' 
                                      : selectedTables.some(t => t.id === table.id)
                                        ? 'bg-yellow-500'
                                        : 'bg-white/10'
                                  }`}
                                >
                                  {loadingTables[table.id] ? (
                                    <ActivityIndicator 
                                      size="small" 
                                      color={selectedTables.some(t => t.id === table.id) ? '#000' : '#EAB308'} 
                                    />
                                  ) : (
                                    <MaterialCommunityIcons 
                                      name="table-furniture" 
                                      size={20} 
                                      color={
                                        table.status === 'booked' 
                                          ? '#9CA3AF'
                                          : selectedTables.some(t => t.id === table.id)
                                            ? '#000'
                                            : '#fff'
                                      } 
                                    />
                                  )}
                                  <Text 
                                    className={`ml-2 font-medium flex-1 ${
                                      table.status === 'booked'
                                        ? 'text-gray-400'
                                        : selectedTables.some(t => t.id === table.id)
                                          ? 'text-black'
                                          : 'text-white'
                                    }`}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                  >
                                    {table.name}
                                  </Text>

                                  {table.status === 'booked' ? (
                                    <Text className="text-gray-400 text-xs ml-1">Đã đặt</Text>
                                  ) : selectedTables.some(t => t.id === table.id) && !loadingTables[table.id] && (
                                    <Ionicons name="checkmark-circle" size={16} color="#000" className="ml-1" />
                                  )}
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        </View>
                      </Animated.View>
                    )}
          </>
        )}
              </View>

              {/* Khối ghi chú */}
              <View 
                ref={noteInputRef}
                className="bg-neutral-900 rounded-2xl px-6 py-4"
              >
                <Text className="text-white text-base font-bold mb-3">Ghi chú</Text>
                <View className="bg-white/10 rounded-xl p-4">
                  <TextInput
                    placeholder="Nhập ghi chú cho quán (không bắt buộc)"
                    placeholderTextColor="#9CA3AF"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                    className="text-white"
                    style={{ 
                      textAlignVertical: 'top', 
                      minHeight: 72,
                      maxHeight: 120 
                    }}
                    onFocus={() => {
                      setTimeout(scrollToNoteInput, 100);
                    }}
                    blurOnSubmit={false}
                  />
                </View>
              </View>

              
            </Animated.View>
          </View>
        </ScrollView>

        {Platform.OS === 'ios' ? (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
              setShowDatePicker(false);
              setIsDatePickerVisible(false);
              setTempDate(selectedDate); // Reset tempDate khi đóng modal
            }}
          >
            <View className="flex-1 justify-end bg-black/50">
              <View className="bg-neutral-800 rounded-t-3xl">
                <View className="flex-row justify-between items-center p-4 border-b border-white/10">
                  <TouchableOpacity 
                    onPress={() => {
                      setShowDatePicker(false);
                      setIsDatePickerVisible(false);
                      setTempDate(selectedDate); // Reset tempDate khi huỷ
                    }}
                  >
                    <Text className="text-white">Huỷ</Text>
                  </TouchableOpacity>
                  <Text className="text-white font-bold">Chọn ngày</Text>
                  <TouchableOpacity onPress={handleConfirmDate}>
                    <Text className="text-yellow-500 font-bold">Xong</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  maximumDate={getMaxBookingDate()}
                  onChange={handleDateChange}
                  textColor="white"
                  locale="vi"
                  style={{ backgroundColor: '#262626' }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          // Android giữ nguyên
          showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              maximumDate={getMaxBookingDate()}
              onChange={handleDateChange}
            />
          )
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
                {availableSlots.length > 0 ? (
                  availableSlots.map((time) => (
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
        {selectedTables.length > 0 && !keyboardVisible && (
          <Animated.View 
            entering={FadeIn}
            className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-neutral-900/95"
          >
            <SafeAreaView edges={['bottom']}>
              <View className="px-4 pt-4 space-y-4">
                {/* Thông tin bàn đã chọn */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons name="table-furniture" size={20} color="#EAB308" />
                    <Text className="text-white font-medium ml-2">
                      {new Set(selectedTables.map(table => table.id)).size} {new Set(selectedTables.map(table => table.id)).size === 1 ? 'bàn' : 'bàn'} đã chọn
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setShowSelectedTablesModal(true)}
                    className="flex-row items-center"
                  >
                    <Text className="text-yellow-500 mr-1">Chi tiết</Text>
                    <Ionicons name="chevron-forward" size={16} color="#EAB308" />
                  </TouchableOpacity>
                </View>

                {/* Buttons */}
                <View className="flex-row space-x-3 pb-4">
                <TouchableOpacity
                    onPress={handleBookNow}
                    className="flex-1 bg-yellow-500 py-4 rounded-xl"
                  >
                    <Text className="text-black text-center font-bold">
                      Đặt bàn ngay
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleBookWithDrinks}
                    className="flex-1 bg-white/10 py-4 rounded-xl"
                  >
                    <Text className="text-white text-center font-bold">
                      Đặt kèm đồ uống
                    </Text>
                    {barDetail && typeof barDetail.discount === 'number' && barDetail.discount > 0 && (
                      <View className="absolute -top-2 -right-2 bg-yellow-500 px-2 py-0.5 rounded-full">
                        <Text className="text-black text-[10px] font-bold">
                          Ưu đãi đặt trước -{barDetail.discount}%
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  
                </View>
              </View>
            </SafeAreaView>
          </Animated.View>
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
              {/* Header */}
              <View className="px-6 pt-6 pb-4">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-white text-xl font-bold mb-1">
                      Bàn đã chọn
                    </Text>
                    <Text className="text-white/60">
                      {new Set(selectedTables.map(table => table.id)).size} {new Set(selectedTables.map(table => table.id)).size === 1 ? 'bàn' : 'bàn'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setShowSelectedTablesModal(false)}
                    className="h-8 w-8 bg-white/10 rounded-full items-center justify-center"
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Divider */}
              <View className="h-[1px] bg-white/10" />

              {/* Danh sách bàn */}
              <ScrollView 
                className="max-h-[70vh]"
                showsVerticalScrollIndicator={false}
              >
                <View className="p-6 space-y-4">
                  {Array.from(new Set(selectedTables.map(table => table.id))).map(tableId => {
                    const table = selectedTables.find(t => t.id === tableId);
                    if (!table) return null;
                    
                    return (
                      <View 
                        key={table.id}
                        className="bg-white/5 rounded-2xl overflow-hidden"
                      >
                        {/* Header của card */}
                        <View className="bg-white/5 px-4 py-3 flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <MaterialCommunityIcons 
                              name="table-furniture" 
                              size={20} 
                              color="#EAB308"
                            />
                            <Text className="text-white font-medium ml-2">
                              Bàn {table.name}
                            </Text>
                          </View>
                          <TouchableOpacity 
                            onPress={() => handleRemoveTable(table.id)}
                            className="h-8 w-8 bg-white/10 rounded-full items-center justify-center"
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>

                        {/* Nội dung card */}
                        <View className="p-4 space-y-3">
                          {/* Loại bàn */}
                          <View className="flex-row items-center">
                            <View className="w-6">
                              <MaterialCommunityIcons 
                                name="format-list-bulleted-type" 
                                size={16} 
                                color="#9CA3AF"
                              />
                            </View>
                            <Text className="text-white/60 ml-2">
                              Loại bàn: <Text className="text-white">{table.typeName}</Text>
                            </Text>
                          </View>

                          {/* Thời gian giữ bàn */}
                          <View className="flex-row items-center">
                            <View className="w-6">
                              <Ionicons 
                                name="time-outline" 
                                size={16} 
                                color="#9CA3AF"
                              />
                            </View>
                            <Text className="text-white/60 ml-2">
                              Thời gian giữ bàn: <Text className="text-white">5 phút</Text>
                            </Text>
                          </View>

                          {/* Trạng thái */}
                          <View className="flex-row items-center">
                            <View className="w-6">
                              <Ionicons 
                                name="information-circle-outline" 
                                size={16} 
                                color="#9CA3AF"
                              />
                            </View>
                            <Text className="text-white/60 ml-2">
                              Trạng thái: <Text className="text-emerald-500">Đang giữ</Text>
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Footer */}
              <View className="p-6 border-t border-white/10">
                <TouchableOpacity 
                  onPress={() => setShowSelectedTablesModal(false)}
                  className="bg-yellow-500 rounded-xl py-4"
                >
                  <Text className="text-black text-center font-bold">
                    Xong
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
          <View className="flex-1 justify-center items-center bg-black/50 px-4">
            <View className="bg-neutral-900 rounded-xl w-full max-w-md max-h-[85%]">
              {/* Header */}
              <View className="border-b border-white/10 p-4">
                <Text className="text-white text-xl font-bold text-center">
                  Xác nhận đặt bàn
                </Text>
              </View>

              {/* Wrap content trong ScrollView */}
              <ScrollView className="max-h-full">
                <View className="p-6">
                  {/* Thông tin quán */}
                  <View className="mb-6">
                    <Text className="text-yellow-500 font-bold mb-1">Thông tin quán</Text>
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
                      <Ionicons name="people-outline" size={20} color="#ffffff" />
                      <Text className="text-white ml-2">
                        {numOfPeople} khách hàng
                      </Text>
                    </View>
                  </View>

                  {/* Danh sách bàn - Tách thành khối riêng */}
                  <View className="bg-white/5 rounded-xl p-4 mb-4">
                    <Text className="text-white/80 font-medium mb-3">Bàn đã chọn</Text>
                    <View className="space-y-3">
                      {Array.from(new Set(selectedTables.map(table => table.id))).map((tableId, index) => {
                        const table = selectedTables.find(t => t.id === tableId);
                        if (!table) return null;
                        
                        return (
                          <View key={table.id} className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                              <MaterialCommunityIcons name="table-chair" size={20} color="#ffffff" />
                              <View className="ml-3">
                                <Text className="text-white font-medium">Bàn {table.name}</Text>
                                <Text className="text-white/60 text-sm">{table.typeName}</Text>
                              </View>
                            </View>
                            {index < Array.from(new Set(selectedTables.map(t => t.id))).length - 1 && (
                              <View className="h-[1px] bg-white/10 my-2" />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {note && (
                    <View className="bg-white/5 rounded-xl p-4 mb-4">
                      <View className="flex-row items-start">
                        <Ionicons name="document-text-outline" size={20} color="#ffffff" />
                        <Text className="text-white/80 ml-2 flex-1">
                          Ghi chú: {note}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Điều khoản */}
                  <View className="mb-6">
                    <Text className="text-white/60 text-sm text-center">
                      Bằng cách nhấn "Xác nhận", bạn đã đồng ý với{' '}
                      <Text 
                        className="text-yellow-500 underline"
                        onPress={() => {
                          setShowConfirmModal(false);
                          router.push('/terms-and-policies');
                        }}
                      >
                        Điều khoản dịch vụ
                      </Text>
                      {' '}và{' '}
                      <Text 
                        className="text-yellow-500 underline"
                        onPress={() => {
                          setShowConfirmModal(false);
                          router.push('/privacy-policy');
                        }}
                      >
                        Chính sách bảo mật
                      </Text>
                      {' '}của chúng tôi.
                    </Text>
                  </View>
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
                    Hiện tại khng có bàn nào thuộc loại {currentTableType?.name} có sẵn
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

        {/* Modal thông báo ã chn tối đa bàn */}
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

        {/* Render modals */}
        {renderModals()}
      </SafeAreaView>

      {/* Thêm LoadingPopup vào đây */}
      <LoadingPopup 
        visible={showProcessingModal}
        status={bookingStatus}
        errorMessage={bookingError}
        successMessage={bookingSuccess}
      />

      {/* Modal chọn số lượng khách hàng */}
      <Modal
        visible={showPeoplePickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPeoplePickerModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-neutral-800 rounded-t-3xl">
            {/* Header */}
            <View className="flex-row justify-between items-center p-4 border-b border-white/10">
              <TouchableOpacity onPress={() => setShowPeoplePickerModal(false)}>
                <Text className="text-white">Hủy</Text>
              </TouchableOpacity>
              <Text className="text-white font-bold">Chọn số lượng khách hàng</Text>
              <TouchableOpacity onPress={() => setShowPeoplePickerModal(false)}>
                <Text className="text-yellow-500 font-bold">Xong</Text>
              </TouchableOpacity>
            </View>

            {/* Nội dung */}
            <ScrollView 
              className="max-h-96"
              showsVerticalScrollIndicator={false}
            >
              <View className="p-4">
                {generatePeopleOptions().map((number) => (
                  <TouchableOpacity
                    key={number}
                    onPress={() => {
                      setNumOfPeople(number);
                      setShowPeoplePickerModal(false);
                    }}
                    className={`p-4 rounded-xl mb-2 ${
                      numOfPeople === number ? 'bg-yellow-500' : 'bg-white/10'
                    }`}
                  >
                    <Text 
                      className={`text-center ${
                        numOfPeople === number ? 'text-black font-medium' : 'text-white'
                      }`}
                    >
                      {number} khách hàng
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
