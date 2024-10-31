import { View, Text, ScrollView, Image, TouchableOpacity, FlatList, Dimensions, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
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
import { drinkService, type Drink, DrinkCategory } from '@/services/drink';
import ImageView from 'react-native-image-viewing';
import Modal from 'react-native-modal';
import { useAuth } from '@/contexts/AuthContext';

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

const BarDetailSkeleton = () => {
  const router = useRouter();
  
  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header cố định với nút back */}
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

        {/* Rest of skeleton content */}
        <View className="h-56 bg-white/10" />
        <View className="px-6 space-y-4">
          <View className="w-2/3 h-8 bg-white/10 rounded-lg mt-4" />
          <View className="w-1/2 h-6 bg-white/10 rounded-lg" />
          <View className="space-y-2">
            <View className="w-full h-4 bg-white/10 rounded-lg" />
            <View className="w-full h-4 bg-white/10 rounded-lg" />
            <View className="w-3/4 h-4 bg-white/10 rounded-lg" />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

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
        className="flex-row items-center justify-between p-3 rounded-lg bg-white/5 my-2"
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
const FeedbackItem = memo(({ feedback }: { feedback: BarDetail['feedBacks'][0] }) => {
  const [imageError, setImageError] = useState(false);
  const formattedDate = useMemo(() => {
    return new Date(feedback.createdTime).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [feedback.createdTime]);

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
});

// Thêm component FilterButton
const FilterButton = ({ 
  rating, 
  isSelected, 
  onPress 
}: { 
  rating: number; 
  isSelected: boolean; 
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-row items-center px-3 py-1.5 rounded-full border ${
      isSelected ? 'bg-yellow-500 border-yellow-500' : 'border-gray-500'
    }`}
  >
    <Text className={`mr-1 font-medium ${isSelected ? 'text-black' : 'text-white'}`}>
      {rating}
    </Text>
    <Ionicons 
      name="star" 
      size={14} 
      color={isSelected ? '#000' : '#9CA3AF'} 
    />
  </TouchableOpacity>
);

// Thêm component DrinkItem
const DrinkItem = ({ 
  drink, 
  onPress 
}: { 
  drink: Drink;
  onPress?: () => void;
}) => (
  <TouchableOpacity 
    onPress={onPress}
    activeOpacity={0.7}
    className="flex-row bg-white/5 rounded-xl p-4 mb-3"
  >
    <Image
      source={{ uri: drink.images.split(',')[0] }}
      className="w-24 h-24 rounded-lg"
      resizeMode="cover"
    />
    <View className="flex-1 ml-4 justify-between">
      <View>
        <Text className="text-white font-bold text-lg">
          {drink.drinkName}
        </Text>
        <Text className="text-gray-400 text-sm mt-1">
          {drink.description}
        </Text>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-yellow-500 font-bold">
          {drink.price.toLocaleString('vi-VN')}đ
        </Text>
        <View className="bg-white/10 px-3 py-1 rounded-full">
          <Text className="text-gray-300 text-sm">
            {drink.drinkCategoryResponse.drinksCategoryName}
          </Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

// Components con
const DrinkDetailSkeleton = () => (
  <View className="p-4">
    <View className="w-full h-48 bg-white/10 rounded-xl mb-4" />
    <View className="w-3/4 h-6 bg-white/10 rounded-full mb-2" />
    <View className="w-1/4 h-6 bg-white/10 rounded-full mb-4" />
    <View className="w-full h-20 bg-white/10 rounded-xl mb-4" />
    <View className="flex-row flex-wrap gap-2">
      <View className="w-20 h-8 bg-white/10 rounded-full" />
      <View className="w-20 h-8 bg-white/10 rounded-full" />
    </View>
  </View>
);

const DrinkDetailContent = ({ drink }: { drink: Drink }) => {
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const images = useMemo(() => getImageArray(drink.images), [drink.images]);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Hero Image với Gradient Overlay */}
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => setIsImageViewVisible(true)}
      >
        <View className="relative">
          <Image
            source={{ uri: images[0] }}
            className="w-full h-56"
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            className="absolute bottom-0 left-0 right-0 h-20"
          />
          {/* Icon chỉ ra ảnh có thể click */}
          <View className="absolute right-4 bottom-4 bg-black/50 rounded-full p-2">
            <Ionicons name="expand-outline" size={20} color="white" />
          </View>
        </View>
      </TouchableOpacity>

      <View className="p-4">
        {/* Tên và Giá */}
        <View className="mb-6">
          <Text className="text-white text-2xl font-bold mb-2">
            {drink.drinkName}
          </Text>
          <Text className="text-yellow-500 text-xl font-bold">
            {drink.price.toLocaleString('vi-VN')}đ
          </Text>
        </View>

        {/* Thông tin chi tiết */}
        <View className="bg-white/5 rounded-xl p-4 mb-6">
          <Text className="text-white font-medium mb-2">Mô tả:</Text>
          <Text className="text-gray-400 leading-6">
            {drink.description}
          </Text>
        </View>

        {/* Danh mục */}
        <View className="mb-6">
          <Text className="text-white font-medium mb-2">Danh mục:</Text>
          <View className="bg-yellow-500/20 px-4 py-2 rounded-full self-start">
            <Text className="text-yellow-500 font-medium">
              {drink.drinkCategoryResponse.drinksCategoryName}
            </Text>
          </View>
        </View>

        {/* Tâm trạng phù hợp */}
        {drink.emotionsDrink.length > 0 && (
          <View>
            <Text className="text-white font-medium mb-3">
              Phù hợp với tâm trạng:
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {drink.emotionsDrink.map((emotion) => (
                <View 
                  key={emotion.emotionalDrinksCategoryId}
                  className="bg-white/10 px-4 py-2 rounded-full"
                >
                  <Text className="text-gray-300 capitalize">
                    {emotion.categoryName}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Image Viewer Modal */}
      <ImageView
        images={images.map(uri => ({ uri }))}
        imageIndex={0}
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
    </ScrollView>
  );
};

// Sửa lại DrinkDetailModal
const DrinkDetailModal = memo(({
  isVisible,
  onClose,
  drink
}: {
  isVisible: boolean;
  onClose: () => void;
  drink: Drink | null
}) => {
  if (!drink) return null;

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      style={{ margin: 0 }}
      statusBarTranslucent
      useNativeDriverForBackdrop
      onSwipeComplete={onClose}
      swipeDirection="down"
      propagateSwipe={true}
    >
      <View className="flex-1 mt-16 bg-black rounded-t-3xl">
        <View className="items-center pt-4 pb-2">
          <View className="w-12 h-1 bg-white/20 rounded-full" />
        </View>

        <View className="flex-row justify-between items-center px-4 pb-4 border-b border-white/10">
          <Text className="text-white text-lg font-bold">
            Chi tiết thức uống
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView bounces={false}>
          <DrinkDetailContent drink={drink} />
        </ScrollView>
      </View>
    </Modal>
  );
});

// Thêm helper function để tính rating trung bình
const getAverageRating = (feedbacks: BarDetail['feedBacks']) => {
  if (!feedbacks || feedbacks.length === 0) return 0;
  
  const sum = feedbacks.reduce((acc, feedback) => acc + feedback.rating, 0);
  return Number((sum / feedbacks.length).toFixed(1));
};

// Thêm helper function để đếm số lượng đánh giá theo rating
const getRatingCount = (feedbacks: BarDetail['feedBacks'], rating: number) => {
  if (!feedbacks) return 0;
  return feedbacks.filter(feedback => feedback.rating === rating).length;
};

// Tách ReviewModal thành component riêng như DrinkDetailModal
const ReviewModal = memo(({
  isVisible,
  onClose,
  feedbacks,
  selectedRating,
  setSelectedRating
}: {
  isVisible: boolean;
  onClose: () => void;
  feedbacks: BarDetail['feedBacks'];
  selectedRating: number | null;
  setSelectedRating: (rating: number | null) => void;
}) => {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      style={{ margin: 0 }}
      statusBarTranslucent
      useNativeDriverForBackdrop
    >
      <View className="flex-1 mt-16 bg-black rounded-t-3xl">
        {/* Header cố định */}
        <View className="border-b border-white/10">
          <View className="px-4 py-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-lg font-bold">
                Tất cả đánh giá
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Rating filters */}
          <View className="px-4 pb-4">
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="flex-row space-x-2"
            >
              <TouchableOpacity
                onPress={() => setSelectedRating(null)}
                className={`px-4 py-2 rounded-full border ${
                  !selectedRating ? 'bg-yellow-500 border-yellow-500' : 'border-gray-500'
                }`}
              >
                <Text className={!selectedRating ? 'text-black' : 'text-white'}>
                  Tất cả
                </Text>
              </TouchableOpacity>
              {[5, 4, 3, 2, 1].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  onPress={() => setSelectedRating(rating)}
                  className={`px-4 py-2 rounded-full border ${
                    selectedRating === rating 
                      ? 'bg-yellow-500 border-yellow-500' 
                      : 'border-gray-500'
                  }`}
                >
                  <Text className={
                    selectedRating === rating 
                      ? 'text-black' 
                      : 'text-white'
                  }>
                    {rating} sao
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Danh sách đánh giá */}
        <FlatList<BarDetail['feedBacks'][0]>
          data={feedbacks}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <View className="px-4">
              <FeedbackItem feedback={item} />
            </View>
          )}
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
        />
      </View>
    </Modal>
  );
});

// Cập nhật AuthModal component
const AuthModal = ({ isVisible, onClose, onLogin, onRegister }: {
  isVisible: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) => (
  <Modal
    isVisible={isVisible}
    onBackdropPress={onClose}
    onSwipeComplete={onClose}
    swipeDirection={['down']}
    propagateSwipe={true}
    statusBarTranslucent
    style={{
      justifyContent: 'flex-end',
      margin: 0,
    }}
  >
    <View className="bg-neutral-900 rounded-t-3xl max-h-[90%]">
      <View className="items-center pt-4 pb-2">
        <View className="w-16 h-1 bg-white/20 rounded-full" />
      </View>
      
      <ScrollView bounces={false}>
        <View className="p-6">
          <View className="items-center mb-6">
            <Ionicons name="lock-closed-outline" size={64} color="#EAB308" />
          </View>
          <Text className="text-white text-xl font-bold text-center mb-2">
            Yêu cầu đăng nhập
          </Text>
          <Text className="text-gray-400 text-center mb-6">
            Vui lòng đăng nhập với tài khoản khách hàng để đặt bàn
          </Text>
          
          <TouchableOpacity
            className="bg-yellow-500 w-full py-4 rounded-xl mb-3"
            onPress={onLogin}
          >
            <Text className="text-black font-bold text-center text-lg">
              Đăng nhập ngay
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white/5 w-full py-4 rounded-xl border border-white/10"
            onPress={onRegister}
          >
            <Text className="text-white font-bold text-center text-lg">
              Đăng ký tài khoản
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  </Modal>
);

// 2. Component chính
export default function BarDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const screenWidth = Dimensions.get('window').width;
  const ASPECT_RATIO = 1.5;
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const imageSliderRef = useRef<FlatList>(null);
  
  // States
  const [barDetail, setBarDetail] = useState<BarDetail | null>(null);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null>(null);
  const [isDrinkModalVisible, setIsDrinkModalVisible] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isDrinkDetailModalVisible, setIsDrinkDetailModalVisible] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Memoized values
  const images = useMemo(() => {
    return barDetail?.images ? getImageArray(barDetail.images) : [];
  }, [barDetail?.images]);

  const imageViewImages = useMemo(() => {
    return images.map(uri => ({ uri }));
  }, [images]);

  const averageRating = useMemo(() => {
    return getAverageRating(barDetail?.feedBacks || []);
  }, [barDetail?.feedBacks]);

  const getFilteredDrinks = useCallback(() => {
    if (!drinks) return [];
    if (!selectedCategory) return drinks;
    return drinks.filter(drink => 
      drink.drinkCategoryResponse.drinksCategoryId === selectedCategory
    );
  }, [drinks, selectedCategory]);

  const drinkCategories = useMemo(() => {
    if (!drinks) return [];
    const uniqueCategories = new Map();
    
    drinks.forEach(drink => {
      const category = drink.drinkCategoryResponse;
      if (!uniqueCategories.has(category.drinksCategoryId)) {
        uniqueCategories.set(category.drinksCategoryId, {
          id: category.drinksCategoryId,
          name: category.drinksCategoryName
        });
      }
    });
    
    return Array.from(uniqueCategories.values());
  }, [drinks]);

  // Handlers
  const handleSelectDrink = useCallback((drinkId: string) => {
    setSelectedDrinkId(drinkId);
  }, []);

  const getFilteredFeedbacks = useCallback(() => {
    if (!barDetail?.feedBacks) return [];
    
    let filtered = [...barDetail.feedBacks].sort(
      (a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
    );
    
    if (selectedRating) {
      filtered = filtered.filter(feedback => feedback.rating === selectedRating);
    }
    
    return filtered;
  }, [barDetail?.feedBacks, selectedRating]);

  const handleSelectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
  }, []);

  // Effects
  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [barData, drinksData] = await Promise.all([
          barService.getBarDetail(id),
          drinkService.getDrinks(id)
        ]);
        
        setBarDetail(barData);
        setDrinks(drinksData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleOpenDrinkDetail = (drink: Drink) => {
    setSelectedDrink(drink);
    setIsDrinkDetailModalVisible(true);
  };

  // Thêm state và hooks cần thiết
  const { isAuthenticated, user, isGuest } = useAuth();
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);

  // Cập nhật hàm handleBooking
  const handleBooking = () => {
    // Kiểm tra xem người dùng đã đăng nhập và là CUSTOMER hay chưa
    if (!isAuthenticated || !user || user.role !== 'CUSTOMER' || isGuest) {
      setIsAuthModalVisible(true);
      return;
    }
    
    // Nếu đã đăng nhập và là CUSTOMER thì cho phép đặt bàn
    if (barDetail?.barId) {
      router.push(`/booking-table/${barDetail.barId}` as any);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header nút back luôn nổi phía trên */}
        <View className="absolute top-0 left-0 right-0 z-50">
          <SafeAreaView edges={['top']}>
            <View className="px-4 py-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-black/30 backdrop-blur-md p-2 rounded-full w-10 h-10 items-center justify-center"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {isLoading ? (
          <BarDetailSkeleton />
        ) : (
          // Nội dung hiện tại của component
          <View className="flex-1">
            {/* Bỏ stickyHeaderIndices */}
            <ScrollView 
              ref={scrollViewRef}
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 80 }}
            >
              {/* Image Slider */}
              <View className="relative" style={{ height: screenWidth / ASPECT_RATIO }}>
                <FlatList
                  ref={imageSliderRef}
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
                        height: screenWidth / ASPECT_RATIO 
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
                          {averageRating ?? 'Chưa có đánh giá'}
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
                    
                    
                    {/* Thêm component OperatingHours vào đây */}
                    <OperatingHours barTimes={barDetail?.barTimeResponses || []} />
                    
                    <View className="flex-row items-center space-x-3">
                      <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                      <Text className="text-gray-400 flex-1">
                        {barDetail?.address}
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
                      {drinks.length > 5 && (
                        <TouchableOpacity 
                          onPress={() => setIsDrinkModalVisible(true)}
                          className="active:opacity-70"
                        >
                          <Text className="text-yellow-500">Xem thêm</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {drinks.length === 0 ? (
                      <View className="bg-white/5 rounded-xl p-6 items-center">
                        <View className="bg-white/10 p-4 rounded-full mb-4">
                          <Ionicons name="wine-outline" size={40} color="#9CA3AF" />
                        </View>
                        <Text className="text-gray-300 text-lg font-medium text-center">
                          Quán chưa cập nhật menu
                        </Text>
                        <Text className="text-gray-500 text-sm text-center mt-2 max-w-[250px]">
                          Menu đang được cập nhật. Vui lòng quay lại sau hoặc liên hệ trực tiếp với quán để biết thêm chi tiết.
                        </Text>
                        
                        {/* Nút liên hệ */}
                        {barDetail?.phoneNumber && (
                          <TouchableOpacity 
                            className="mt-4 flex-row items-center bg-yellow-500/10 px-4 py-2 rounded-full"
                            onPress={() => Linking.openURL(`tel:${barDetail.phoneNumber}`)}
                          >
                            <Ionicons name="call-outline" size={20} color="#EAB308" />
                            <Text className="text-yellow-500 ml-2 font-medium">
                              Liên hệ quán
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={drinks.slice(0, 5)}
                        renderItem={({ item }) => (
                          <TouchableOpacity 
                            className="mr-4 w-40"
                            onPress={() => handleOpenDrinkDetail(item)}
                          >
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
                          </TouchableOpacity>
                        )}
                      />
                    )}

                    {/* Drinks Modal */}
                    <DrinkDetailModal
                      isVisible={isDrinkDetailModalVisible}
                      drink={selectedDrink}
                      onClose={() => {
                        setIsDrinkDetailModalVisible(false);
                        setSelectedDrink(null);
                      }}
                    />

                    {/* Drinks Modal */}
                    <Modal
                      isVisible={isDrinkModalVisible}
                      onBackdropPress={() => {
                        setIsDrinkModalVisible(false);
                        setSelectedCategory(null);
                      }}
                      className="m-0 mt-16"
                      style={{ margin: 0 }}
                      statusBarTranslucent
                      useNativeDriverForBackdrop
                    >
                      <View className="flex-1 bg-black rounded-t-3xl">
                        {/* Header */}
                        <View className="p-4 border-b border-white/10">
                          {/* Bỏ thanh trượt */}
                          <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-white text-lg font-bold">
                              Tất cả thức uống
                            </Text>
                            <TouchableOpacity 
                              onPress={() => {
                                setIsDrinkModalVisible(false);
                                setSelectedCategory(null);
                              }}
                              className="active:opacity-70"
                            >
                              <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                          </View>

                          {/* Category Filters */}
                          <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            className="flex-row space-x-2"
                          >
                            <TouchableOpacity
                              onPress={() => setSelectedCategory(null)}
                              className={`px-4 py-2 rounded-full border ${
                                !selectedCategory ? 'bg-yellow-500 border-yellow-500' : 'border-gray-500'
                              }`}
                            >
                              <Text className={!selectedCategory ? 'text-black' : 'text-white'}>
                                Tất cả
                              </Text>
                            </TouchableOpacity>
                            {drinkCategories.map((category) => (
                              <TouchableOpacity
                                key={category.id}
                                onPress={() => setSelectedCategory(category.id)}
                                className={`px-4 py-2 rounded-full border ${
                                  selectedCategory === category.id 
                                    ? 'bg-yellow-500 border-yellow-500' 
                                    : 'border-gray-500'
                                }`}
                              >
                                <Text className={
                                  selectedCategory === category.id 
                                    ? 'text-black' 
                                    : 'text-white'
                                }>
                                  {category.name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        {/* Drinks List */}
                        <ScrollView 
                          className="flex-1 px-4"
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={false}
                        >
                          {getFilteredDrinks().length > 0 ? (
                            getFilteredDrinks().map((drink) => (
                              <DrinkItem 
                                key={drink.drinkId} 
                                drink={drink}
                                onPress={() => handleOpenDrinkDetail(drink)}
                              />
                            ))
                          ) : (
                            <View className="py-8 items-center">
                              <Ionicons name="wine-outline" size={40} color="#9CA3AF" />
                              <Text className="text-gray-400 mt-2 text-center">
                                Không có thức uống nào
                              </Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    </Modal>
                  </View>

                  {/* Reviews */}
                  <View className="mt-8 mb-4">
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-white text-lg font-bold">
                        Đánh giá ({barDetail?.feedBacks?.length || 0})
                      </Text>
                      {barDetail?.feedBacks && barDetail.feedBacks.length > 0 && (
                        <TouchableOpacity 
                          onPress={() => setIsReviewModalVisible(true)}
                          className="active:opacity-70"
                        >
                          <Text className="text-yellow-500">Xem tất cả</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Hiển thị 3 đánh giá gần nhất */}
                    {barDetail?.feedBacks && barDetail.feedBacks.length > 0 ? (
                      [...barDetail.feedBacks]
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

                    {/* Modal Reviews */}
                    <ReviewModal 
                      isVisible={isReviewModalVisible}
                      onClose={() => {
                        setIsReviewModalVisible(false);
                        setSelectedRating(null);
                      }}
                      feedbacks={getFilteredFeedbacks()}
                      selectedRating={selectedRating}
                      setSelectedRating={setSelectedRating}
                    />
                  </View>
                </Animated.View>
              </View>
            </ScrollView>

            {/* Nút Đặt bàn ngay */}
            <View className="absolute bottom-0 left-0 right-0">
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,1)']}
                className="absolute inset-0"
              />
              <View className="px-4 py-2">
                <TouchableOpacity
                  className="bg-yellow-500 p-3 rounded-xl mx-4 mb-2"
                  activeOpacity={0.8}
                  onPress={handleBooking}
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
        )}
      </SafeAreaView>

      <AuthModal 
        isVisible={isAuthModalVisible}
        onClose={() => setIsAuthModalVisible(false)}
        onLogin={() => {
          setIsAuthModalVisible(false);
          router.push('/login');
        }}
        onRegister={() => {
          setIsAuthModalVisible(false);
          router.push('/register');
        }}
      />
    </View>
  );
}
