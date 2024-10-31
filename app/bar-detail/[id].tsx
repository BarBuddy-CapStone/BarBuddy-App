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
import ImageView from 'react-native-image-viewing';

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

// Thêm helper function để lấy tên ngày
const getDayOfWeekText = (dayOfWeek: number) => {
  switch (dayOfWeek) {
    case 0:
      return 'Chủ nhật';
    case 1:
      return 'Thứ 2';
    case 2:
      return 'Thứ 3';
    case 3:
      return 'Thứ 4';
    case 4:
      return 'Thứ 5';
    case 5:
      return 'Thứ 6';
    case 6:
      return 'Thứ 7';
    default:
      return '';
  }
};

// Thêm component OperatingHours
const OperatingHours = ({ barTimes }: { barTimes: BarDetail['barTimeResponses'] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const today = new Date().getDay();
  const timeForToday = barTimes?.find(time => time.dayOfWeek === today);
  
  // Animation
  const animation = useSharedValue(0);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    animation.value = withTiming(isExpanded ? 0 : 1, {
      duration: 300
    });
  };

  const contentStyle = useAnimatedStyle(() => {
    const height = interpolate(
      animation.value,
      [0, 1],
      [0, 360]
    );

    const marginTop = interpolate(
      animation.value,
      [0, 1],
      [0, 8]
    );

    return {
      height,
      marginTop,
      opacity: animation.value,
    };
  });

  // Thêm rotateStyle cho animation xoay icon
  const rotateStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      animation.value,
      [0, 1],
      [0, 180]
    );

    return {
      transform: [{ rotate: `${rotate}deg` }]
    };
  });

  return (
    <View>
      {/* Header - Always visible */}
      <TouchableOpacity 
        onPress={toggleExpand}
        className="flex-row items-center justify-between p-3 rounded-lg bg-white/5"
      >
        <View className="flex-row items-center space-x-2">
          <Ionicons name="time-outline" size={20} color="#9CA3AF" />
          <View>
            <Text className="text-white text-base font-bold">
              Giờ hoạt động
            </Text>
            <Text className="text-gray-400 text-sm">
              {timeForToday 
                ? `Hôm nay: ${timeForToday.startTime.slice(0,5)} - ${timeForToday.endTime.slice(0,5)}`
                : 'Đóng cửa hôm nay'
              }
            </Text>
          </View>
        </View>
        <Animated.View style={rotateStyle}>
          <Ionicons name="chevron-down" size={24} color="#9CA3AF" />
        </Animated.View>
      </TouchableOpacity>

      {/* Dropdown content */}
      <Animated.View style={[contentStyle, { overflow: 'hidden' }]}>
        <View className="space-y-2 px-1">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => {
            const timeForDay = barTimes?.find(time => time.dayOfWeek === day);
            const isToday = today === day;
            
            return (
              <View 
                key={day} 
                className={`flex-row items-center justify-between p-3 rounded-lg ${
                  isToday ? 'bg-yellow-500/20' : 'bg-white/5'
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons 
                    name={isToday ? "today" : "calendar-outline"} 
                    size={20} 
                    color={isToday ? "#EAB308" : "#9CA3AF"} 
                  />
                  <Text className={`ml-2 ${
                    isToday ? 'text-yellow-500 font-bold' : 'text-gray-400'
                  }`}>
                    {getDayOfWeekText(day)}
                  </Text>
                </View>
                <Text className={
                  isToday ? 'text-yellow-500 font-bold' : 'text-gray-400'
                }>
                  {timeForDay 
                    ? `${timeForDay.startTime.slice(0,5)} - ${timeForDay.endTime.slice(0,5)}`
                    : 'Đóng cửa'
                  }
                </Text>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
};

// Thêm hàm kiểm tra quán có mở cửa hôm nay không
const isOpenToday = (barTimes: BarDetail['barTimeResponses']) => {
  const today = new Date().getDay();
  return barTimes.some(time => time.dayOfWeek === today);
};

// Thêm component FeedbackItem
const FeedbackItem = ({ feedback }: { feedback: BarDetail['feedBacks'][0] }) => {
  const [imageError, setImageError] = useState(false);
  const formattedDate = new Date(feedback.createdTime).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <View className="bg-white/5 rounded-xl p-4 mb-3">
      <View className="flex-row items-center mb-3">
        <View className="relative">
          {feedback.imageAccount && !imageError ? (
            <Image
              source={{ uri: feedback.imageAccount }}
              className="w-10 h-10 rounded-full"
              onError={() => setImageError(true)}
            />
          ) : (
            <View className="w-10 h-10 bg-white/10 rounded-full items-center justify-center">
              <Ionicons name="person" size={20} color="#EAB308" />
            </View>
          )}
          {feedback.accountName && (
            <View className="absolute -right-1 -bottom-1 bg-yellow-500 rounded-full p-0.5">
              <Ionicons name="checkmark" size={12} color="black" />
            </View>
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-white font-medium">
            {feedback.accountName || 'Khách hàng ẩn danh'}
          </Text>
          <Text className="text-gray-400 text-xs">{formattedDate}</Text>
        </View>
        <View className="bg-yellow-500/10 px-2 py-1 rounded-lg">
          <View className="flex-row items-center">
            <Ionicons name="star" size={14} color="#EAB308" />
            <Text className="text-yellow-500 font-bold ml-1">
              {feedback.rating.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
      <Text className="text-gray-400 leading-5">{feedback.comment}</Text>
    </View>
  );
};

export default function BarDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [barDetail, setBarDetail] = useState<BarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<FlatList>(null);
  const screenWidth = Dimensions.get('window').width;
  const [drinks, setDrinks] = useState<Drink[]>([]);

  // Thêm state để quản lý modal preview
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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

  // Cập nhật hàm getAverageRating
  const getAverageRating = () => {
    if (!barDetail?.feedBacks.length) return null;
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

  // Chuyển đổi mảng ảnh sang định dạng phù hợp với ImageView
  const imageViewImages = images.map(uri => ({ uri }));

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
                    {/* Rating */}
                    <View className="flex-row items-center">
                      <Ionicons name="star" size={16} color="#EAB308" />
                      <Text className="text-white ml-1 font-medium">
                        {getAverageRating() ?? 'Chưa có đánh giá'}
                      </Text>
                    </View>

                    {/* Discount badge */}
                    {(barDetail?.discount ?? 0) > 0 && (
                      <View className="bg-yellow-500/90 px-2.5 py-1 rounded-full">
                        <Text className="text-black font-bold text-xs">
                          Giảm {barDetail?.discount}%
                        </Text>
                      </View>
                    )}

                    {/* Table availability badge - chỉ hiển thị khi quán mở cửa hôm nay */}
                    {barDetail && isOpenToday(barDetail.barTimeResponses) && (
                      <View 
                        className={`px-2.5 py-1 rounded-full ${
                          barDetail.isAnyTableAvailable ? 'bg-green-500/90' : 'bg-red-500/90'
                        }`}
                      >
                        <Text className="text-white font-bold text-xs">
                          {barDetail.isAnyTableAvailable ? 'Còn bàn hôm nay' : 'Hết bàn hôm nay'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Location & Contact */}
                <View className="space-y-4">
                  <View className="flex-row items-center space-x-3 mb-2">
                    <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                    <Text className="text-gray-400 flex-1">
                      {barDetail?.address}
                    </Text>
                  </View>
                  
                  {/* Thêm component OperatingHours vào đây */}
                  <OperatingHours barTimes={barDetail?.barTimeResponses || []} />
                  
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
                      renderItem={({ item, index }) => (
                        <TouchableOpacity 
                          activeOpacity={0.9}
                          onPress={() => {
                            setSelectedImageIndex(index);
                            setIsImageViewVisible(true);
                          }}
                          style={{ width: screenWidth - 48 }} 
                          className="pr-2"
                        >
                          <Image
                            source={{ uri: item }}
                            style={{ 
                              width: screenWidth - 48,
                              height: (screenWidth - 48) / ASPECT_RATIO
                            }}
                            className="rounded-xl"
                            resizeMode="cover"
                          />
                          {/* Thêm overlay mờ và icon để chỉ ra ảnh có thể click */}
                          <View className="absolute inset-0 bg-black/10 rounded-xl items-center justify-center">
                            <View className="bg-black/30 rounded-full p-2">
                              <Ionicons name="expand-outline" size={20} color="white" />
                            </View>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                    
                    {/* Pagination Dots giữ nguyên */}
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

                {/* Image Viewer Modal */}
                <ImageView
                  images={imageViewImages}
                  imageIndex={selectedImageIndex}
                  visible={isImageViewVisible}
                  onRequestClose={() => setIsImageViewVisible(false)}
                  swipeToCloseEnabled={true}
                  doubleTapToZoomEnabled={true}
                  presentationStyle="overFullScreen"
                  animationType="fade"
                  HeaderComponent={({ imageIndex }) => (
                    <SafeAreaView edges={['top']}>
                      <View className="w-full flex-row justify-between items-center px-4 py-2">
                        <TouchableOpacity
                          onPress={() => setIsImageViewVisible(false)}
                          className="bg-black/50 rounded-full p-2"
                        >
                          <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white font-medium">
                          {imageIndex + 1} / {images.length}
                        </Text>
                      </View>
                    </SafeAreaView>
                  )}
                />

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
                      Đánh giá ({barDetail?.feedBacks.length || 0})
                    </Text>
                    {barDetail?.feedBacks.length ? (
                      <TouchableOpacity>
                        <Text className="text-yellow-500">Xem tất cả</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  
                  {barDetail?.feedBacks.length ? (
                    barDetail.feedBacks
                      .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime())
                      .slice(0, 3)
                      .map((feedback, index) => (
                        <FeedbackItem key={index} feedback={feedback} />
                      ))
                  ) : (
                    <View className="bg-white/5 rounded-xl p-4 items-center">
                      <Ionicons name="star-outline" size={40} color="#9CA3AF" />
                      <Text className="text-gray-400 mt-2 text-center">
                        Chưa có đánh giá nào
                      </Text>
                      <Text className="text-gray-500 text-sm text-center mt-1">
                        Hãy là người đầu tiên đánh giá quán bar này
                      </Text>
                    </View>
                  )}
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
