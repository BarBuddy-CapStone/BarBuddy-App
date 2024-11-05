import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  useAnimatedScrollHandler,
  Extrapolation,
} from "react-native-reanimated";
import { barService, type BarDetail } from "@/services/bar";
import { drinkService, type Drink, DrinkCategory } from "@/services/drink";
import ImageView from "react-native-image-viewing";
import Modal from "react-native-modal";
import { useAuth } from "@/contexts/AuthContext";
import { formatRating } from '@/utils/rating';

// Thêm hàm xử lý images
const getImageArray = (imagesString: string): string[] => {
  return imagesString
    .split(",")
    .map((img) => img.trim())
    .filter((img) => img !== "");
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
        style={[
          {
            width: "100%",
            height: "100%",
            position: "absolute",
            backgroundColor: "transparent",
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.3)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flex: 1,
            width: "100%",
          }}
          locations={[0.1, 0.5, 0.9]}
        />
      </Animated.View>
    </View>
  );
};

const BarDetailSkeleton = () => {
  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
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
      return "Chủ nhật";
    case 1:
      return "Thứ 2";
    case 2:
      return "Thứ 3";
    case 3:
      return "Thứ 4";
    case 4:
      return "Thứ 5";
    case 5:
      return "Thứ 6";
    case 6:
      return "Thứ 7";
    default:
      return "";
  }
};

// Thêm component OperatingHours
const OperatingHours = ({
  barTimes,
}: {
  barTimes: BarDetail["barTimeResponses"];
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const today = new Date().getDay();
  const timeForToday = barTimes?.find((time) => time.dayOfWeek === today);

  // Animation
  const animation = useSharedValue(0);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    animation.value = withTiming(isExpanded ? 0 : 1, {
      duration: 300,
    });
  };

  const contentStyle = useAnimatedStyle(() => {
    const height = interpolate(animation.value, [0, 1], [0, 360]);

    const marginTop = interpolate(animation.value, [0, 1], [0, 8]);

    return {
      height,
      marginTop,
      opacity: animation.value,
    };
  });

  // Thêm rotateStyle cho animation xoay icon
  const rotateStyle = useAnimatedStyle(() => {
    const rotate = interpolate(animation.value, [0, 1], [0, 180]);

    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  return (
    <View>
      {/* Header - Always visible */}
      <TouchableOpacity
        onPress={toggleExpand}
        className="flex-row items-center justify-between p-3 rounded-lg bg-neutral-900 my-2"
      >
        <View className="flex-row items-center space-x-2">
          <Ionicons name="time-outline" size={20} color="#9CA3AF" />
          <View>
            <Text className="text-white text-base font-bold">
              Giờ hoạt động
            </Text>
            <Text className="text-gray-400 text-sm">
              {timeForToday
                ? `Hôm nay: ${timeForToday.startTime.slice(
                    0,
                    5
                  )} - ${timeForToday.endTime.slice(0, 5)}`
                : "Đóng cửa hôm nay"}
            </Text>
          </View>
        </View>
        <Animated.View style={rotateStyle}>
          <Ionicons name="chevron-down" size={24} color="#9CA3AF" />
        </Animated.View>
      </TouchableOpacity>

      {/* Dropdown content */}
      <Animated.View style={[contentStyle, { overflow: "hidden" }]}>
        <View className="space-y-2 px-1">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => {
            const timeForDay = barTimes?.find((time) => time.dayOfWeek === day);
            const isToday = today === day;

            return (
              <View
                key={day}
                className={`flex-row items-center justify-between p-3 rounded-lg ${
                  isToday ? "bg-yellow-500/20" : "bg-neutral-900"
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name={isToday ? "today" : "calendar-outline"}
                    size={20}
                    color={isToday ? "#EAB308" : "#9CA3AF"}
                  />
                  <Text
                    className={`ml-2 ${
                      isToday ? "text-yellow-500 font-bold" : "text-gray-400"
                    }`}
                  >
                    {getDayOfWeekText(day)}
                  </Text>
                </View>
                <Text
                  className={
                    isToday ? "text-yellow-500 font-bold" : "text-gray-400"
                  }
                >
                  {timeForDay
                    ? `${timeForDay.startTime.slice(
                        0,
                        5
                      )} - ${timeForDay.endTime.slice(0, 5)}`
                    : "Đóng cửa"}
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
const isOpenToday = (barTimes: BarDetail["barTimeResponses"]) => {
  const today = new Date().getDay();
  return barTimes.some((time) => time.dayOfWeek === today);
};

// Thêm component FeedbackItem
const FeedbackItem = memo(
  ({ feedback }: { feedback: BarDetail["feedBacks"][0] }) => {
    const [imageError, setImageError] = useState(false);
    
    // Cập nhật formattedDate để hiển thị cả giờ và phút
    const formattedDate = useMemo(() => {
      const date = new Date(feedback.createdTime);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      return `lúc ${hours}:${minutes} - ${day} tháng ${month}, ${year}`;
    }, [feedback.createdTime]);

    // Tạo mảng sao dựa trên rating
    const stars = useMemo(() => {
      return Array.from({ length: 5 }, (_, index) => index < feedback.rating);
    }, [feedback.rating]);

    return (
      <View className="bg-neutral-900 rounded-xl p-4 mb-3">
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
              {feedback.accountName || "Khách hàng ẩn danh"}
            </Text>
            <Text className="text-gray-400 text-xs">{formattedDate}</Text>
          </View>
          <View className="bg-yellow-500/10 px-2 py-1 rounded-lg">
            <View className="flex-row items-center">
              {stars.map((filled, index) => (
                <Ionicons
                  key={index}
                  name="star"
                  size={12}
                  color={filled ? "#EAB308" : "#4B5563"}
                />
              ))}
            </View>
          </View>
        </View>
        <Text className="text-gray-400 leading-5">{feedback.comment}</Text>
      </View>
    );
  }
);

// Thêm component FilterButton
const FilterButton = ({
  rating,
  isSelected,
  onPress,
  count
}: {
  rating: number;
  isSelected: boolean;
  onPress: () => void;
  count: number;
}) => (
  <TouchableOpacity
    onPress={onPress}
    className={`mr-2 px-4 py-2 rounded-full ${
      isSelected ? "bg-yellow-500" : "bg-neutral-900"
    }`}
  >
    <View className="flex-row items-center">
      <Text className={`${isSelected ? "text-black font-bold" : "text-white"}`}>
        {rating} <Ionicons name="star" size={14} color={isSelected ? "#000" : "#9CA3AF"} />
      </Text>
      {isSelected && (
        <View className="bg-black/20 px-2 py-0.5 rounded-full ml-2">
          <Text className="text-black text-xs font-medium">
            {count}
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

// 1. Tối ưu DrinkItem component
const DrinkItem = memo(({ 
  drink, 
  onPress 
}: { 
  drink: Drink; 
  onPress: () => void;
}) => {
  // Sử dụng useMemo cho images array
  const images = useMemo(() => getImageArray(drink.images), [drink.images]);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center p-3 mb-3 bg-neutral-900 rounded-xl active:opacity-70"
    >
      <Image
        source={{ uri: images[0] }}
        className="w-20 h-20 rounded-lg"
        resizeMode="cover"
      />
      
      <View className="flex-1 ml-3">
        <Text 
          numberOfLines={1} 
          ellipsizeMode="tail"
          className="text-white font-medium mb-1"
        >
          {drink.drinkName}
        </Text>
        
        <Text 
          numberOfLines={2}
          ellipsizeMode="tail"
          className="text-gray-400 text-sm min-h-[40px]"
        >
          {drink.description || "Chưa có mô tả"}
        </Text>
        
        <Text className="text-yellow-500 font-bold mt-1">
          {drink.price.toLocaleString("vi-VN")}đ
        </Text>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.drink.drinkId === nextProps.drink.drinkId;
});

// 2. Tối ưu danh sách drinks trong modal
const DrinksList = memo(({
  drinks,
  onDrinkPress
}: {
  drinks: Drink[];
  onDrinkPress: (drink: Drink) => void;
}) => {
  if (drinks.length === 0) {
    return (
      <View className="py-8 items-center">
        <Ionicons name="wine-outline" size={40} color="#9CA3AF" />
        <Text className="text-gray-400 mt-2 text-center">
          Không có thức uống nào
        </Text>
      </View>
    );
  }

  return (
    <>
      {drinks.map((drink) => (
        <DrinkItem
          key={drink.drinkId}
          drink={drink}
          onPress={() => onDrinkPress(drink)}
        />
      ))}
    </>
  );
});

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

// Tách DrinkDetailContent thành component riêng
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
            colors={["transparent", "rgba(0,0,0,0.7)"]}
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
            {drink.price.toLocaleString("vi-VN")}đ
          </Text>
        </View>

        {/* Thông tin chi tiết */}
        <View className="bg-neutral-900 rounded-xl p-4 mb-6">
          <Text className="text-white font-medium mb-2">Mô tả:</Text>
          <Text className="text-gray-400 leading-6">{drink.description}</Text>
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
        images={images.map((uri) => ({ uri }))}
        imageIndex={0}
        visible={isImageViewVisible}
        onRequestClose={() => setIsImageViewVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
        presentationStyle="overFullScreen"
        animationType="fade"
        HeaderComponent={({ imageIndex }) => (
          <SafeAreaView edges={["top"]}>
            <View className="w-full flex-row justify-between items-center px-4 py-2 mt-16">
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

// Cập nhật DrinkDetailModal
const DrinkDetailModal = memo(
  ({
    isVisible,
    onClose,
    drink,
    isTransitioning,
  }: {
    isVisible: boolean;
    onClose: () => void;
    drink: Drink | null;
    isTransitioning: boolean;
  }) => {
    const [isClosing, setIsClosing] = useState(false);

    // Hàm xử lý đóng modal
    const handleClose = useCallback(() => {
      setIsClosing(true);
    }, []);

    if (!drink || isTransitioning) return null;

    return (
      <Modal
        isVisible={isVisible && !isClosing}
        onBackdropPress={handleClose}
        style={{ margin: 0 }}
        statusBarTranslucent
        useNativeDriverForBackdrop
        onSwipeComplete={handleClose}
        swipeDirection="down"
        propagateSwipe={true}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        animationInTiming={250}
        animationOutTiming={200}
        backdropTransitionOutTiming={0}
        hideModalContentWhileAnimating={true}
        onModalHide={() => {
          if (isClosing) {
            setIsClosing(false);
            onClose();
          }
        }}
      >
        <View className="flex-1 mt-16 bg-black rounded-t-3xl">
          <View className="items-center pt-4 pb-2">
            <View className="w-12 h-1 bg-white/20 rounded-full" />
          </View>

          <View className="flex-row justify-between items-center px-4 pb-4 border-b border-white/10">
            <Text className="text-white text-lg font-bold">
              Chi tiết thức uống
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView bounces={false}>
            <DrinkDetailContent drink={drink} />
          </ScrollView>
        </View>
      </Modal>
    );
  }
);

// Thêm helper function để tính rating trung bình
const getAverageRating = (feedbacks: BarDetail["feedBacks"]) => {
  if (!feedbacks || feedbacks.length === 0) return 0;

  const sum = feedbacks.reduce((acc, feedback) => acc + feedback.rating, 0);
  return Number((sum / feedbacks.length).toFixed(1));
};

// Thêm helper function để đếm số lượng đánh giá theo rating
const getRatingCount = (feedbacks: BarDetail["feedBacks"], rating: number) => {
  if (!feedbacks) return 0;
  return feedbacks.filter((feedback) => feedback.rating === rating).length;
};

// Tách ReviewModal thành component riêng như DrinkDetailModal
const ReviewModal = memo(
  ({
    isVisible,
    onClose,
    feedbacks,
    selectedRating,
    setSelectedRating,
  }: {
    isVisible: boolean;
    onClose: () => void;
    feedbacks: BarDetail["feedBacks"];
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
            <View className="px-4">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
              >
                <TouchableOpacity
                  onPress={() => setSelectedRating(null)}
                  className={`mr-2 px-4 py-2 rounded-full ${
                    !selectedRating ? "bg-yellow-500" : "bg-neutral-900"
                  }`}
                >
                  <View className="flex-row items-center">
                    <Text className={`${!selectedRating ? "text-black font-bold" : "text-white"}`}>
                      Tất cả
                    </Text>
                    {!selectedRating && (
                      <View className="bg-black/20 px-2 py-0.5 rounded-full ml-2">
                        <Text className="text-black text-xs font-medium">
                          {feedbacks.length}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {[5, 4, 3, 2, 1].map((rating) => (
                  <FilterButton
                    key={rating}
                    rating={rating}
                    isSelected={selectedRating === rating}
                    onPress={() => setSelectedRating(rating)}
                    count={getRatingCount(feedbacks, rating)}
                  />
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Danh sách đánh giá */}
          <FlatList<BarDetail["feedBacks"][0]>
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
  }
);

// Cập nhật AuthModal component
const AuthModal = ({
  isVisible,
  onClose,
  onLogin,
  onRegister,
}: {
  isVisible: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) => (
  <Modal
    isVisible={isVisible}
    onBackdropPress={onClose}
    onSwipeComplete={onClose}
    swipeDirection={["down"]}
    propagateSwipe={true}
    statusBarTranslucent
    style={{
      justifyContent: "flex-end",
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

// Đặt ASPECT_RATIO là constant ở đầu file, ngoài component
const ASPECT_RATIO = 1.5; // Giữ tỷ lệ 1.5 cho tất cả ảnh

// 2. Component chính
export default function BarDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const screenWidth = Dimensions.get("window").width;

  // Refs
  const scrollViewRef = useRef<Animated.ScrollView>(null);
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
  const [isDrinkDetailModalVisible, setIsDrinkDetailModalVisible] =
    useState(false);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Thêm state để theo dõi modal trước đó
  const [shouldReopenDrinksModal, setShouldReopenDrinksModal] = useState(false);

  // Memoized values
  const images = useMemo(() => {
    return barDetail?.images ? getImageArray(barDetail.images) : [];
  }, [barDetail?.images]);

  const imageViewImages = useMemo(() => {
    return images.map((uri) => ({ uri }));
  }, [images]);

  const averageRating = useMemo(() => {
    return getAverageRating(barDetail?.feedBacks || []);
  }, [barDetail?.feedBacks]);

  const getFilteredDrinks = useCallback(() => {
    if (!drinks) return [];
    if (!selectedCategory) return drinks;
    return drinks.filter(
      (drink) =>
        drink.drinkCategoryResponse.drinksCategoryId === selectedCategory
    );
  }, [drinks, selectedCategory]);

  const drinkCategories = useMemo(() => {
    if (!drinks) return [];
    const uniqueCategories = new Map();

    drinks.forEach((drink) => {
      const category = drink.drinkCategoryResponse;
      if (!uniqueCategories.has(category.drinksCategoryId)) {
        uniqueCategories.set(category.drinksCategoryId, {
          id: category.drinksCategoryId,
          name: category.drinksCategoryName,
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
      (a, b) =>
        new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
    );

    if (selectedRating) {
      filtered = filtered.filter(
        (feedback) => feedback.rating === selectedRating
      );
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
          drinkService.getDrinks(id),
        ]);

        setBarDetail(barData);
        setDrinks(drinksData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleOpenDrinkDetail = useCallback((drink: Drink) => {
    if (isDrinkModalVisible) {
      setIsTransitioning(true);
      setSelectedDrink(drink);
      setShouldReopenDrinksModal(true); // Đánh dấu để mở lại sau
      setIsDrinkModalVisible(false);
    } else {
      setSelectedDrink(drink);
      setIsDrinkDetailModalVisible(true);
    }
  }, [isDrinkModalVisible]);

  // Thêm state và hooks cần thiết
  const { isAuthenticated, user, isGuest } = useAuth();
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);

  // Cập nhật hàm handleBooking
  const handleBooking = () => {
    // Kiểm tra xem người dùng đã đăng nhập và là CUSTOMER hay chưa
    if (!isAuthenticated || !user || user.role !== "CUSTOMER" || isGuest) {
      setIsAuthModalVisible(true);
      return;
    }

    // Nếu đ đăng nhập và là CUSTOMER thì cho phép đặt bàn
    if (barDetail?.barId) {
      router.push(`/booking-table/${barDetail.barId}` as any);
    }
  };

  // Thêm các states cho animation
  const scrollY = useSharedValue(0);
  const HEADER_SCROLL_DISTANCE = (screenWidth / ASPECT_RATIO) - 25;

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolate(
      scrollY.value,
      [HEADER_SCROLL_DISTANCE - 100, HEADER_SCROLL_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      backgroundColor: `rgba(0, 0, 0, ${backgroundColor})`,
    };
  });

  // Thêm handler cho scroll event
  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Điều chỉnh animation cho title
  const titleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HEADER_SCROLL_DISTANCE - 100, HEADER_SCROLL_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [HEADER_SCROLL_DISTANCE - 100, HEADER_SCROLL_DISTANCE],
      [20, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Thêm animation style cho image (đặt cùng chỗ với các animation style khác)
  const imageAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 200],
      [1, 0.95],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, 200],
      [0, -30],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }, { translateY }],
    };
  });

  // Thêm animation style cho toàn bộ header
  const headerContentAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 200],
      [1, 0.95],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [0, 150],
      [1, 0],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, 200],
      [0, -20],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [
        { scale },
        { translateY }
      ],
    };
  });

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Thay header cũ bằng animated header */}
        <Animated.View
          className="absolute top-0 left-0 right-0 z-50"
          style={headerAnimatedStyle}
        >
          <SafeAreaView edges={['top']}>
            <View className="px-4 py-2">
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="bg-black/20 backdrop-blur-sm p-2 rounded-full w-10 h-10 items-center justify-center"
                >
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                {/* Thêm phần title vào đây */}
                <Animated.View 
                  className="flex-1 ml-4"
                  style={titleAnimatedStyle}
                >
                  <View className="flex-row items-center space-x-2">
                    <Text className="text-yellow-500 font-bold text-lg" numberOfLines={1}>
                      {barDetail?.barName}
                    </Text>
                    
                    {/* Rating */}
                    <View className="flex-row items-center">
                      <Ionicons name="star" size={14} color="#EAB308" />
                      <Text className="text-white ml-1 text-sm">
                        {formatRating(averageRating) == "0" ? "Chưa có đánh giá" : formatRating(averageRating)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center space-x-2 mt-1">
                    <Text className="text-gray-400 text-sm flex-1" numberOfLines={1}>
                      {barDetail?.address}
                    </Text>

                    {/* Discount badge */}
                    {(barDetail?.discount ?? 0) > 0 && (
                      <View className="bg-yellow-500/90 px-1.5 py-0.5 rounded-full">
                        <Text className="text-black font-bold text-xs">
                          -{barDetail?.discount}%
                        </Text>
                      </View>
                    )}

                    {/* Table availability badge */}
                    {barDetail && isOpenToday(barDetail.barTimeResponses) && (
                      <View
                        className={`px-1.5 py-0.5 rounded-full ${
                          barDetail.isAnyTableAvailable
                            ? "bg-green-500/90"
                            : "bg-red-500/90"
                        }`}
                      >
                        <Text className="text-white font-bold text-xs">
                          {barDetail.isAnyTableAvailable
                            ? "Còn bàn"
                            : "Hết bàn"}
                        </Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>

        {isLoading ? (
          <BarDetailSkeleton />
        ) : (
          <View className="flex-1">
            {/* Thay ScrollView bằng Animated.ScrollView */}
            <Animated.ScrollView
              ref={scrollViewRef}
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 80 }}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {/* Giữ nguyên toàn bộ nội dung */}
              {/* Image Slider */}
              <Animated.View
                className="relative"
                style={[
                  { height: screenWidth / ASPECT_RATIO },
                  imageAnimatedStyle // Thêm animation style
                ]}
              >
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
                        height: screenWidth / ASPECT_RATIO,
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
                        index === currentImageIndex
                          ? "bg-yellow-500"
                          : "bg-white/50"
                      }`}
                    />
                  ))}
                </View>

                {/* Gradient Overlay */}
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.8)"]}
                  className="absolute bottom-0 left-0 right-0 h-32"
                />
              </Animated.View>

              {/* Content */}
              <View className="px-6 -mt-20 relative z-10">
                <Animated.View entering={FadeIn} className="space-y-6">
                  {/* Header Info */}
                  <Animated.View style={headerContentAnimatedStyle}>
                    <View>
                      <Text className="text-yellow-500 text-3xl font-bold mb-2">
                        {barDetail?.barName}
                      </Text>
                      <View className="flex-row items-center space-x-4">
                        {/* Rating */}
                        <View className="flex-row items-center">
                          <Ionicons name="star" size={16} color="#EAB308" />
                          <Text className="text-white ml-1 font-medium">
                            {formatRating(averageRating) == "0" ? "Chưa có đánh giá" : formatRating(averageRating)}
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

                        {/* Table availability badge */}
                        {barDetail && isOpenToday(barDetail.barTimeResponses) && (
                          <View
                            className={`px-2.5 py-1 rounded-full ${
                              barDetail.isAnyTableAvailable
                                ? "bg-green-500/90"
                                : "bg-red-500/90"
                            }`}
                          >
                            <Text className="text-white font-bold text-xs">
                              {barDetail.isAnyTableAvailable
                                ? "Còn bàn hôm nay"
                                : "Hết bàn hôm nay"}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Animated.View>

                  {/* Location & Contact */}
                  <View className="space-y-4">
                    {/* Thêm component OperatingHours vào đây */}
                    <OperatingHours
                      barTimes={barDetail?.barTimeResponses || []}
                    />

                    <View className="flex-row items-center space-x-3">
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color="#9CA3AF"
                      />
                      <Text className="text-gray-400 flex-1">
                        {barDetail?.address}
                      </Text>
                    </View>

                    <View className="flex-row items-center space-x-3">
                      <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                      <Text className="text-gray-400">
                        {barDetail?.phoneNumber}
                      </Text>
                    </View>
                    <View className="flex-row items-center space-x-3">
                      <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                      <Text className="text-gray-400">{barDetail?.email}</Text>
                    </View>
                    <View className="flex-row items-center space-x-3">
                      <Ionicons name="ban-outline" size={20} color="#9CA3AF" />
                      <Text className="text-gray-400">
                        Giới hạn độ tuổi: 18+
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  <View>
                    <Text className="text-white text-lg font-bold mb-2">
                      Mô tả
                    </Text>
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
                            event.nativeEvent.contentOffset.x /
                              (screenWidth - 48)
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
                                height: (screenWidth - 48) / ASPECT_RATIO,
                              }}
                              className="rounded-xl"
                              resizeMode="cover"
                            />
                            {/* Thêm overlay mờ và icon để chỉ ra ảnh có thể click */}
                            <View className="absolute inset-0 bg-black/10 rounded-xl items-center justify-center">
                              <View className="bg-black/30 rounded-full p-2">
                                <Ionicons
                                  name="expand-outline"
                                  size={20}
                                  color="white"
                                />
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
                              index === currentImageIndex
                                ? "bg-yellow-500"
                                : "bg-white/50"
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
                      <SafeAreaView edges={["top"]}>
                        <View className="w-full flex-row justify-between items-center px-4 py-2 mt-16">
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
                      <View className="bg-neutral-900 rounded-xl p-6 items-center">
                        <View className="bg-neutral-800 p-4 rounded-full mb-4">
                          <Ionicons
                            name="wine-outline"
                            size={40}
                            color="#9CA3AF"
                          />
                        </View>
                        <Text className="text-gray-300 text-lg font-medium text-center">
                          Quán chưa cập nhật menu
                        </Text>
                        <Text className="text-gray-500 text-sm text-center mt-2 max-w-[250px]">
                          Menu đang được cập nhật. Vui lòng quay lại sau hoặc
                          liên hệ trực tiếp với quán để biết thêm chi tiết.
                        </Text>

                        {/* Nút liên hệ */}
                        {barDetail?.phoneNumber && (
                          <TouchableOpacity
                            className="mt-4 flex-row items-center bg-yellow-500/10 px-4 py-2 rounded-full"
                            onPress={() =>
                              Linking.openURL(`tel:${barDetail.phoneNumber}`)
                            }
                          >
                            <Ionicons
                              name="call-outline"
                              size={20}
                              color="#EAB308"
                            />
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
                              source={{ uri: item.images.split(",")[0] }}
                              className="w-full h-40 rounded-xl mb-2"
                              resizeMode="cover"
                            />
                            <Text className="text-white font-medium mb-1">
                              {item.drinkName}
                            </Text>
                            <Text className="text-yellow-500 font-bold">
                              {item.price.toLocaleString("vi-VN")}đ
                            </Text>
                          </TouchableOpacity>
                        )}
                      />
                    )}

                    {/* Drinks Modal */}
                    <DrinkDetailModal
                      isVisible={isDrinkDetailModalVisible}
                      drink={selectedDrink}
                      isTransitioning={isTransitioning}
                      onClose={() => {
                        setIsDrinkDetailModalVisible(false);
                        setSelectedDrink(null);
                        // Mở lại Drinks Modal nếu cần
                        if (shouldReopenDrinksModal) {
                          // Đợi modal drinks detail đóng hoàn toàn
                          setTimeout(() => {
                            setIsDrinkModalVisible(true);
                            setShouldReopenDrinksModal(false);
                          }, 0); // Tăng delay lên 200ms
                        }
                      }}
                    />

                    {/* Drinks Modal */}
                    <Modal
                      isVisible={isDrinkModalVisible}
                      onBackdropPress={() => {
                        setIsDrinkModalVisible(false);
                        setSelectedCategory(null);
                      }}
                      onModalHide={() => {
                        if (isTransitioning) {
                          setTimeout(() => {
                            setIsDrinkDetailModalVisible(true);
                            setIsTransitioning(false);
                          }, 100);
                        }
                      }}
                      style={{ margin: 0 }}
                      statusBarTranslucent
                      useNativeDriverForBackdrop
                      animationIn="slideInUp"
                      animationOut="slideOutDown"
                      animationInTiming={250}
                      animationOutTiming={200}
                      backdropTransitionOutTiming={0}
                      hideModalContentWhileAnimating={true}
                      presentationStyle="overFullScreen"
                      propagateSwipe={true}
                      useNativeDriver={true}
                    >
                      <View className="flex-1 bg-black rounded-t-3xl mt-16">
                        {/* Header */}
                        <View className="p-4 border-b border-white/10">
                          {/* B thanh trượt */}
                          <View className="flex-row justify-between items-center mb-3">
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
                            className=""
                          >
                            <TouchableOpacity
                              onPress={() => setSelectedCategory(null)}
                              className={`mr-2 px-4 py-2 rounded-full ${
                                !selectedCategory 
                                  ? "bg-yellow-500" 
                                  : "bg-neutral-900"
                              }`}
                            >
                              <View className="flex-row items-center">
                                <Text className={`${
                                  !selectedCategory 
                                    ? "text-black font-bold" 
                                    : "text-white"
                                }`}>
                                  Tất cả
                                </Text>
                                {!selectedCategory && (
                                  <View className="bg-black/20 px-2 py-0.5 rounded-full ml-2">
                                    <Text className="text-black text-xs font-medium">
                                      {drinks.length}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </TouchableOpacity>

                            {drinkCategories.map((category) => (
                              <TouchableOpacity
                                key={category.id}
                                onPress={() => setSelectedCategory(category.id)}
                                className={`mr-2 px-4 py-2 rounded-full ${
                                  selectedCategory === category.id 
                                    ? "bg-yellow-500" 
                                    : "bg-neutral-900"
                                }`}
                              >
                                <View className="flex-row items-center">
                                  <Text className={`${
                                    selectedCategory === category.id 
                                      ? "text-black font-bold" 
                                      : "text-white"
                                  }`}>
                                    {category.name}
                                  </Text>
                                  {selectedCategory === category.id && (
                                    <View className="bg-black/20 px-2 py-0.5 rounded-full ml-2">
                                      <Text className="text-black text-xs font-medium">
                                        {drinks.filter(d => d.drinkCategoryResponse.drinksCategoryId === category.id).length}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        {/* Drinks List */}
                        <ScrollView
                          className="flex-1 px-4 mt-4"
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={false}
                        >
                          <DrinksList 
                            drinks={getFilteredDrinks()}
                            onDrinkPress={handleOpenDrinkDetail}
                          />
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
                      {barDetail?.feedBacks &&
                        barDetail.feedBacks.length > 0 && (
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
                        .sort(
                          (a, b) =>
                            new Date(b.createdTime).getTime() -
                            new Date(a.createdTime).getTime()
                        )
                        .slice(0, 3)
                        .map((feedback, index) => (
                          <FeedbackItem key={index} feedback={feedback} />
                        ))
                    ) : (
                      <View className="bg-neutral-900 rounded-xl p-4 items-center">
                        <Ionicons
                          name="star-outline"
                          size={40}
                          color="#9CA3AF"
                        />
                        <Text className="text-gray-400 mt-2 text-center">
                          Chưa có đánh giá nào
                        </Text>
                        <Text className="text-gray-500 text-sm text-center mt-1">
                          Hãy là người đu tiên đánh giá quán bar này
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
            </Animated.ScrollView>

            {/* Nút Đt bàn ngay */}
            <View className="absolute bottom-0 left-0 right-0 mb-2">
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.8)", "rgba(0,0,0,1)"]}
                className="absolute inset-0"
              />
              <View className="px-4 py-2">
                <TouchableOpacity
                  className="bg-yellow-500 p-3 rounded-xl mx-4 mb-2"
                  activeOpacity={0.8}
                  onPress={handleBooking}
                  style={{
                    shadowColor: "#000",
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
          router.push("/login");
        }}
        onRegister={() => {
          setIsAuthModalVisible(false);
          router.push("/register");
        }}
      />
    </View>
  );
}
