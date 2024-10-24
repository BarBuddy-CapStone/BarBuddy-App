import { View, Text, TouchableOpacity, Image, ScrollView, RefreshControl, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { barService, type Bar } from '@/services/bar';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { drinkService, type Drink } from '@/services/drink';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function HomeScreen() {
  const { user } = useAuth();
  const [bars, setBars] = useState<Bar[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [randomDrinks, setRandomDrinks] = useState<Drink[]>([]);
  const [loadingDrinks, setLoadingDrinks] = useState(true);

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

  const getRandomDrinks = (drinks: Drink[], count: number = 10) => {
    const shuffled = [...drinks].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const fetchDrinks = async () => {
    setLoadingDrinks(true);
    try {
      const data = await drinkService.getDrinks();
      setDrinks(data);
      setRandomDrinks(getRandomDrinks(data, 10));
    } catch (error) {
      console.error('Error fetching drinks:', error);
    } finally {
      setLoadingDrinks(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchBars(), fetchDrinks()]).finally(() => 
      setRefreshing(false)
    );
  }, []);

  useEffect(() => {
    fetchBars();
    fetchDrinks();
  }, []);

  const getAverageRating = (feedBacks: Array<{rating: number}>) => {
    if (!feedBacks.length) return 0;
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

  const DrinkSkeleton = () => (
    <View className="w-40 bg-white/5 rounded-2xl overflow-hidden mx-2 animate-pulse">
      <View className="w-full h-40 bg-white/10" />
      <View className="p-3">
        <View className="h-4 bg-white/10 rounded-full w-3/4 mb-2" />
        <View className="h-3 bg-white/10 rounded-full w-full mb-2" />
        <View className="h-3 bg-white/10 rounded-full w-2/3 mb-2" />
        <View className="flex-row justify-between items-center">
          <View className="h-4 bg-white/10 rounded-full w-1/3" />
          <View className="h-4 bg-white/10 rounded-full w-1/3" />
        </View>
      </View>
    </View>
  );

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
          <View className="mt-8">
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
                  renderItem={({ item: bar }) => (
                    <TouchableOpacity 
                      className="w-72 overflow-hidden"
                      activeOpacity={0.7}
                      onPress={() => router.push(`./bar-detail/${bar.barId}`)}
                    >
                      <View className="relative">
                        <Image
                          source={{ uri: bar.images.split(',')[0].trim() }} // Lấy ảnh đầu tiên làm ảnh đại diện
                          className="w-full h-[380px] rounded-3xl"
                          resizeMode="cover"
                        />
                        
                        {/* Gradient overlay */}
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
                  )}
                />
              </Animated.View>
            )}
          </View>

          {/* Drinks Section */}
          <View className="mt-8">
            <View className="flex-row justify-between items-center px-6 mb-4">
              <Text className="text-white text-xl font-bold">
                Đồ uống phổ biến
              </Text>
              <TouchableOpacity>
                <Text className="text-yellow-500">Xem thêm</Text>
              </TouchableOpacity>
            </View>

            {loadingDrinks ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24 }}
              >
                {[1,2,3,4].map(i => <DrinkSkeleton key={i} />)}
              </ScrollView>
            ) : (
              <Animated.View entering={FadeIn}>
                <FlatList
                  horizontal
                  data={randomDrinks}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                  ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                  renderItem={({ item: drink }) => (
                    <TouchableOpacity 
                      className="w-40 bg-white/5 rounded-2xl overflow-hidden"
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: drink.images }}
                        className="w-full h-40 rounded-t-2xl"
                        resizeMode="cover"
                      />
                      <View className="p-3">
                        <Text className="text-yellow-500 font-bold mb-1" numberOfLines={1}>
                          {drink.drinkName}
                        </Text>
                        <Text className="text-white/60 text-xs mb-2" numberOfLines={2}>
                          {drink.description}
                        </Text>
                        <View className="flex-row items-center justify-between">
                          <Text className="text-white font-medium">
                            {drink.price.toLocaleString()}đ
                          </Text>
                          <View className="px-2 py-1 bg-white/10 rounded">
                            <Text className="text-white/80 text-xs">
                              {drink.drinkCategoryResponse.drinksCategoryName}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
