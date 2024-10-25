import { View, Text, ScrollView, Image, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import { barService, type BarDetail } from '@/services/bar';
import { drinkService, type Drink } from '@/services/drink';

// Thêm hàm xử lý images
const getImageArray = (imagesString: string): string[] => {
  return imagesString.split(',').map(img => img.trim()).filter(img => img !== '');
};

const SkeletonLoader = ({ className }: { className: string }) => {
  const translateX = useSharedValue(-100);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(100, { 
        duration: 800,
      }),
      -1,
      false // set to false để animation chạy liên tục
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View className={`overflow-hidden ${className}`}>
      <View className="h-full w-full absolute bg-white/10" />
      <Animated.View 
        style={[{ 
          width: '100%',
          height: '100%',
          position: 'absolute',
          backgroundColor: 'transparent',
        }, animatedStyle]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.3)',
            'transparent'
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ 
            flex: 1,
            width: '100%',
          }}
          locations={[0.1, 0.5, 0.9]}
        />
      </Animated.View>
    </View>
  );
};

const BarDetailSkeleton = () => (
  <View className="flex-1 bg-black">
    <SafeAreaView className="flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Image Skeleton */}
        <SkeletonLoader className="h-96" />
        
        <View className="px-6 -mt-20 relative z-10">
          <View className="space-y-6">
            {/* Header Info Skeleton */}
            <View>
              <SkeletonLoader className="h-8 rounded-full w-3/4 mb-2" />
              <View className="flex-row items-center space-x-4">
                <SkeletonLoader className="h-5 rounded-full w-16" />
                <SkeletonLoader className="h-5 rounded-full w-20" />
              </View>
            </View>

            {/* Location & Contact Skeleton */}
            <View className="space-y-4">
              {[1, 2, 3, 4].map((_, index) => (
                <View key={index} className="flex-row items-center space-x-3">
                  <SkeletonLoader className="w-5 h-5 rounded-full" />
                  <SkeletonLoader className="h-5 rounded-full flex-1" />
                </View>
              ))}
            </View>

            {/* Description Skeleton */}
            <View>
              <SkeletonLoader className="h-6 rounded-full w-32 mb-2" />
              <View className="space-y-2">
                <SkeletonLoader className="h-4 rounded-full w-full" />
                <SkeletonLoader className="h-4 rounded-full w-full" />
                <SkeletonLoader className="h-4 rounded-full w-3/4" />
              </View>
            </View>

            {/* Book Button Skeleton */}
            <SkeletonLoader className="h-14 rounded-xl" />

            {/* Reviews Skeleton */}
            <View>
              <SkeletonLoader className="h-6 rounded-full w-48 mb-4" />
              {[1, 2].map((_, index) => (
                <View
                  key={index}
                  className="bg-white/5 rounded-xl p-4 mb-3"
                >
                  <View className="flex-row items-center mb-2">
                    <SkeletonLoader className="w-10 h-10 rounded-full" />
                    <View className="ml-3 flex-1">
                      <SkeletonLoader className="h-4 rounded-full w-32 mb-1" />
                      <SkeletonLoader className="h-3 rounded-full w-24" />
                    </View>
                  </View>
                  <View className="space-y-2">
                    <SkeletonLoader className="h-3 rounded-full w-full" />
                    <SkeletonLoader className="h-3 rounded-full w-4/5" />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>
);

export default function BarDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [barDetail, setBarDetail] = useState<BarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<FlatList>(null);
  const screenWidth = Dimensions.get('window').width;
  const [drinks, setDrinks] = useState<Drink[]>([]);

  useEffect(() => {
    fetchBarDetail();
    fetchDrinks();
  }, [id]);

  const fetchBarDetail = async () => {
    setLoading(true);
    try {
      const data = await barService.getBarDetail(id as string);
      if (data) {
        setBarDetail(data);
      }
    } catch (error) {
      console.error('Error fetching bar detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrinks = async () => {
    try {
      const data = await drinkService.getDrinks();
      setDrinks(data);
    } catch (error) {
      console.error('Error fetching drinks:', error);
    }
  };

  const getAverageRating = () => {
    if (!barDetail?.feedBacks.length) return 0;
    const sum = barDetail.feedBacks.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / barDetail.feedBacks.length).toFixed(1);
  };

  const images = barDetail?.images ? getImageArray(barDetail.images) : [];

  if (loading) {
    return <BarDetailSkeleton />;
  }

  // Thêm constant cho tỷ lệ 16:9
  const ASPECT_RATIO = 16 / 9;
  const imageHeight = screenWidth / ASPECT_RATIO;

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header cố định */}
        <View className="absolute top-0 left-0 right-0 z-50">
          <SafeAreaView edges={['top']}>
            <View className="px-4 py-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-white/30 backdrop-blur-md p-2 rounded-full w-10 h-10 items-center justify-center"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Thêm View bao bọc ScrollView và Footer */}
        <View className="flex-1">
          <ScrollView 
            className="flex-1" 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }} // Thêm padding bottom để tránh content bị che
          >
            {/* Image Slider */}
            <View className="relative" style={{ height: imageHeight }}>
              <FlatList
                ref={scrollViewRef}
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const newIndex = Math.round(
                    event.nativeEvent.contentOffset.x / screenWidth
                  );
                  setCurrentImageIndex(newIndex);
                }}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={{ 
                      width: screenWidth,
                      height: imageHeight 
                    }}
                    resizeMode="cover"
                  />
                )}
              />
              
              {/* Image Pagination */}
              <View className="absolute bottom-4 w-full flex-row justify-center space-x-2">
                {images.map((_, index) => (
                  <View
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentImageIndex ? 'bg-yellow-500' : 'bg-white/50'
                    }`}
                  />
                ))}
              </View>

              {/* Gradient Overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                className="absolute bottom-0 left-0 right-0 h-32"
              />
            </View>

            {/* Content */}
            <View className="px-6 -mt-20 relative z-10">
              <Animated.View entering={FadeIn} className="space-y-6">
                {/* Header Info */}
                <View>
                  <Text className="text-yellow-500 text-3xl font-bold mb-2">
                    {barDetail?.barName}
                  </Text>
                  <View className="flex-row items-center space-x-4">
                    <View className="flex-row items-center">
                      <Ionicons name="star" size={16} color="#EAB308" />
                      <Text className="text-white ml-1 font-medium">
                        {getAverageRating()}
                      </Text>
                    </View>
                    {(barDetail?.discount ?? 0) > 0 && (
                      <View className="bg-yellow-500/90 px-2 py-1 rounded-full">
                        <Text className="text-black font-bold text-xs">
                          Giảm {barDetail?.discount}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Location & Contact */}
                <View className="space-y-4">
                  <View className="flex-row items-center space-x-3">
                    <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                    <Text className="text-gray-400 flex-1">
                      {barDetail?.address}
                    </Text>
                  </View>
                  <View className="flex-row items-center space-x-3">
                    <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                    <Text className="text-gray-400">
                      {barDetail?.startTime.slice(0,5)} - {barDetail?.endTime.slice(0,5)}
                    </Text>
                  </View>
                  <View className="flex-row items-center space-x-3">
                    <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                    <Text className="text-gray-400">{barDetail?.phoneNumber}</Text>
                  </View>
                  <View className="flex-row items-center space-x-3">
                    <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                    <Text className="text-gray-400">{barDetail?.email}</Text>
                  </View>
                  <View className="flex-row items-center space-x-3">
                    <Ionicons name="ban-outline" size={20} color="#9CA3AF" />
                    <Text className="text-gray-400">Giới hạn độ tuổi: 18+</Text>
                  </View>
                </View>

                {/* Description */}
                <View>
                  <Text className="text-white text-lg font-bold mb-2">Mô tả</Text>
                  <Text className="text-gray-400 leading-5">
                    {barDetail?.description}
                  </Text>
                </View>

                {/* Gallery Images */}
                <View>
                  <Text className="text-white text-lg font-bold mb-4">
                    Không gian
                  </Text>
                  <View className="relative">
                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      data={images}
                      snapToInterval={screenWidth - 48}
                      decelerationRate="fast"
                      onMomentumScrollEnd={(event) => {
                        const newIndex = Math.round(
                          event.nativeEvent.contentOffset.x / (screenWidth - 48)
                        );
                        setCurrentImageIndex(newIndex);
                      }}
                      renderItem={({ item }) => (
                        <View style={{ width: screenWidth - 48 }} className="pr-2">
                          <Image
                            source={{ uri: item }}
                            style={{ 
                              width: screenWidth - 48,
                              height: (screenWidth - 48) / ASPECT_RATIO
                            }}
                            className="rounded-xl"
                            resizeMode="cover"
                          />
                        </View>
                      )}
                    />
                    
                    {/* Pagination Dots */}
                    <View className="mt-4 w-full flex-row justify-center space-x-2">
                      {images.map((_, index) => (
                        <View
                          key={index}
                          className={`w-2 h-2 rounded-full ${
                            index === currentImageIndex ? 'bg-yellow-500' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </View>
                  </View>
                </View>

                {/* Drinks */}
                <View className="mt-8">
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-white text-lg font-bold">
                      Thức uống
                    </Text>
                    <TouchableOpacity>
                      <Text className="text-yellow-500">Xem thêm</Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={drinks}
                    renderItem={({ item }) => (
                      <View className="mr-4 w-40">
                        <Image
                          source={{ uri: item.images.split(',')[0] }}
                          className="w-full h-40 rounded-xl mb-2"
                          resizeMode="cover"
                        />
                        <Text className="text-white font-medium mb-1">
                          {item.drinkName}
                        </Text>
                        <Text className="text-yellow-500 font-bold">
                          {item.price.toLocaleString('vi-VN')}đ
                        </Text>
                      </View>
                    )}
                  />
                </View>

                {/* Reviews */}
                <View className="mt-8">
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-white text-lg font-bold">
                      Đánh giá ({barDetail?.feedBacks.length})
                    </Text>
                    <TouchableOpacity>
                      <Text className="text-yellow-500">Xem tất cả</Text>
                    </TouchableOpacity>
                  </View>
                  {barDetail?.feedBacks.map((feedback, index) => (
                    <View
                      key={index}
                      className="bg-white/5 rounded-xl p-4 mb-3"
                    >
                      <View className="flex-row items-center mb-2">
                        <View className="w-10 h-10 bg-white/10 rounded-full items-center justify-center">
                          <Ionicons name="person" size={20} color="#EAB308" />
                        </View>
                        <View className="ml-3">
                          <Text className="text-white font-medium">
                            {feedback.accountName || 'Khách hàng ẩn danh'}
                          </Text>
                          <View className="flex-row items-center">
                            {[...Array(5)].map((_, i) => (
                              <Ionicons
                                key={i}
                                name="star"
                                size={12}
                                color={i < feedback.rating ? '#EAB308' : '#4B5563'}
                              />
                            ))}
                          </View>
                        </View>
                      </View>
                      <Text className="text-gray-400">{feedback.comment}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            </View>
          </ScrollView>

          {/* Nút Đặt bàn ngay */}
          <View className="absolute bottom-0 left-0 right-0">
            <View className="px-4 py-2">
              <TouchableOpacity
                className="bg-yellow-500 p-3 rounded-xl mx-4 mb-2"
                activeOpacity={0.8}
                onPress={() => {
                  if (barDetail?.barId) {
                    router.push(`/booking-table/${barDetail.barId}` as any);
                  }
                }}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}
              >
                <Text className="text-black font-bold text-center text-lg">
                  Đặt bàn ngay
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
