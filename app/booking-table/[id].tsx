import { View, Text, ScrollView, TouchableOpacity, Platform, Modal, TextInput, Image, ActivityIndicator, Alert, Linking, Keyboard, Dimensions, ViewProps, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addDays, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BarDetail, barService } from '@/services/bar';
import { TableType, tableTypeService } from '@/services/table-type';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Account, accountService } from '@/services/account';
import { useAuth } from '@/contexts/AuthContext';
import { BookingTableFilter, BookingTableRequest, bookingTableService, HoldTableRequest, GetHoldTableParams, HoldTableInfo } from '@/services/booking-table';
import { useFocusEffect } from '@react-navigation/native';
import { bookingSignalRService, TableHoldEvent } from '@/services/booking-signalr';
import { AppState, AppStateStatus } from 'react-native';
import { TableDetail, tableService } from '@/services/table';

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

// Thêm LoadingPopup component với đầy đủ trạng thái
const LoadingPopup = ({ 
  visible, 
  status, 
  errorMessage,
  onClose
}: { 
  visible: boolean;
  status: 'processing' | 'success' | 'error';
  errorMessage?: string;
  onClose: () => void;
}) => {
  // Thêm useEffect để handle auto close
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      const timer = setTimeout(() => {
        onClose();
      }, 2000); // Tự động đóng sau 2 giây

      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  return (
    <Modal 
      transparent 
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={status !== 'processing' ? onClose : undefined}
        className="flex-1 bg-black/50 items-center justify-center"
      >
        <Animated.View 
          entering={FadeIn.duration(200)}
          className="bg-neutral-900 rounded-2xl p-6 items-center mx-4 w-[85%] max-w-[240px]"
        >
          {status === 'processing' && (
            <Animated.View entering={FadeIn.duration(200)} className="items-center">
              <ActivityIndicator size="large" color="#EAB308" className="mb-4" />
              <Text className="text-white text-center font-medium">
                Đang xử lý đặt bàn...
              </Text>
              <Text className="text-white/60 text-center text-sm mt-2">
                Vui lòng không tắt ứng dụng
              </Text>
            </Animated.View>
          )}

          {status === 'success' && (
            <Animated.View entering={FadeIn.duration(200)} className="items-center">
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" className="mb-4" />
              <Text className="text-white text-center font-medium mb-2">
                Đặt bàn thành công
              </Text>
              <Text className="text-white/60 text-center text-sm">
                Nhân viên của quán có thể sẽ liên hệ với bạn trong tương lai
              </Text>
            </Animated.View>
          )}

          {status === 'error' && (
            <Animated.View entering={FadeIn.duration(200)} className="items-center">
              <Ionicons name="alert-circle" size={48} color="#EF4444" className="mb-4" />
              <Text className="text-white text-center font-medium mb-2">
                Đặt bàn thất bại
              </Text>
              <Text className="text-white/60 text-center text-sm">
                {errorMessage}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

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
  const [bookingStatus, setBookingStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [bookingError, setBookingError] = useState<string>('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(selectedDate);
  const [showUpdateProfileModal, setShowUpdateProfileModal] = useState(false);
  const [isUserValidated, setIsUserValidated] = useState(false);

  // Thay thế các state quản lý modal riêng lẻ bằng một state duy nhất
  const [currentModal, setCurrentModal] = useState<ModalState>(ModalState.NONE);

  // Thêm state để theo dõi việc redirect từ profile-detail
  const [isRedirectFromProfile, setIsRedirectFromProfile] = useState(false);

  // Thêm state để theo dõi việc c����n refresh account info
  const [needRefreshAccount, setNeedRefreshAccount] = useState(false);

  // Thêm state để theo dõi trạng thái loading của từng bàn
  const [loadingTables, setLoadingTables] = useState<{ [key: string]: boolean }>({});

  // Thêm state để lưu danh sách bàn đã giữ
  const [heldTables, setHeldTables] = useState<HoldTableInfo[]>([]);

  // Thêm ref để lưu giá trị trước đó của selectedTime
  const prevSelectedTime = useRef(selectedTime);

  // Thêm state để theo dõi trạng thái loading của từng nút xóa
  const [removingTables, setRemovingTables] = useState<{ [key: string]: boolean }>({});

  // Thêm state mới
  const [selectedTableDetails, setSelectedTableDetails] = useState<TableDetail[]>([]);
  const [isLoadingTableDetails, setIsLoadingTableDetails] = useState(false);

  // Thêm state mới
  const [numOfPeople, setNumOfPeople] = useState<number>(1);

  // Thêm state để quản lý modal chọn số khách hàng
  const [showPeoplePickerModal, setShowPeoplePickerModal] = useState(false);

  // Thêm hàm tạo danh sách số khách hàng từ 1-100
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
      // Tạo date objects cho thời gian bắt đầu và kết thúc
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

  const handleTimeChange = async (time: string) => {
    if (time !== selectedTime) {
      await releaseAllTables();
      setSelectedTime(time);
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

  // Sửa lại hàm releaseAllTables để thêm log và xử lý lỗi tốt hơn
  const releaseAllTables = async () => {
    if (selectedTables.length === 0) return;

    console.log('Releasing tables:', selectedTables.map(t => t.id));
    try {
      // Gọi API release cho tất cả các bàn đã chọn
      await Promise.all(selectedTables.map(table => {
        const request: HoldTableRequest = {
          tableId: table.id,
          time: selectedTime.replace(' (+1 ngày)', '') + ':00',
          barId: id as string,
          date: selectedTime.includes('(+1 ngày)') 
            ? format(addDays(selectedDate, 1), 'yyyy-MM-dd')
            : format(selectedDate, 'yyyy-MM-dd')
        };
        console.log('Releasing table with request:', request);
        return bookingTableService.releaseTable(request);
      }));

      console.log('Successfully released all tables');
      // Reset các state
      setSelectedTables([]);
      setAvailableTables(prev => prev.map(table => ({
        ...table,
        status: selectedTables.some(st => st.id === table.id) ? 'available' : table.status
      })));
    } catch (error) {
      console.error('Error releasing all tables:', error);
    }
  };

  // Sửa lại hàm handleDateChange cho Android
  const handleDateChange = useCallback(async (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setIsDatePickerVisible(false);
      
      if (!date || event.type === 'dismissed') {
        return;
      }

      console.log('Date changed, releasing all tables...');
      await releaseAllTables();
      setSelectedDate(date);
      setSelectedTables([]);
      setAvailableTables([]);
      setHasSearched(false);
    } else {
      if (date) {
        setTempDate(date);
      }
    }
  }, [selectedTables, selectedTime, id]); // Thêm dependencies

  // Sửa lại hàm handleConfirmDate cho iOS
  const handleConfirmDate = async () => {
    console.log('Confirming date change, releasing all tables...');
    await releaseAllTables();
    setSelectedDate(tempDate);
    setSelectedTables([]);
    setAvailableTables([]);
    setHasSearched(false);
    setShowDatePicker(false);
    setIsDatePickerVisible(false);
  };

  // Sửa lại hàm fetchHoldTables
  const fetchHoldTables = async () => {
    try {
      const params: GetHoldTableParams = {
        barId: id as string,
        date: selectedTime.includes('(+1 ngày)') 
          ? format(addDays(selectedDate, 1), 'yyyy-MM-dd')
          : format(selectedDate, 'yyyy-MM-dd'),
        timeSpan: selectedTime.replace(' (+1 ngày)', '') + ':00'
      };

      const holdTables = await bookingTableService.getHoldTable(params);
      setHeldTables(holdTables);

    } catch (error) {
      console.error('Error fetching hold tables:', error);
      setHeldTables([]);
    }
  };

  // Sửa lại hàm handleSearchTables để xử lý bàn đã giữ
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
          // Nếu bàn đ��ợc giữ bởi khách hàng khác hoặc đã được đặt -> booked
          status: (heldTable && heldTable.accountId !== user?.accountId) || table.status !== 1 
            ? 'booked' as const 
            : 'available' as const,
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
      // Chỉ reset state khi thay đổi thời gian
      if (selectedTime !== prevSelectedTime.current) {
        setSelectedTables([]);
        setAvailableTables([]);
        setHeldTables([]);
        setHasSearched(false);
      }
      prevSelectedTime.current = selectedTime;
    }
  }, [selectedTime, selectedTableType]);

  // Thêm state để lưu cache thông tin bàn
  const [tableDetailsCache, setTableDetailsCache] = useState<{ [key: string]: TableDetail }>({});

  // Sửa lại hàm handleTableSelection
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
        // Xóa cache khi release bàn
        setTableDetailsCache(prev => {
          const newCache = { ...prev };
          delete newCache[table.id];
          return newCache;
        });
      } else {
        // Check max tables
        if (selectedTables.length >= MAX_TABLES) {
          setShowMaxTablesModal(true);
          return;
        }

        // Hold table và fetch thông tin chi tiết
        await Promise.all([
          bookingTableService.holdTable(request),
          (async () => {
            // Chỉ fetch nếu chưa có trong cache
            if (!tableDetailsCache[table.id]) {
              const details = await tableService.getTableDetails([table.id]);
              if (details.length > 0) {
                setTableDetailsCache(prev => ({
                  ...prev,
                  [table.id]: details[0]
                }));
              }
            }
          })()
        ]);

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

  // Sửa lại hàm handleRemoveTable
  const handleRemoveTable = async (tableId: string) => {
    if (removingTables[tableId]) return;

    setRemovingTables(prev => ({
      ...prev,
      [tableId]: true
    }));

    try {
      const request: HoldTableRequest = {
        tableId: tableId,
        time: selectedTime.replace(' (+1 ngày)', '') + ':00',
        barId: id as string,
        date: selectedTime.includes('(+1 ngày)') 
          ? format(addDays(selectedDate, 1), 'yyyy-MM-dd')
          : format(selectedDate, 'yyyy-MM-dd')
      };

      await bookingTableService.releaseTable(request);
      
      // Cập nhật UI và xóa cache
      setSelectedTables(prev => {
        const newSelectedTables = prev.filter(t => t.id !== tableId);
        if (newSelectedTables.length === 0) {
          setShowSelectedTablesModal(false);
        }
        return newSelectedTables;
      });

      setTableDetailsCache(prev => {
        const newCache = { ...prev };
        delete newCache[tableId];
        return newCache;
      });

      setAvailableTables(prev => prev.map(table => {
        if (table.id === tableId) {
          return {
            ...table,
            status: 'available'
          };
        }
        return table;
      }));

    } catch (error) {
      console.error('Error releasing table:', error);
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Không thể hủy giữ bàn. Vui lòng thử lại.'
      );
    } finally {
      setRemovingTables(prev => ({
        ...prev,
        [tableId]: false
      }));
    }
  };

  const handleTableTypeSelect = (typeId: string) => {
    setSelectedTableType(typeId);
    const selectedType = tableTypes.find(t => t.tableTypeId === typeId);
    setCurrentTableType(selectedType ? { 
      id: selectedType.tableTypeId, 
      name: selectedType.typeName 
    } : null);
    setShowTypeDescription(true);
    // Không reset các state khác
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

  const handleBookingNow = async () => {
    setShowConfirmModal(true);
  };

  const handleBookingWithDrinks = () => {
    if (!selectedTables.length) {
      Alert.alert('Thông báo', 'Vui lòng chọn bàn trước khi đặt kèm nước uống');
      return;
    }

    const bookingDate = selectedTime.includes('(+1 ngày)') 
      ? format(addDays(selectedDate, 1), 'yyyy-MM-dd')
      : format(selectedDate, 'yyyy-MM-dd');

    const selectedTablesInfo: SelectedTableInfo[] = selectedTables.map(table => ({
      id: table.id,
      name: table.name,
      typeId: table.typeId,
      typeName: tableTypes.find(t => t.tableTypeId === table.typeId)?.typeName || ''
    }));

    router.push({
      pathname: "/booking-drink/[id]",
      params: {
        id: id as string,
        tableIds: JSON.stringify(selectedTables.map(table => table.id)),
        selectedTables: JSON.stringify(selectedTablesInfo),
        bookingDate: bookingDate,
        bookingTime: selectedTime.replace(' (+1 ngày)', '') + ':00',
        note: note,
        discount: barDetail?.discount || 0,
        numOfPeople: numOfPeople // Thêm số người vào params
      }
    });
  };

  const handleConfirmBooking = async () => {
    if (isBooking) return;
    setIsBooking(true);
    setShowConfirmModal(false);
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
        tableIds: selectedTables.map(table => table.id),
        numOfPeople: numOfPeople // Thêm số khách hàng
      };

      await bookingTableService.bookTable(
        bookingRequest,
        // Thêm callback để tắt animation khi nhấn Đóng
        () => {
          setIsBooking(false);
          setShowProcessingModal(false);
          setBookingStatus('processing');
        }
      );
      
      setBookingStatus('success');
      
      setTimeout(() => {
        setShowProcessingModal(false);
        router.replace({
          pathname: '/(tabs)/booking-history',
          params: { 
            reload: 'true',
            fromBooking: 'true'
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
            onClose={() => setShowProcessingModal(false)}
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
        // Đợi một chút để bàn phím hi���n lên hoàn toàn
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

  // Thêm useEffect để xử lý SignalR connection
  useEffect(() => {
    let appStateSubscription: any;
    let isSubscribed = true;

    const initializeSignalR = async () => {
      if (!isSubscribed) return;
      console.log('Initializing SignalR connection...');
      await bookingSignalRService.initialize();
    };

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('App state changed to:', nextAppState);
      if (nextAppState === 'active') {
        console.log('App became active, reconnecting SignalR...');
        await initializeSignalR();
      } else if (nextAppState === 'background') {
        console.log('App went to background, stopping SignalR...');
        await bookingSignalRService.stop();
      }
    };

    // Khởi tạo SignalR khi component mount
    initializeSignalR();

    // Đăng ký lắng nghe sự kiện thay đổi trạng thái app
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup khi component unmount
    return () => {
      console.log('Component unmounting, cleaning up SignalR...');
      isSubscribed = false;
      appStateSubscription.remove();
      bookingSignalRService.stop();
    };
  }, []); // Empty dependency array vì chúng ta chỉ muốn effect này chạy một lần khi mount

  // Thêm useFocusEffect để xử lý khi screen được focus/unfocus
  useFocusEffect(
    useCallback(() => {
      let isSubscribed = true;

      const handleScreenFocus = async () => {
        if (!isSubscribed) return;
        console.log('Screen focused, initializing SignalR...');
        await bookingSignalRService.initialize();
      };

      // Khởi tạo SignalR khi screen được focus
      handleScreenFocus();

      return () => {
        isSubscribed = false;
        console.log('Screen unfocused, stopping SignalR...');
        bookingSignalRService.stop();
      };
    }, [])
  );

  // Thêm useEffect để xử lý các events từ SignalR
  useEffect(() => {
    if (!id || !selectedTime || !selectedTableType || !user?.accountId) return;

    const getCurrentBookingDate = () => {
      const date = selectedTime.includes('(+1 ngày)') 
        ? format(addDays(selectedDate, 1), 'yyyy-MM-dd')
        : format(selectedDate, 'yyyy-MM-dd');
      return date + 'T00:00:00+07:00';
    };

    const getCurrentBookingTime = () => {
      return selectedTime.replace(' (+1 ngày)', '') + ':00';
    };

    // Xử lý khi có bàn được giữ bởi khách hàng khác
    const unsubscribeTableHold = bookingSignalRService.onTableHold((event: TableHoldEvent) => {
      console.log('Current user:', user.accountId);
      console.log('Event user:', event.accountId);
      console.log('Current date:', getCurrentBookingDate());
      console.log('Current time:', getCurrentBookingTime());
      console.log('Event date:', event.date);
      console.log('Event time:', event.time);

      // Chỉ xử lý nếu event từ khách hàng khác và liên quan đến thời gian hiện tại
      if (
        event.accountId !== user.accountId && // Thêm điều kiện này
        event.date === getCurrentBookingDate() &&
        event.time === getCurrentBookingTime()
      ) {
        console.log('Updating table status for hold:', event.tableId);
        setAvailableTables(prev => prev.map(table => {
          if (table.id === event.tableId) {
            console.log('Found table to update:', table.name);
            return {
              ...table,
              status: 'booked'
            };
          }
          return table;
        }));

        // Nếu bàn đang được chọn, xóa khỏi selectedTables
        setSelectedTables(prev => {
          const newSelected = prev.filter(table => table.id !== event.tableId);
          if (prev.length !== newSelected.length) {
            console.log('Removed table from selection:', event.tableId);
          }
          return newSelected;
        });
      }
    });

    // Xử lý khi có bàn được release bởi khách hàng khác
    const unsubscribeTableRelease = bookingSignalRService.onTableRelease((event: TableHoldEvent) => {
      // Chỉ xử lý nếu event từ khách hàng khác và liên quan đến thời gian hiện tại
      if (
        event.accountId !== user.accountId && // Thêm điều kiện này
        event.date === getCurrentBookingDate() &&
        event.time === getCurrentBookingTime()
      ) {
        console.log('Updating table status for release:', event.tableId);
        setAvailableTables(prev => prev.map(table => {
          if (table.id === event.tableId) {
            console.log('Found table to update:', table.name);
            return {
              ...table,
              status: 'available'
            };
          }
          return table;
        }));
      }
    });

    // Cleanup khi unmount hoặc khi thay đổi params
    return () => {
      unsubscribeTableHold();
      unsubscribeTableRelease();
    };
  }, [id, selectedTime, selectedTableType, selectedDate, user?.accountId]); // Thêm user?.accountId vào dependencies

  // Sửa lại useFocusEffect để xử lý cleanup tốt hơn
  useFocusEffect(
    useCallback(() => {
      let isSubscribed = true;

      return () => {
        isSubscribed = false;
        console.log('Screen losing focus, releasing all tables...');
        releaseAllTables().then(() => {
          if (isSubscribed) {
            setSelectedTables([]);
            setAvailableTables([]);
            setHasSearched(false);
          }
        });
      };
    }, [])
  );

  // Sửa lại useEffect để xử lý thay đổi thời gian
  useEffect(() => {
    if (selectedTime) {
      if (selectedTime !== prevSelectedTime.current) {
        console.log('Time changed, releasing all tables...');
        releaseAllTables().then(() => {
          setSelectedTables([]);
          setAvailableTables([]);
          setHeldTables([]);
          setHasSearched(false);
        });
      }
      prevSelectedTime.current = selectedTime;
    }
  }, [selectedTime, selectedDate]);

  // Thêm hàm xử lý khi nhấn back
  const handleBack = async () => {
    console.log('Back button pressed, releasing all tables...');
    try {
      await releaseAllTables();
    } finally {
      router.back();
    }
  };

  // Sửa lại phần xử lý back navigation
  useEffect(() => {
    const handleBeforeUnload = async () => {
      console.log('Before unload, releasing all tables...');
      await releaseAllTables();
    };

    // Sửa lại cách xử lý hardware back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('Hardware back pressed, releasing all tables...');
      // Gọi releaseAllTables và navigate back mà không đợi
      releaseAllTables().finally(() => {
        router.back();
      });
      // Return true để chặn default back behavior
      return true;
    });

    return () => {
      handleBeforeUnload();
      backHandler.remove();
    };
  }, []);

  // Thêm useEffect để load thông tin chi tiết khi mở modal
  useEffect(() => {
    const loadTableDetails = async () => {
      if (showSelectedTablesModal && selectedTables.length > 0) {
        setIsLoadingTableDetails(true);
        try {
          // Lọc ra các bàn chưa có trong cache
          const uncachedTableIds = selectedTables
            .filter(table => !tableDetailsCache[table.id])
            .map(table => table.id);

          if (uncachedTableIds.length > 0) {
            const details = await tableService.getTableDetails(uncachedTableIds);
            // Cập nhật cache với thông tin mới
            const newCache = { ...tableDetailsCache };
            details.forEach(detail => {
              newCache[detail.tableId] = detail;
            });
            setTableDetailsCache(newCache);
          }

          // Lấy thông tin chi tiết từ cache
          const allDetails = selectedTables.map(table => tableDetailsCache[table.id]).filter(Boolean);
          setSelectedTableDetails(allDetails);
        } catch (error) {
          console.error('Error loading table details:', error);
        } finally {
          setIsLoadingTableDetails(false);
        }
      }
    };

    loadTableDetails();
  }, [showSelectedTablesModal, selectedTables, tableDetailsCache]);

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
                  <Text className="text-white/60">Không thể tải thông tin khách hàng dùng</Text>
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

                    {/* Thêm phần chọn số khách hàng */}
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

                      {/* Gợi ý về số khách hàng */}
                      {selectedTables.length > 0 && (
                        <View className="mt-2 bg-yellow-500/10 rounded-lg p-3">
                          <View className="flex-row items-start">
                            <Ionicons name="information-circle" size={18} color="#EAB308" />
                            <Text className="text-yellow-500/80 text-sm ml-2 flex-1">
                              {selectedTables.length === 1 
                                ? `Bàn đã chọn phù hợp cho ${
                                    tableDetailsCache[selectedTables[0].id]?.minimumGuest || 0
                                  } - ${
                                    tableDetailsCache[selectedTables[0].id]?.maximumGuest || 0
                                  } khách hàng`
                                : `Các bàn đã chọn có thể phục vụ tối đa ${
                                    selectedTables.reduce((sum, table) => 
                                      sum + (tableDetailsCache[table.id]?.maximumGuest || 0)
                                    , 0)
                                  } khách hàng`
                              }
                            </Text>
                          </View>
                        </View>
                      )}
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

                          {/* Content */}
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

                    {/* Nt tìm bàn */}
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

                    {/* Hiển thị bàn sau khi tìm kiếm */}
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

        {/* Thêm Modal chọn số khách hàng */}
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

              {/* Content */}
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
                      {selectedTables.length} {selectedTables.length === 1 ? 'bàn' : 'bàn'} đã chọn
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

                {/* Nút đặt bàn */}
                <View className={`flex-row space-x-4 ${Platform.OS !== 'ios' ? 'mb-4' : ''}`}>
                  <TouchableOpacity 
                    onPress={() => handleBookingNow()}
                    className="flex-1 bg-yellow-500 py-3.5 rounded-2xl"
                  >
                    <Text className="text-black text-center font-bold">
                      Đặt bàn ngay
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => handleBookingWithDrinks()}
                    className="flex-1 bg-white/10 py-3.5 rounded-2xl relative"
                  >
                    <Text className="text-white text-center font-bold">
                      Đặt kèm thức uống
                    </Text>
                    {barDetail && typeof barDetail.discount === 'number' && barDetail.discount > 0 && (
                      <View className="absolute -top-2 -right-2 bg-yellow-500 px-2 py-0.5 rounded-full">
                        <Text className="text-black text-[10px] font-bold">
                          -{barDetail.discount}%
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
            <Animated.View 
              entering={FadeIn}
              className="bg-neutral-900 rounded-t-3xl"
            >
              {/* Header */}
              <View className="px-6 pt-6 pb-4 border-b border-white/10">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-white text-xl font-bold">
                      Bàn đã chọn
                    </Text>
                    <Text className="text-white/60 text-sm mt-1">
                      {selectedTables.length} {selectedTables.length === 1 ? 'bàn' : 'bàn'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setShowSelectedTablesModal(false)}
                    className="h-10 w-10 bg-white/10 rounded-full items-center justify-center"
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Content */}
              <ScrollView 
                className="px-6 py-4"
                style={{ maxHeight: Dimensions.get('window').height * 0.6 }}
                showsVerticalScrollIndicator={false}
              >
                {isLoadingTableDetails ? (
                  <View className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <View key={i} className="bg-white/10 rounded-xl overflow-hidden">
                        {/* Header skeleton */}
                        <View className="bg-white/10 px-4 py-3 flex-row items-center justify-between">
                          <View className="flex-row items-center space-x-2">
                            <View className="w-5 h-5 rounded-full bg-white/10 animate-pulse" />
                            <View className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                          </View>
                          <View className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                        </View>

                        {/* Content skeleton */}
                        <View className="p-4 space-y-3">
                          {/* Type info skeleton */}
                          <View className="flex-row items-center">
                            <View className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                            <View className="ml-3 flex-1">
                              <View className="h-3 w-16 bg-white/10 rounded animate-pulse mb-1" />
                              <View className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                            </View>
                          </View>

                          {/* Guest info skeleton */}
                          <View className="flex-row items-center">
                            <View className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                            <View className="ml-3 flex-1">
                              <View className="h-3 w-16 bg-white/10 rounded animate-pulse mb-1" />
                              <View className="h-4 w-28 bg-white/10 rounded animate-pulse" />
                            </View>
                          </View>

                          {/* Price info skeleton */}
                          <View className="flex-row items-center">
                            <View className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                            <View className="ml-3 flex-1">
                              <View className="h-3 w-16 bg-white/10 rounded animate-pulse mb-1" />
                              <View className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                            </View>
                          </View>
                        </View>

                        {/* Note skeleton */}
                        <View className="bg-yellow-500/10 p-3 mx-4 mb-4 rounded-lg">
                          <View className="flex-row items-start space-x-2">
                            <View className="w-[18px] h-[18px] rounded-full bg-white/10 animate-pulse" />
                            <View className="h-8 flex-1 bg-white/10 rounded animate-pulse" />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="space-y-4 pb-10">
                    {selectedTableDetails.map((table) => (
                      <Animated.View
                        key={table.tableId}
                        entering={FadeIn}
                        className="bg-white/10 rounded-xl overflow-hidden"
                      >
                        {/* Table header */}
                        <View className="bg-white/10 px-4 py-3 flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <MaterialCommunityIcons name="table-furniture" size={20} color="#EAB308" />
                            <Text className="text-white font-medium ml-2">
                              {table.tableName}
                            </Text>
                          </View>
                          <TouchableOpacity 
                            onPress={() => handleRemoveTable(table.tableId)}
                            disabled={removingTables[table.tableId]}
                            className="h-8 w-8 bg-white/10 rounded-full items-center justify-center"
                          >
                            {removingTables[table.tableId] ? (
                              <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            )}
                          </TouchableOpacity>
                        </View>

                        {/* Table details */}
                        <View className="p-4 space-y-3">
                          {/* Type info */}
                          <View className="flex-row items-center">
                            <View className="w-8 h-8 bg-white/10 rounded-full items-center justify-center">
                              <MaterialCommunityIcons name="format-list-text" size={16} color="#9CA3AF" />
                            </View>
                            <View className="ml-3">
                              <Text className="text-white/60 text-xs">Loại bàn</Text>
                              <Text className="text-white">{table.tableTypeName}</Text>
                            </View>
                          </View>

                          {/* Guest info */}
                          <View className="flex-row items-center">
                            <View className="w-8 h-8 bg-white/10 rounded-full items-center justify-center">
                              <Ionicons name="people-outline" size={16} color="#9CA3AF" />
                            </View>
                            <View className="ml-3">
                              <Text className="text-white/60 text-xs">Số khách</Text>
                              <Text className="text-white">
                                {table.minimumGuest} - {table.maximumGuest} khách hàng
                              </Text>
                            </View>
                          </View>

                          {/* Price info */}
                          <View className="flex-row items-center">
                            <View className="w-8 h-8 bg-white/10 rounded-full items-center justify-center">
                              <Ionicons name="wallet-outline" size={16} color="#9CA3AF" />
                            </View>
                            <View className="ml-3">
                              <Text className="text-white/60 text-xs">Giá tối thiểu</Text>
                              <Text className="text-white">
                                {table.minimumPrice.toLocaleString('vi-VN')}đ
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Total minimum price note */}
                        <View className="bg-yellow-500/10 p-3 mx-4 mb-4 rounded-lg">
                          <View className="flex-row items-start">
                            <Ionicons name="information-circle" size={18} color="#EAB308" />
                            <Text className="text-yellow-500/80 text-xs ml-2 flex-1">
                              Bạn cần đặt thức uống tối thiểu {table.minimumPrice.toLocaleString('vi-VN')}đ cho bàn này
                            </Text>
                          </View>
                        </View>
                      </Animated.View>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Footer */}
              <View className="px-6 py-4 border-t border-white/10">
                <TouchableOpacity 
                  onPress={() => setShowSelectedTablesModal(false)}
                  className="bg-yellow-500 rounded-xl py-4"
                >
                  <Text className="text-black text-center font-bold">
                    Xong
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
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

                    <View className="flex-row items-center">
                      <MaterialCommunityIcons name="table-chair" size={20} color="#ffffff" />
                      <Text className="text-white ml-2">
                        {selectedTables.length} bàn đã chọn
                      </Text>
                    </View>
                  </View>

                  {/* Danh sách bàn - Tách thành khối riêng */}
                  <View className="bg-white/5 rounded-xl p-4 mb-4">
                    <Text className="text-white/80 font-medium mb-3">Bàn đã chọn</Text>
                    <View className="space-y-3">
                      {selectedTables.map((table, index) => (
                        <View key={table.id} className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <MaterialCommunityIcons name="table-chair" size={20} color="#ffffff" />
                            <View className="ml-3">
                              <Text className="text-white font-medium">Bàn {table.name}</Text>
                              <Text className="text-white/60 text-sm">{table.typeName}</Text>
                            </View>
                          </View>
                          {index < selectedTables.length - 1 && (
                            <View className="h-[1px] bg-white/10 my-2" />
                          )}
                        </View>
                      ))}
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
                  <Text className="text-white/60 text-sm mb-6 text-center">
                    Bằng cách nhấn "Xác nhận", bạn đã đồng ý với các điều khoản đặt bàn của chúng tôi.
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
        onClose={() => setShowProcessingModal(false)}
      />
    </View>
  );
}