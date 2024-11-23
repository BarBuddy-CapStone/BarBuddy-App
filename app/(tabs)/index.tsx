import { View, Text, TouchableOpacity, Image, ScrollView, RefreshControl, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState, useRef, memo, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { barService, type Bar } from '@/services/bar';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Dimensions, Platform } from 'react-native';
import { formatRating } from '@/utils/rating';
import { eventService, type Event } from '@/services/event';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';
import { useLocation } from '@/contexts/LocationContext';

const screenWidth = Dimensions.get('window').width;

// Thêm các interface ở đầu file
interface Banner {
  id: number;
  image: string;
  title: string;
  description: string;
}

// Định nghĩa type cho props của các component
interface BannerItemProps {
  banner: Banner;
  width: number;
}

interface BarItemProps {
  bar: Bar;
  onPress: () => void;
  getCurrentDayTime: (barTimes: Bar['barTimeResponses']) => string;
  isBarOpen: (barTimes: Bar['barTimeResponses']) => boolean;
  getAverageRating: (feedBacks: Array<{ rating: number }>) => number | null;
  loadingDistances: boolean;
}

// Thêm mảng banners cứng
const BANNERS: Banner[] = [
  {
    id: 1,
    image: 'https://cdn-kvweb.kiotviet.vn/kiotviet-website/wp-content/uploads/2019/09/kinh-doanh-qu%C3%A1n-bar.jpg',
    title: 'Nhận ưu đãi khi đặt trước',
    description: 'Chiết khấu cho khách hàng đặt trước thức uống tại quán'
  },
  {
    id: 2, 
    image: 'https://cdn.pastaxi-manager.onepas.vn/content/uploads/articles/nguyendoan/anh-blog/20-beer-club-soi-dong-hcm/top-20-beer-club-noi-tieng-soi-dong-nhat-o-tphcm-14.jpg',
    title: 'Đa dạng concept',
    description: 'Mỗi quán bar sẽ có những concept khác nhau'
  },
  {
    id: 3,
    image: 'https://i0.wp.com/utahagenda.com/wp-content/uploads/2022/08/e7e10-live-music-venue-utah-1038.jpg?resize=1038%2C576&ssl=1', 
    title: 'Sự kiện âm nhạc mỗi cuối tuần',
    description: 'Live cùng các band nhạc mỗi tối Thứ 7 và Chủ nhật'
  }
];

// Tách BannerItem thành component riêng
const BannerItem = memo(({ banner, width }: BannerItemProps) => (
  <View style={{ width }}>
    <Image
      source={{ uri: banner.image }}
      style={{ 
        width,
        height: width * 0.5
      }}
      resizeMode="cover"
    />
    <LinearGradient
      colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
      className="absolute bottom-0 left-0 right-0 h-40"
    >
      <View className="absolute bottom-0 p-5 w-full">
        <Text className="text-yellow-500 text-xl font-bold mb-2">
          {banner.title}
        </Text>
        <Text className="text-gray-400 text-sm">
          {banner.description}
        </Text>
      </View>
    </LinearGradient>
  </View>
));

// Tách Badge components
const StatusBadge = memo(({ isAvailable }: { isAvailable: boolean }) => (
  <View className={`px-2.5 py-1 rounded-full h-7 items-center justify-center ${
    isAvailable ? 'bg-green-500/90' : 'bg-red-500/90'
  }`}>
    <Text className="text-white font-medium text-xs">
      {isAvailable ? 'Còn bàn hôm nay' : 'Hết bàn hôm nay'}
    </Text>
  </View>
));

const DistanceBadge = memo(({ distance, loading }: { distance?: number, loading: boolean }) => {
  if (loading) {
    return (
      <View className="bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
        <ActivityIndicator size="small" color="#ffffff" />
      </View>
    );
  }
  
  if (distance !== undefined) {
    return (
      <View className="bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
        <Text className="text-white font-medium text-xs">
          {distance.toFixed(1)}km
        </Text>
      </View>
    );
  }
  
  return null;
});

const DiscountBadge = memo(({ discount }: { discount: number }) => {
  if (discount <= 0) return null;
  
  return (
    <View className="bg-yellow-500/90 px-2.5 py-1 rounded-full h-7 items-center justify-center">
      <Text className="text-black font-bold text-xs">-{discount}%</Text>
    </View>
  );
});

// Tối ưu BarItem với memo và useMemo
const BarItem = memo(({ 
  bar, 
  onPress,
  getCurrentDayTime,
  isBarOpen,
  getAverageRating,
  loadingDistances 
}: BarItemProps) => {
  // Tách các tính toán phức tạp ra khỏi render cycle
  const memoizedValues = useMemo(() => ({
    isOpen: isBarOpen(bar.barTimeResponses),
    dayTime: getCurrentDayTime(bar.barTimeResponses),
    rating: formatRating(getAverageRating(bar.feedBacks)),
    mainImage: bar.images.split(',')[0].trim(),
    distance: bar.location?.distance,
    isAvailable: bar.isAnyTableAvailable,
    discount: bar.discount
  }), [
    bar.barTimeResponses,
    bar.feedBacks,
    bar.images,
    bar.location?.distance,
    bar.isAnyTableAvailable,
    bar.discount,
    getCurrentDayTime,
    isBarOpen,
    getAverageRating
  ]);

  // Tách các component con để tránh re-render không cần thiết
  const renderBadges = useMemo(() => (
    <View className="absolute top-4 w-full flex-row justify-between px-4">
      <View className="flex flex-col items-start space-y-2">
        {memoizedValues.isOpen && (
          <StatusBadge isAvailable={memoizedValues.isAvailable} />
        )}
        <View className="self-start">
          <DistanceBadge 
            distance={memoizedValues.distance} 
            loading={loadingDistances} 
          />
        </View>
      </View>
      <DiscountBadge discount={memoizedValues.discount} />
    </View>
  ), [memoizedValues, loadingDistances]);

  return (
    <TouchableOpacity 
      className="w-72 overflow-hidden"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View className="relative">
        <Image
          source={{ uri: memoizedValues.mainImage }}
          className="w-full h-[380px] rounded-3xl"
          resizeMode="cover"
        />
        
        {renderBadges}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
          className="absolute bottom-0 left-0 right-0 h-40 rounded-b-3xl"
        >
          <View className="absolute bottom-0 p-5 w-full">
            <Text 
              className="text-yellow-500 text-xl font-bold mb-2" 
              numberOfLines={1}
              style={{ lineHeight: 24 }}
            >
              {bar.barName}
            </Text>
            <View className="flex-row items-center mb-2">
              <Ionicons name="location-outline" size={14} color="#9CA3AF" />
              <Text 
                className="text-gray-400 text-xs ml-1 flex-1" 
                numberOfLines={1}
                style={{ lineHeight: 16 }}
              >
                {bar.address}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                <Text className="text-gray-400 text-xs ml-1">
                  {memoizedValues.dayTime}
                </Text>
              </View>
              {memoizedValues.rating !== null && (
                <View className="flex-row items-center space-x-2">
                  <Ionicons name="star" size={14} color="#EAB308" />
                  <Text className="text-white text-xs">
                    {memoizedValues.rating}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Tối ưu điều kiện re-render
  return (
    prevProps.bar.barId === nextProps.bar.barId &&
    prevProps.loadingDistances === nextProps.loadingDistances &&
    prevProps.bar.location?.distance === nextProps.bar.location?.distance &&
    prevProps.bar.isAnyTableAvailable === nextProps.bar.isAnyTableAvailable &&
    prevProps.bar.discount === nextProps.bar.discount &&
    prevProps.bar.barTimeResponses === nextProps.bar.barTimeResponses && // So sánh reference thay vì stringify
    prevProps.bar.images === nextProps.bar.images &&
    prevProps.bar.feedBacks === nextProps.bar.feedBacks
  );
});

// Thêm interface EventItemProps
interface EventItemProps {
  event: Event;
}

// Thêm component EventItem
const EventItem = memo(({ event }: EventItemProps) => {
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

  return (
    <TouchableOpacity 
      className="w-72 overflow-hidden"
      activeOpacity={0.7}
      onPress={() => router.push(`/event-detail/${event.eventId}` as any)}
    >
      <View className="relative">
        <Image
          source={{ uri: event.images.split(',')[0].trim() }}
          className="w-full h-[200px] rounded-3xl"
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
          className="absolute bottom-0 left-0 right-0 h-36 rounded-b-3xl"
        >
          <View className="absolute bottom-0 p-4 w-full">
            <Text 
              className="text-yellow-500 text-lg font-bold mb-2"
              numberOfLines={1}
              style={{ lineHeight: 24 }}
            >
              {event.eventName}
            </Text>
            <View className="flex-row items-center mb-2">
              <Ionicons name="business-outline" size={14} color="#9CA3AF" />
              <Text 
                className="text-gray-400 text-xs ml-1 flex-1"
                numberOfLines={1}
                style={{ lineHeight: 16 }}
              >
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
  );
});

export default function HomeScreen() {
  const { user } = useAuth();
  const { userLocation, locationPermission, checkAndGetLocation, setUserLocation } = useLocation();
  const [bars, setBars] = useState<Bar[]>([]);
  const [barsWithLocation, setBarsWithLocation] = useState<Bar[]>([]);
  const [fetchingBars, setFetchingBars] = useState(true);
  const [calculatingDistances, setCalculatingDistances] = useState(false);
  const calculationInProgress = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerRef = useRef<FlatList>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventSectionTitle, setEventSectionTitle] = useState('Sự kiện đang diễn ra');
  const [loadingDistances, setLoadingDistances] = useState(false);

  const fetchBars = useCallback(async () => {
    setFetchingBars(true);
    try {
      const data = await barService.getBars(1, 1000);
      setBars(data);
      setBarsWithLocation(data.map(bar => ({ ...bar })));
    } catch (error) {
      console.error('Error fetching bars:', error);
    } finally {
      setFetchingBars(false);
    }
  }, []);

  const calculateDistances = useCallback(async () => {
    if (calculationInProgress.current || !userLocation) return;
    
    calculationInProgress.current = true;
    setCalculatingDistances(true);
    
    try {
      const updatedBars = await barService.calculateBarDistances(bars, userLocation);
      setBarsWithLocation(prev => 
        prev.map(bar => {
          const updatedBar = updatedBars.find(b => b.barId === bar.barId);
          return updatedBar || bar;
        })
      );
    } catch (error) {
      console.error('Error calculating distances:', error);
    } finally {
      setCalculatingDistances(false);
      calculationInProgress.current = false;
    }
  }, [bars, userLocation]);

  // Thêm useEffect riêng cho fetchEvents
  useEffect(() => {
    fetchEvents();
  }, []); // Chỉ chạy 1 lần khi mount

  useEffect(() => {
    fetchBars();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const autoCheckLocation = async () => {
        try {
          const location = await checkAndGetLocation();
          if (location && bars.length > 0) {
            calculateDistances();
          }
        } catch (error) {
          console.error('Error checking location:', error);
        }
      };
      
      autoCheckLocation();
    }, [bars])
  );

  useEffect(() => {
    if (bars.length > 0 && userLocation && !fetchingBars) {
      calculateDistances();
    }
  }, [bars, userLocation, fetchingBars]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const response = await eventService.getEvents({
        pageIndex: 1,
        pageSize: 5,
        isStill: 0
      });

      if (response.events.length > 0) {
        setEvents(response.events);
        setEventSectionTitle('Sự kiện đang diễn ra');
      } else {
        const allEventsResponse = await eventService.getEvents({
          pageIndex: 1,
          pageSize: 5,
          isStill: null
        });
        setEvents(allEventsResponse.events);
        setEventSectionTitle('Sự kiện');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const getAverageRating = (feedBacks: Array<{rating: number}>) => {
    if (!feedBacks.length) return null;
    const sum = feedBacks.reduce((acc, curr) => acc + curr.rating, 0);
    return sum / feedBacks.length;
  };

  const BarSkeleton = () => (
    <View className="w-72 h-[380px] bg-white/5 rounded-3xl overflow-hidden mx-3 animate-pulse">
      <View className="flex-1">
        <View className="absolute bottom-0 p-5 w-full">
          <View className="h-6 bg-white/10 rounded-full w-3/4 mb-3" />
          <View className="h-4 bg-white/10 rounded-full w-full mb-2" />
          <View className="flex-row justify-between">
            <View className="h-4 bg-white/10 rounded-full w-1/3" />
            <View className="h-4 bg-white/10 rounded-full w-1/4" />
          </View>
        </View>
      </View>
    </View>
  );

  const BannerSlider = () => {
    const [scrollPosition, setScrollPosition] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      timeoutRef.current = setInterval(() => {
        const nextPosition = scrollPosition + screenWidth;
        const newPosition = nextPosition >= screenWidth * BANNERS.length ? 0 : nextPosition;
        
        bannerRef.current?.scrollToOffset({
          offset: newPosition,
          animated: true
        });
        
        setScrollPosition(newPosition);
      }, 3000);

      return () => {
        if (timeoutRef.current) {
          clearInterval(timeoutRef.current);
        }
      };
    }, [scrollPosition]);

    return (
      <View className="">
        <FlatList
          ref={bannerRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={BANNERS}
          snapToInterval={screenWidth}
          decelerationRate="fast"
          bounces={false}
          onScroll={(event) => {
            const currentOffset = event.nativeEvent.contentOffset.x;
            setScrollPosition(currentOffset);
          }}
          scrollEventThrottle={16}
          renderItem={({ item: banner }) => (
            <BannerItem banner={banner} width={screenWidth} />
          )}
        />
      </View>
    );
  };

  // Thêm hàm helper để chuyển đổi dayOfWeek thành text
  const getDayOfWeekText = (dayOfWeek: number) => {
    switch (dayOfWeek) {
      case 0:
        return 'CN';
      case 1:
        return 'T2';
      case 2:
        return 'T3';
      case 3:
        return 'T4';
      case 4:
        return 'T5';
      case 5:
        return 'T6';
      case 6:
        return 'T7';
      default:
        return '';
    }
  };

  // Cập nhật hàm getCurrentDayTime
  const getCurrentDayTime = (barTimes: Bar['barTimeResponses']) => {
    const today = new Date().getDay();
    const currentDayTime = barTimes.find(time => time.dayOfWeek === today);
    if (!currentDayTime) return 'Đóng cửa hôm nay';
    return `${getDayOfWeekText(currentDayTime.dayOfWeek)}, ${currentDayTime.startTime.slice(0,5)} - ${currentDayTime.endTime.slice(0,5)}`;
  };

  // Thêm hàm kiểm tra quán có đang mở cửa không
  const isBarOpen = (barTimes: Bar['barTimeResponses']) => {
    const today = new Date().getDay();
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
    
    const todaySchedule = barTimes.find(time => time.dayOfWeek === today);
    if (!todaySchedule) return false;
    
    return true; // Tạm thời return true vì logic check giờ phức tạp hơn cần xử lý riêng
  };

  const renderBannerItem = useCallback(({ item: banner }: { item: Banner }) => (
    <BannerItem banner={banner} width={screenWidth} />
  ), [screenWidth]);

  const renderBarItem = useCallback(({ item: bar }: { item: Bar }) => {
    const barWithLocation = barsWithLocation.find(b => b.barId === bar.barId);
    return (
      <BarItem 
        bar={barWithLocation || bar}
        onPress={() => router.push(`./bar-detail/${bar.barId}`)}
        getCurrentDayTime={getCurrentDayTime}
        isBarOpen={isBarOpen}
        getAverageRating={getAverageRating}
        loadingDistances={calculatingDistances}
      />
    );
  }, [barsWithLocation, calculatingDistances]);

  const keyExtractor = useCallback((item: Banner | Bar) => {
    if ('id' in item) return item.id.toString();
    return item.barId;
  }, []);

  const EventSkeleton = () => (
    <View className="w-72 h-[200px] bg-white/5 rounded-3xl overflow-hidden mx-3 animate-pulse">
      <View className="flex-1">
        <View className="absolute bottom-0 p-4 w-full">
          <View className="h-6 bg-white/10 rounded-full w-3/4 mb-3" />
          <View className="h-4 bg-white/10 rounded-full w-full mb-2" />
          <View className="flex-row justify-between">
            <View className="h-4 bg-white/10 rounded-full w-1/3" />
            <View className="h-4 bg-white/10 rounded-full w-1/4" />
          </View>
        </View>
      </View>
    </View>
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchBars(),
        fetchEvents()
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchBars, fetchEvents]);

  return Platform.OS === 'ios' ? (
    // iOS Layout
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-6 py-4 border-b border-white/10">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white/60">Xin chào 👋</Text>
              <Text className="text-yellow-500 text-xl font-bold">
                {user?.fullname || 'Khách'}
              </Text>
            </View>
            <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-white/10" onPress={() => router.push('/notifications' as any)}>
              <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: 100 // Tăng padding bottom cho iOS
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Banner Section */}
          <BannerSlider />

          {/* Bars Section */}
          <View className="mt-4 pb-4">
            <View className="flex-row justify-between items-center px-6 mb-4">
              <Text className="text-white text-xl font-bold">
                Hệ Thống Quán Bar
              </Text>
              <Link href="/(tabs)/bars" asChild>
                <TouchableOpacity>
                  <Text className="text-yellow-500">Tất cả</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {fetchingBars ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24 }}
              >
                {[1,2,3].map(i => <BarSkeleton key={i} />)}
              </ScrollView>
            ) : (
              <Animated.View entering={FadeIn}>
                <FlatList
                  horizontal
                  data={bars}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                  ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                  renderItem={renderBarItem}
                  keyExtractor={keyExtractor}
                  maxToRenderPerBatch={3}
                  windowSize={3}
                  removeClippedSubviews={true}
                  initialNumToRender={2}
                  updateCellsBatchingPeriod={50}
                  getItemLayout={(data, index) => ({
                    length: 288,
                    offset: 288 * index,
                    index,
                  })}
                />
              </Animated.View>
            )}
          </View>

          {/* Events Section */}
          <View className="mt-4 pb-4">
            <View className="flex-row justify-between items-center px-6 mb-4">
              <Text className="text-white text-xl font-bold">
                {eventSectionTitle}
              </Text>
              <TouchableOpacity onPress={() => router.push('/event/event' as any)}>
                <Text className="text-yellow-500">Tất cả</Text>
              </TouchableOpacity>
            </View>

            {loadingEvents ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24 }}
              >
                {[1,2,3].map(i => <EventSkeleton key={i} />)}
              </ScrollView>
            ) : events.length > 0 ? (
              <Animated.View entering={FadeIn}>
                <FlatList
                  horizontal
                  data={events}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                  ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                  renderItem={({ item }) => <EventItem event={item} />}
                  keyExtractor={(item) => item.eventId}
                />
              </Animated.View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  ) : (
    // Android Layout
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 border-b border-white/10">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white/60">Xin chào 👋</Text>
              <Text className="text-yellow-500 text-xl font-bold">
                {user?.fullname || 'Khách'}
              </Text>
            </View>
            <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-white/10" onPress={() => router.push('/notifications' as any)}>
              <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: 80 // Giữ nguyên padding cho Android
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Banner Section */}
          <BannerSlider />

          {/* Bars Section */}
          <View className="mt-4 pb-4">
            <View className="flex-row justify-between items-center px-6 mb-4">
              <Text className="text-white text-xl font-bold">
                Hệ Thống Quán Bar
              </Text>
              <Link href="/(tabs)/bars" asChild>
                <TouchableOpacity>
                  <Text className="text-yellow-500">Tất cả</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {fetchingBars ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24 }}
              >
                {[1,2,3].map(i => <BarSkeleton key={i} />)}
              </ScrollView>
            ) : (
              <Animated.View entering={FadeIn}>
                <FlatList
                  horizontal
                  data={bars}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                  ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                  renderItem={renderBarItem}
                  keyExtractor={keyExtractor}
                  maxToRenderPerBatch={3}
                  windowSize={3}
                  removeClippedSubviews={true}
                  initialNumToRender={2}
                  updateCellsBatchingPeriod={50}
                  getItemLayout={(data, index) => ({
                    length: 288,
                    offset: 288 * index,
                    index,
                  })}
                />
              </Animated.View>
            )}
          </View>

          {/* Events Section */}
          <View className="mt-4 pb-4">
            <View className="flex-row justify-between items-center px-6 mb-4">
              <Text className="text-white text-xl font-bold">
                {eventSectionTitle}
              </Text>
              <TouchableOpacity onPress={() => router.push('/event/event' as any)}>
                <Text className="text-yellow-500">Tất cả</Text>
              </TouchableOpacity>
            </View>

            {loadingEvents ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24 }}
              >
                {[1,2,3].map(i => <EventSkeleton key={i} />)}
              </ScrollView>
            ) : events.length > 0 ? (
              <Animated.View entering={FadeIn}>
                <FlatList
                  horizontal
                  data={events}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                  ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                  renderItem={({ item }) => <EventItem event={item} />}
                  keyExtractor={(item) => item.eventId}
                />
              </Animated.View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
