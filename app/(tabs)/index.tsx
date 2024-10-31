import { View, Text, TouchableOpacity, Image, ScrollView, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { barService, type Bar } from '@/services/bar';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

// Thêm mảng banners cứng
const BANNERS = [
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

export default function HomeScreen() {
  const { user } = useAuth();
  const [bars, setBars] = useState<Bar[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerRef = useRef<FlatList>(null);

  const fetchBars = async () => {
    setLoading(true);
    try {
      const data = await barService.getBars();
      setBars(data);
    } catch (error) {
      console.error('Error fetching bars:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBars().finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchBars();
  }, []);

  const getAverageRating = (feedBacks: Array<{rating: number}>) => {
    if (!feedBacks.length) return null;
    const sum = feedBacks.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / feedBacks.length).toFixed(1);
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
            <View style={{ width: screenWidth }}>
              <Image
                source={{ uri: banner.image }}
                style={{ 
                  width: screenWidth,
                  height: screenWidth * 0.5
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

  return (
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
            <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-white/10">
              <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          className="flex-1"
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

            {loading ? (
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
                  renderItem={({ item: bar }) => {
                    return (
                      <TouchableOpacity 
                        className="w-72 overflow-hidden"
                        activeOpacity={0.7}
                        onPress={() => router.push(`./bar-detail/${bar.barId}`)}
                      >
                        <View className="relative">
                          <Image
                            source={{ uri: bar.images.split(',')[0].trim() }}
                            className="w-full h-[380px] rounded-3xl"
                            resizeMode="cover"
                          />
                          
                          {/* Status badges container */}
                          <View className="absolute top-4 w-full flex-row justify-between px-4">
                            {/* Left side - Table availability badge */}
                            <View>
                              {isBarOpen(bar.barTimeResponses) && (
                                <View 
                                  className={`px-2.5 py-1 rounded-full h-7 items-center justify-center ${
                                    bar.isAnyTableAvailable 
                                      ? 'bg-green-500/90' 
                                      : 'bg-red-500/90'
                                  }`}
                                >
                                  <Text className="text-white font-medium text-xs">
                                    {bar.isAnyTableAvailable ? 'Còn bàn hôm nay' : 'Hết bàn hôm nay'}
                                  </Text>
                                </View>
                              )}
                            </View>
                            
                            {/* Right side - Discount badge */}
                            <View>
                              {bar.discount > 0 && (
                                <View className="bg-yellow-500/90 px-2.5 py-1 rounded-full h-7 items-center justify-center">
                                  <Text className="text-black font-bold text-xs">-{bar.discount}%</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          
                          {/* Existing gradient and content */}
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
                            className="absolute bottom-0 left-0 right-0 h-40 rounded-b-3xl"
                          >
                            {/* Content overlay */}
                            <View className="absolute bottom-0 p-5 w-full">
                              <Text className="text-yellow-500 text-xl font-bold mb-2">
                                {bar.barName}
                              </Text>
                              
                              <View className="flex-row items-center mb-2">
                                <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                                <Text className="text-gray-400 text-xs ml-1 flex-1" numberOfLines={1}>
                                  {bar.address}
                                </Text>
                              </View>

                              <View className="flex-row items-center space-x-4">
                                <View className="flex-row items-center">
                                  <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                                  <Text className="text-gray-400 text-xs ml-1">
                                    {getCurrentDayTime(bar.barTimeResponses)}
                                  </Text>
                                </View>
                                <View className="flex-row items-center">
                                  <Ionicons name="star" size={14} color="#EAB308" />
                                  <Text className="text-white ml-1 text-xs font-medium">
                                    {getAverageRating(bar.feedBacks) ?? 'Chưa có đánh giá'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </LinearGradient>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
