import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { barService, type Bar } from '@/services/bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import debounce from 'lodash/debounce';

// Thêm component BarSkeleton
const BarSkeleton = () => (
  <View className="overflow-hidden rounded-3xl mb-6 animate-pulse">
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

export default function BarsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Thêm state để track trạng thái search
  const [isSearching, setIsSearching] = useState(false);

  const fetchBars = async (page: number, search?: string, refresh: boolean = false) => {
    if (refresh) {
      setLoading(true);
      // Reset các state khi refresh
      setBars([]);
      setCurrentPage(1);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await barService.getBars(page, 5, search);
      if (refresh) {
        setBars(data);
      } else {
        if (data.length > 0) {
          setBars(prev => [...prev, ...data]);
        }
      }
      setHasMore(data.length === 5);
    } catch (error) {
      console.error('Error fetching bars:', error);
      // Reset state khi có lỗi
      if (refresh) {
        setBars([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      if (refresh) {
        setIsSearching(false);
      }
    }
  };

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      fetchBars(1, query, true);
    }, 500),
    []
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setIsSearching(true); // Bắt đầu search
    setBars([]); // Clear results ngay khi bắt đầu search
    debouncedSearch(text);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBars(1, searchQuery, true).finally(() => setRefreshing(false));
  }, [searchQuery]);

  const loadMore = () => {
    if (!loadingMore && hasMore && !isSearching) {
      fetchBars(currentPage + 1, searchQuery);
      setCurrentPage(prev => prev + 1);
    }
  };

  // Thêm useEffect để handle khi searchQuery thay đổi
  useEffect(() => {
    if (searchQuery === '') {
      // Nếu xóa search query, load lại tất cả data
      fetchBars(1, '', true);
    }
  }, [searchQuery]);

  const getAverageRating = (feedBacks: Array<{ rating: number }>) => {
    if (!feedBacks || feedBacks.length === 0) return '0.0';
    const sum = feedBacks.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / feedBacks.length).toFixed(1);
  };

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header và Search */}
        <View className="px-6 py-4 border-b border-white/10">
          <Text className="text-yellow-500 text-2xl font-bold mb-4">
            Quán Bar
          </Text>
          <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-2">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Tìm kiếm quán bar..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-white"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery !== '' && (
              <TouchableOpacity 
                onPress={() => {
                  setSearchQuery('');
                  handleSearch('');
                }}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        {(loading || isSearching) ? (
          <ScrollView 
            className="flex-1" 
            contentContainerStyle={{ padding: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {[1, 2, 3].map((item) => (
              <BarSkeleton key={item} />
            ))}
          </ScrollView>
        ) : (
          <FlatList
            data={bars}
            keyExtractor={item => item.barId}
            contentContainerStyle={{ padding: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ItemSeparatorComponent={() => <View className="h-6" />}
            ListEmptyComponent={() => (
              <View className="flex-1 items-center justify-center py-20">
                <Ionicons name="search" size={48} color="#EAB308" />
                <Text className="text-white text-lg font-bold mt-4">
                  Không tìm thấy kết quả
                </Text>
                <Text className="text-white/60 text-center mt-2">
                  Thử tìm kiếm với từ khóa khác
                </Text>
              </View>
            )}
            ListFooterComponent={() => (
              loadingMore ? (
                <View className="py-4">
                  <ActivityIndicator color="#EAB308" />
                </View>
              ) : null
            )}
            renderItem={({ item: bar }) => (
              <Animated.View entering={FadeIn}>
                <TouchableOpacity
                  className="overflow-hidden rounded-3xl"
                  activeOpacity={0.7}
                  onPress={() => router.push(`/bar-detail/${bar.barId}`)}
                >
                  <View className="relative">
                    <Image
                      source={{ uri: bar.images.split(',')[0].trim() }}
                      className="w-full h-[380px]"
                      resizeMode="cover"
                    />
                    
                    {/* Gradient overlay */}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
                      className="absolute bottom-0 left-0 right-0 h-40"
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
                              {bar.startTime.slice(0,5)} - {bar.endTime.slice(0,5)}
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <Ionicons name="star" size={14} color="#EAB308" />
                            <Text className="text-white ml-1 text-xs font-medium">
                              {getAverageRating(bar.feedBacks)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>

                    {/* Discount badge */}
                    {bar.discount > 0 && (
                      <View className="absolute top-4 right-4 bg-yellow-500/90 px-2.5 py-1 rounded-full">
                        <Text className="text-black font-bold text-sm">-{bar.discount}%</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
