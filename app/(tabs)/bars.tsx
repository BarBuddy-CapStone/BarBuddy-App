import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback, useEffect, memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { barService, type Bar } from '@/services/bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { formatRating } from '@/utils/rating';

// Thêm component BarSkeleton
const BarSkeleton = () => (
  <View className="overflow-hidden rounded-3xl mb-4">
    <View className="relative">
      {/* Image skeleton */}
      <View className="w-full h-[380px] bg-white/10" />
      
      {/* Content skeleton */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
        className="absolute bottom-0 left-0 right-0 h-40"
      >
        <View className="absolute bottom-0 p-5 w-full space-y-3">
          {/* Title skeleton */}
          <View className="h-6 w-48 bg-white/10 rounded-lg" />
          
          {/* Address skeleton */}
          <View className="h-4 w-full bg-white/10 rounded-lg" />
          
          {/* Info skeleton */}
          <View className="flex-row items-center space-x-4">
            <View className="h-4 w-24 bg-white/10 rounded-lg" />
            <View className="h-4 w-16 bg-white/10 rounded-lg" />
          </View>
        </View>
      </LinearGradient>
    </View>
  </View>
);

// Thêm helper function ở đầu file
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

const getCurrentDayTime = (barTimes: Bar['barTimeResponses']) => {
  const today = new Date().getDay();
  const currentDayTime = barTimes.find(time => time.dayOfWeek === today);
  if (!currentDayTime) return 'Đóng cửa hôm nay';
  return `${getDayOfWeekText(currentDayTime.dayOfWeek)}, ${currentDayTime.startTime.slice(0,5)} - ${currentDayTime.endTime.slice(0,5)}`;
};

const isBarOpen = (barTimes: Bar['barTimeResponses']) => {
  const today = new Date().getDay();
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
  
  const todaySchedule = barTimes.find(time => time.dayOfWeek === today);
  if (!todaySchedule) return false;
  
  return true; // Tạm thời return true vì logic check giờ phức tạp hơn cần xử lý riêng
};

// Tách BarItem thành một component riêng và sử dụng React.memo
const BarItem = memo(({ bar, onPress }: { bar: Bar; onPress: () => void }) => {
  const getAverageRating = useCallback((feedBacks: Array<{ rating: number }>) => {
    if (!feedBacks || feedBacks.length === 0) return null;
    const sum = feedBacks.reduce((acc, curr) => acc + curr.rating, 0);
    return sum / feedBacks.length;
  }, []);

  return (
    <Animated.View entering={FadeIn}>
      <TouchableOpacity
        className="overflow-hidden rounded-3xl"
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View className="relative">
          <Image
            source={{ uri: bar.images.split(',')[0].trim() }}
            className="w-full h-[250px]"
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
            {bar.discount > 0 && (
              <View className="bg-yellow-500/90 px-2.5 py-1 rounded-full h-7 items-center justify-center">
                <Text className="text-black font-bold text-xs">-{bar.discount}%</Text>
              </View>
            )}
          </View>

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
            className="absolute bottom-0 left-0 right-0 h-40"
          >
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
                    {formatRating(getAverageRating(bar.feedBacks))}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function BarsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  // Đơn giản hóa fetchBars
  const fetchBars = async () => {
    setLoading(true);
    try {
      const data = await barService.getBars();
      setBars(data);
    } catch (error) {
      console.error('Error fetching bars:', error);
      setBars([]);
    } finally {
      setLoading(false);
    }
  };

  // Tối ưu lại getFilteredBars
  const getFilteredBars = useCallback(() => {
    return bars.filter(bar => {
      // Nếu có search query, kiểm tra match
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = bar.barName.toLowerCase().includes(query);
        const addressMatch = bar.address.toLowerCase().includes(query);
        if (!nameMatch && !addressMatch) return false;
      }

      // Nếu filter "Đang mở cửa" được bật
      if (showOpenOnly && !isBarOpen(bar.barTimeResponses)) {
        return false;
      }

      return true;
    });
  }, [bars, searchQuery, showOpenOnly]);

  // Đơn giản hóa onRefresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBars().finally(() => setRefreshing(false));
  }, []);

  // Load data lần đầu
  useEffect(() => {
    fetchBars();
  }, []);

  const renderItem = useCallback(({ item: bar }: { item: Bar }) => {
    return (
      <BarItem 
        bar={bar} 
        onPress={() => router.push(`/bar-detail/${bar.barId}`)}
      />
    );
  }, []);

  const keyExtractor = useCallback((item: Bar) => item.barId, []);

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header và Search */}
        <View className="px-4 pt-1 flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1">
            <View className="flex-1 bg-neutral-900 rounded-full flex-row items-center h-9 px-3">
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                placeholder="Tìm kiếm quán Bar, địa chỉ quán Bar..."
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

          {/* Filter button */}
          <TouchableOpacity
            onPress={() => setShowOpenOnly(!showOpenOnly)}
            className={`h-9 w-auto rounded-full items-center justify-center ml-3 px-3 ${
              showOpenOnly ? 'bg-yellow-500' : 'bg-neutral-900'
            }`}
          >
            <View className="flex-row items-center">
              <Ionicons 
                name={showOpenOnly ? "time" : "time-outline"} 
                size={18} 
                color={showOpenOnly ? "black" : "white"} 
              />
              <Text className={`ml-2 text-xs font-medium ${showOpenOnly ? 'text-black' : 'text-white'}`}>
                {showOpenOnly ? 'Hôm nay' : 'Tất cả'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="h-[1px] bg-neutral-900" />

        {/* Content */}
        {loading ? (
          <ScrollView 
            className="flex-1" 
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {[1, 2, 3].map((item) => (
              <BarSkeleton key={item} />
            ))}
          </ScrollView>
        ) : (
          <FlatList
            data={getFilteredBars()}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ItemSeparatorComponent={() => <View className="h-4" />}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={true}
            initialNumToRender={3}
            ListEmptyComponent={() => (
              <View className="flex-1 items-center justify-center py-20">
                <Ionicons 
                  name={searchQuery ? "search" : "time-outline"} 
                  size={48} 
                  color="#EAB308" 
                />
                <Text className="text-white text-lg font-bold mt-4">
                  {searchQuery ? 'Không tìm thấy kết quả' : 'Không có quán bar nào đang mở cửa'}
                </Text>
                <Text className="text-white/60 text-center mt-2">
                  {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Hãy thử lại vào thời điểm khác'}
                </Text>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
