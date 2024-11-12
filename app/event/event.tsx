import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  ActivityIndicator,
  Modal,
  FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback, useEffect, useRef, createContext, memo, useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { eventService, type Event } from '@/services/event';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { barService, type CustomerBar } from '@/services/bar';

const LoadingSpinner = () => (
  <View className="py-4 items-center">
    <ActivityIndicator size="small" color="#EAB308" />
  </View>
);

// Tách phần xử lý bars thành hook riêng
const useBars = () => {
  const [bars, setBars] = useState<CustomerBar[]>([]);

  useEffect(() => {
    const fetchBars = async () => {
      try {
        const response = await barService.getBars();
        setBars(response);
      } catch (error) {
        console.error('Error fetching bars:', error);
      }
    };
    fetchBars();
  }, []);

  return bars;
};

// Component BarFilterModal giữ nguyên UI 100%
const BarFilterModal = memo(() => {
  const bars = useBars();
  const {
    showBarModal,
    setShowBarModal,
    selectedBarId,
    setSelectedBarId,
    setSelectedBar,
  } = useContext(EventContext);

  // Tối ưu render bar item
  const renderBarItem = useCallback((bar: CustomerBar) => (
    <TouchableOpacity
      key={bar.barId}
      className="overflow-hidden rounded-2xl mb-3"
      onPress={() => {
        setSelectedBarId(bar.barId);
        setSelectedBar(bar);
        setShowBarModal(false);
      }}
    >
      <View className="relative">
        <Image
          source={{ uri: bar.images.split(',')[0].trim() }}
          className="w-full h-[120px]"
          resizeMode="cover"
          loadingIndicatorSource={require('@/assets/images/bar-background.png')}
        />
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
          className="absolute bottom-0 left-0 right-0 h-24"
        >
          <View className="absolute bottom-0 p-4 w-full">
            <Text 
              numberOfLines={1} 
              className="text-yellow-500 text-lg font-bold mb-2"
            >
              {bar.barName}
            </Text>
            <View className="flex-row items-center flex-1">
              <Ionicons name="location-outline" size={14} color="#9CA3AF" />
              <Text 
                numberOfLines={1}
                className="text-gray-400 text-xs ml-1 flex-1"
              >
                {bar.address}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {selectedBarId === bar.barId && (
          <View className="absolute top-4 right-4 bg-yellow-500 h-6 w-6 rounded-full items-center justify-center">
            <Ionicons name="checkmark" size={16} color="black" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), [selectedBarId]);

  // Tối ưu BarFilterModal
  return (
    <Modal
      visible={showBarModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowBarModal(false)}
    >
      <TouchableOpacity 
        activeOpacity={1}
        onPress={() => setShowBarModal(false)} 
        className="flex-1 bg-black/50 items-center justify-center px-4"
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={e => e.stopPropagation()} 
          className="w-full"
        >
          <View className="bg-neutral-900 rounded-3xl w-full">
            <View className="py-4 px-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-lg font-bold">Chọn Quán Bar</Text>
                <TouchableOpacity 
                  onPress={() => setShowBarModal(false)}
                  className="h-8 w-8 bg-neutral-800 rounded-full items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={bars}
                keyExtractor={item => item.barId}
                renderItem={({ item }) => renderBarItem(item)}
                showsVerticalScrollIndicator={false}
                className="max-h-[65vh] mb-2"
                ListHeaderComponent={() => (
                  <TouchableOpacity
                    className={`mb-3 overflow-hidden rounded-2xl`}
                    onPress={() => {
                      setSelectedBarId(null);
                      setSelectedBar(null);
                      setShowBarModal(false);
                    }}
                  >
                    <View className={`p-4 flex-row items-center ${
                      selectedBarId === null ? 'bg-yellow-500' : 'bg-neutral-800'
                    }`}>
                      <View className={`h-10 w-10 rounded-xl items-center justify-center ${
                        selectedBarId === null ? 'bg-black/20' : 'bg-neutral-700'
                      }`}>
                        <Ionicons 
                          name="business" 
                          size={20} 
                          color={selectedBarId === null ? "black" : "white"} 
                        />
                      </View>
                      <Text className={`ml-3 font-medium ${
                        selectedBarId === null ? 'text-black' : 'text-white'
                      }`}>
                        Tất cả quán bar
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
});

// Thêm vào EventContext
const EventContext = createContext<{
  showBarModal: boolean;
  setShowBarModal: (show: boolean) => void;
  selectedBarId: string | null;
  setSelectedBarId: (id: string | null) => void;
  setSelectedBar: (bar: CustomerBar | null) => void;
  showEventTypeModal: boolean;
  setShowEventTypeModal: (show: boolean) => void;
  isEveryWeekEvent: number | null;
  setIsEveryWeekEvent: (type: number | null) => void;
}>({} as any);

// Thêm EventTypeModal component
const EventTypeModal = memo(() => {
  const {
    showEventTypeModal,
    setShowEventTypeModal,
    isEveryWeekEvent,
    setIsEveryWeekEvent
  } = useContext(EventContext);

  return (
    <Modal
      visible={showEventTypeModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowEventTypeModal(false)}
    >
      <TouchableOpacity 
        activeOpacity={1}
        onPress={() => setShowEventTypeModal(false)} 
        className="flex-1 bg-black/50 items-center justify-center px-4"
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={e => e.stopPropagation()} 
          className="w-full"
        >
          <View className="bg-neutral-900 rounded-3xl w-full">
            <View className="py-4 px-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-lg font-bold">Loại Sự Kiện</Text>
                <TouchableOpacity 
                  onPress={() => setShowEventTypeModal(false)}
                  className="h-8 w-8 bg-neutral-800 rounded-full items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>

              <View className="space-y-3">
                <TouchableOpacity
                  className={`p-4 rounded-2xl ${
                    isEveryWeekEvent === null ? 'bg-yellow-500' : 'bg-neutral-800'
                  }`}
                  onPress={() => {
                    setIsEveryWeekEvent(null);
                    setShowEventTypeModal(false);
                  }}
                >
                  <Text className={`text-center font-medium ${
                    isEveryWeekEvent === null ? 'text-black' : 'text-white'
                  }`}>
                    Tất cả sự kiện
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`p-4 rounded-2xl ${
                    isEveryWeekEvent === 1 ? 'bg-yellow-500' : 'bg-neutral-800'
                  }`}
                  onPress={() => {
                    setIsEveryWeekEvent(1);
                    setShowEventTypeModal(false);
                  }}
                >
                  <Text className={`text-center font-medium ${
                    isEveryWeekEvent === 1 ? 'text-black' : 'text-white'
                  }`}>
                    Sự kiện hàng tuần
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`p-4 rounded-2xl ${
                    isEveryWeekEvent === 0 ? 'bg-yellow-500' : 'bg-neutral-800'
                  }`}
                  onPress={() => {
                    setIsEveryWeekEvent(0);
                    setShowEventTypeModal(false);
                  }}
                >
                  <Text className={`text-center font-medium ${
                    isEveryWeekEvent === 0 ? 'text-black' : 'text-white'
                  }`}>
                    Sự kiện theo ngày
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
});

export default function EventScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isStillFilter, setIsStillFilter] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedBarId, setSelectedBarId] = useState<string | null>(null);
  const [selectedBar, setSelectedBar] = useState<CustomerBar | null>(null);
  const [isEveryWeekEvent, setIsEveryWeekEvent] = useState<number | null>(null);
  const [showBarModal, setShowBarModal] = useState(false);
  const [showEventTypeModal, setShowEventTypeModal] = useState(false);
  const [bars, setBars] = useState<CustomerBar[]>([]);

  // Fetch bars khi component mount
  useEffect(() => {
    const fetchBars = async () => {
      try {
        const response = await barService.getBars();
        setBars(response);
      } catch (error) {
        console.error('Error fetching bars:', error);
      }
    };
    fetchBars();
  }, []);

  const fetchEvents = useCallback(async (page: number, isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await eventService.getEvents({
        search: searchQuery,
        pageIndex: page,
        pageSize: 8,
        isStill: isStillFilter,
        barId: selectedBarId,
        isEveryWeekEvent: isEveryWeekEvent
      });

      if (isLoadMore) {
        setEvents(prev => [...prev, ...response.events]);
      } else {
        setEvents(response.events);
      }

      setTotalPages(response.totalPages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, isStillFilter, selectedBarId, isEveryWeekEvent]);

  // Xử lý search với debounce
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      setEvents([]);
      fetchEvents(1, false);
    }, 500);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, isStillFilter, selectedBarId, isEveryWeekEvent]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || loading || currentPage >= totalPages) return;
    
    const nextPage = currentPage + 1;
    fetchEvents(nextPage, true);
  }, [currentPage, totalPages, loadingMore, loading, fetchEvents]);

  const formatEventTime = (times: Event['eventTimeResponses']) => {
    if (!times.length) return 'Chưa có lịch';
    
    const time = times[0];
    if (time.date) {
      return `${format(new Date(time.date), 'dd/MM/yyyy', { locale: vi })} ${time.startTime.slice(0,5)} - ${time.endTime.slice(0,5)}`;
    } else if (time.dayOfWeek !== null) {
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return `${days[time.dayOfWeek]} hàng tuần, ${time.startTime.slice(0,5)} - ${time.endTime.slice(0,5)}`;
    }
    return 'Chưa có lịch';
  };

  const renderEventItem = useCallback((event: Event) => (
    <View key={event.eventId} className="mb-4">
      <TouchableOpacity 
        className="overflow-hidden rounded-3xl"
        activeOpacity={0.7}
        onPress={() => router.push(`/event-detail/${event.eventId}` as any)}
      >
        <View className="relative">
          <Image
            source={{ uri: event.images.split(',')[0].trim() }}
            className="w-full h-[200px]"
            resizeMode="cover"
          />
          
          {event.eventVoucherResponse && (
            <View className="absolute top-4 right-4">
              <View className="bg-yellow-500/90 px-2.5 py-1 rounded-full">
                <Text className="text-black font-bold text-xs">
                  -{event.eventVoucherResponse.discount}%
                </Text>
              </View>
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
            className="absolute bottom-0 left-0 right-0 h-36"
          >
            <View className="absolute bottom-0 p-4 w-full">
              <Text className="text-yellow-500 text-lg font-bold mb-2">
                {event.eventName}
              </Text>
              <View className="flex-row items-center mb-2">
                <Ionicons name="business-outline" size={14} color="#9CA3AF" />
                <Text className="text-gray-400 text-xs ml-1">
                  {event.barName}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                <Text className="text-gray-400 text-xs ml-1">
                  {formatEventTime(event.eventTimeResponses)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </View>
  ), []);

  // Thêm filter buttons vào header
  return (
    <EventContext.Provider value={{
      showBarModal,
      setShowBarModal,
      selectedBarId,
      setSelectedBarId,
      setSelectedBar,
      showEventTypeModal,
      setShowEventTypeModal,
      isEveryWeekEvent,
      setIsEveryWeekEvent
    }}>
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          {/* Header và Search */}
          <View className="px-4 pt-1 flex-row items-center justify-between mb-4">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="h-9 w-9 bg-neutral-900 rounded-full items-center justify-center mr-3"
            >
              <Ionicons name="arrow-back" size={18} color="white" />
            </TouchableOpacity>

            <View className="flex-row items-center flex-1">
              <View className="flex-1 bg-neutral-900 rounded-full flex-row items-center h-9 px-3">
                <Ionicons name="search" size={16} color="#9CA3AF" />
                <TextInput
                  placeholder="Tìm kiếm sự kiện..."
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 ml-2 text-white text-sm"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsStillFilter(prev => prev === 0 ? null : 0)}
              className={`h-9 px-3 rounded-full items-center justify-center ml-3 flex-row ${
                isStillFilter === 0 ? 'bg-yellow-500' : 'bg-neutral-900'
              }`}
            >
              <Ionicons 
                name={isStillFilter === 0 ? "time" : "time-outline"} 
                size={16} 
                color={isStillFilter === 0 ? "black" : "white"} 
              />
              <Text className={`ml-1 text-xs ${
                isStillFilter === 0 ? 'text-black' : 'text-white'
              }`}>
                Đang diễn ra
              </Text>
            </TouchableOpacity>
          </View>

          {/* Thêm filter buttons */}
          <View className="px-4 flex-row space-x-4 mb-4">
            <TouchableOpacity
              onPress={() => setShowBarModal(true)}
              className={`flex-1 h-9 rounded-full items-center justify-center flex-row ${
                selectedBarId ? 'bg-yellow-500' : 'bg-neutral-900'
              }`}
            >
              <Ionicons 
                name="business-outline" 
                size={16} 
                color={selectedBarId ? "black" : "white"} 
              />
              <Text className={`ml-2 text-xs ${
                selectedBarId ? 'text-black' : 'text-white'
              }`}>
                {selectedBar?.barName || 'Chọn quán bar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowEventTypeModal(true)}
              className={`flex-1 h-9 rounded-full items-center justify-center flex-row ${
                isEveryWeekEvent !== null ? 'bg-yellow-500' : 'bg-neutral-900'
              }`}
            >
              <Ionicons 
                name="calendar-outline" 
                size={16} 
                color={isEveryWeekEvent !== null ? "black" : "white"} 
              />
              <Text className={`ml-2 text-xs ${
                isEveryWeekEvent !== null ? 'text-black' : 'text-white'
              }`}>
                {isEveryWeekEvent === 1 ? 'Hàng tuần' : 
                 isEveryWeekEvent === 0 ? 'Theo ngày' : 
                 'Loại sự kiện'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="h-[1.5px] bg-neutral-900" />

          {/* Content */}
          <ScrollView 
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const paddingToBottom = 20;
              const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
                contentSize.height - paddingToBottom;
                
              if (isCloseToBottom && !loadingMore && !loading && currentPage < totalPages) {
                handleLoadMore();
              }
            }}
            scrollEventThrottle={16}
          >
            {loading && !loadingMore ? (
              // Loading skeleton
              [...Array(4)].map((_, index) => (
                <View key={`skeleton-${index}`} className="mb-4">
                  <View className="w-full h-[200px] bg-white/10 rounded-3xl" />
                </View>
              ))
            ) : events.length > 0 ? (
              <>
                {events.map(renderEventItem)}
                
                {loadingMore && (
                  <View className="py-4">
                    <ActivityIndicator size="small" color="#EAB308" />
                  </View>
                )}
                
                {currentPage >= totalPages && events.length > 0 && (
                  <Text className="text-white/60 text-center py-4">
                    Đã hiển thị tất cả sự kiện
                  </Text>
                )}
              </>
            ) : (
              <View className="flex-1 items-center justify-center py-20">
                <Ionicons name="calendar-outline" size={48} color="#EAB308" />
                <Text className="text-white text-lg font-bold mt-4">
                  Không tìm thấy sự kiện nào
                </Text>
                <Text className="text-white/60 text-center mt-2">
                  {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Hiện tại chưa có sự kiện nào'}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Render modals */}
          <BarFilterModal />
          <EventTypeModal />
        </SafeAreaView>
      </View>
    </EventContext.Provider>
  );
}
