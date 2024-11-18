import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, Modal, GestureResponderEvent, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { DrinkOrderItem, BookingDrinkRequest, bookingTableService, SelectedTableInfo } from '@/services/booking-table';
import { Drink, drinkService } from '@/services/drink';
import Animated, { FadeIn, withRepeat, withTiming, useAnimatedStyle, useSharedValue, withSequence, withSpring, Easing, cancelAnimation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import ImageViewing from 'react-native-image-viewing'
import ReactNativeModal from 'react-native-modal';
import { emotionService } from '@/services/emotion';
import { BlurView } from "@react-native-community/blur";

// Thêm component DrinkSkeleton
const DrinkSkeleton = () => {
  return (
    <Animated.View 
      entering={FadeIn}
      className="mb-4"
    >
      <View className="bg-neutral-900 rounded-2xl overflow-hidden border border-white/5">
        {/* Phần ảnh skeleton */}
        <View className="relative">
          <View className="w-full h-48 bg-white/10 animate-pulse" />
          {/* Badge skeleton */}
          <View className="absolute top-3 left-3">
            <View className="bg-white/10 w-20 h-6 rounded-full animate-pulse" />
          </View>
          {/* Giá skeleton */}
          <View className="absolute bottom-3 left-3">
            <View className="bg-white/10 w-24 h-7 rounded-md animate-pulse" />
          </View>
        </View>

        {/* Phần thông tin skeleton */}
        <View className="p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-4">
              {/* Tên drink skeleton */}
              <View className="bg-white/10 w-3/4 h-6 rounded-md mb-2 animate-pulse" />
              {/* Mô tả skeleton */}
              <View className="bg-white/10 w-full h-4 rounded-md mb-1 animate-pulse" />
              <View className="bg-white/10 w-2/3 h-4 rounded-md animate-pulse" />
            </View>
            {/* Nút điều chỉnh số lượng skeleton */}
            <View className="bg-white/5 w-28 h-10 rounded-xl animate-pulse" />
          </View>

          {/* Emotions tags skeleton */}
          <View className="flex-row flex-wrap gap-2 mt-3">
            <View className="bg-white/10 w-16 h-6 rounded-full animate-pulse" />
            <View className="bg-white/10 w-20 h-6 rounded-full animate-pulse" />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

export default function BookingDrinkScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [categories, setCategories] = useState<{
    drinksCategoryId: string;
    drinksCategoryName: string;
  }[]>([]);
  const [filteredDrinks, setFilteredDrinks] = useState<Drink[]>([]);
  const discount = Number(params.discount) || 0;
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [isDrinkDetailVisible, setIsDrinkDetailVisible] = useState(false);
  const [originalPrice, setOriginalPrice] = useState(0);
  // Thêm state để lưu recommended drinks
  const [recommendedDrinks, setRecommendedDrinks] = useState<Drink[]>([]);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');

  const gradientPosition = useSharedValue(0);

  const [isEmotionMode, setIsEmotionMode] = useState(false);
  const emotionModeAnim = useSharedValue(0);

  // Animation values cho gradient border
  const borderGradientRotation = useSharedValue(0);

  // Thêm animation values
  const iconScale = useSharedValue(1);
  const iconOpacity = useSharedValue(1);

  // Animation style cho icon
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconOpacity.value,
  }));

  // Thêm state để theo dõi source data hiện tại
  const [currentSource, setCurrentSource] = useState<'all' | 'emotion'>('all');

  // Sử dụng useMemo để tính toán danh sách drinks được filter
  const displayedDrinks = useMemo(() => {
    // Xác định source data ban đầu
    let sourceData = currentSource === 'emotion' ? recommendedDrinks : drinks;
    
    // Nếu không có data, return array rỗng
    if (!sourceData.length) return [];

    // Filter theo category
    if (selectedCategory !== 'all') {
      sourceData = sourceData.filter(
        drink => drink.drinkCategoryResponse.drinksCategoryId === selectedCategory
      );
    }

    // Filter theo search text
    if (searchText) {
      sourceData = sourceData.filter(
        drink => drink.drinkName.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    return sourceData;
  }, [drinks, recommendedDrinks, currentSource, selectedCategory, searchText]);

  // Thêm state để kiểm soát spinner
  const [isClosingEmotion, setIsClosingEmotion] = useState(false);

  // Cập nhật lại hàm handleEmotionModeChange
  const handleEmotionModeChange = async (newMode: boolean) => {
    if (!newMode) {
      // Hiện spinner
      setIsClosingEmotion(true);
      
      // Animation sequence
      iconScale.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(1.2, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      
      iconOpacity.value = withSequence(
        withTiming(0, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );

      // Delay nhỏ để hiện spinner
      await new Promise(resolve => setTimeout(resolve, 1));

      // Set emotion mode và reset states
      setIsEmotionMode(false);
      setRecommendedDrinks([]);
      setCurrentSource('all');
      setSelectedEmotion('');
      
      // Tắt spinner
      setIsClosingEmotion(false);
    } else {
      setIsEmotionMode(true);
    }
  };

  // Cập nhật lại các hàm xử lý click
  const handleToggleEmotion = () => {
    handleEmotionModeChange(!isEmotionMode);
  };

  useEffect(() => {
    gradientPosition.value = withRepeat(
      withTiming(-100, { 
        duration: 10000,  // Tăng thời gian lên
        easing: Easing.linear
      }),
      -1,
      true
    );
  }, []);

  const animatedGradientStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: gradientPosition.value }],
  }));

  useEffect(() => {
    loadDrinks();
  }, []);

  const loadDrinks = async () => {
    setIsLoading(true);
    try {
      const data = await drinkService.getDrinks(params.id as string);
      setDrinks(data);
    } catch (error) {
      console.error('Error loading drinks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (drinkId: string, quantity: number) => {
    setSelectedDrinks(new Map(selectedDrinks.set(drinkId, quantity)));
  };

  const handleBooking = () => {
    if (isBooking) return;
    
    const drinks: DrinkOrderItem[] = Array.from(selectedDrinks.entries())
      .filter(([_, quantity]) => quantity > 0)
      .map(([drinkId, quantity]) => ({
        drinkId,
        quantity
      }));

    if (drinks.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một thức uống');
      return;
    }

    const selectedTablesInfo: SelectedTableInfo[] = JSON.parse(params.selectedTables as string);

    const bookingRequest: BookingDrinkRequest = {
      barId: params.id as string,
      bookingDate: params.bookingDate as string,
      bookingTime: params.bookingTime as string,
      note: params.note as string,
      tableIds: JSON.parse(params.tableIds as string),
      selectedTables: selectedTablesInfo,
      paymentDestination: "VNPAY",
      drinks,
      voucherCode: params.voucherCode as string || ''
    };

    router.push({
      pathname: "/payment/payment-detail" as any,
      params: {
        bookingRequest: JSON.stringify(bookingRequest),
        discount: params.discount,
        originalPrice: originalPrice.toString(),
        totalPrice: totalPrice.toString()
      }
    });
  };

  useEffect(() => {
    let total = 0;
    selectedDrinks.forEach((quantity, drinkId) => {
      const drink = drinks.find(d => d.drinkId === drinkId);
      if (drink) {
        total += drink.price * quantity;
      }
    });
    setOriginalPrice(total);
    
    if (discount > 0) {
      total = total * (1 - discount/100);
    }
    setTotalPrice(total);
  }, [selectedDrinks, drinks, discount]);

  useEffect(() => {
    if (drinks.length > 0) {
      const uniqueCategories = Array.from(
        new Set(drinks.map(drink => drink.drinkCategoryResponse.drinksCategoryId))
      ).map(categoryId => {
        const drink = drinks.find(
          d => d.drinkCategoryResponse.drinksCategoryId === categoryId
        );
        return {
          drinksCategoryId: categoryId,
          drinksCategoryName: drink?.drinkCategoryResponse.drinksCategoryName || ''
        };
      });
      setCategories(uniqueCategories);
    }
  }, [drinks]);

  useEffect(() => {
    let filtered = [...drinks];
    
    // 1. Nếu đang ở emotion mode, lọc theo emotion trước
    if (isEmotionMode) {
      if (recommendedDrinks.length > 0) {
        // Nếu có recommended drinks từ API hoặc emotion tag
        filtered = [...recommendedDrinks];
      } else if (selectedEmotion) {
        // Nếu có selected emotion từ tags
        filtered = filtered.filter(drink => 
          drink.emotionsDrink?.some(emotion => 
            emotion.emotionalDrinksCategoryId === selectedEmotion
          )
        );
      }
    }

    // 2. Sau đó lọc theo category (bất kể có đang ở emotion mode hay không)
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        drink => drink.drinkCategoryResponse.drinksCategoryId === selectedCategory
      );
    }

    // 3. Cuối cùng lọc theo search text
    if (searchText) {
      filtered = filtered.filter(
        drink => drink.drinkName.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredDrinks(filtered);
  }, [drinks, selectedCategory, searchText, isEmotionMode, recommendedDrinks, selectedEmotion]);

  const handleOpenDrinkDetail = useCallback((drink: Drink) => {
    setSelectedDrink(drink);
    setIsDrinkDetailVisible(true);
  }, []);

  const DrinkDetailContent = ({ drink }: { drink: Drink }) => {
    const [isImageViewVisible, setIsImageViewVisible] = useState(false);
    const images = useMemo(() => 
      drink.images.split(',')
        .filter(url => url.trim())
        .map(url => ({ uri: url.trim() })), 
      [drink.images]
    );

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image với Gradient Overlay */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setIsImageViewVisible(true)}
        >
          <View className="relative">
            <Image
              source={{ uri: images[0].uri }}
              className="w-full h-56"
              resizeMode="cover"
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)"]}
              className="absolute bottom-0 left-0 right-0 h-20"
            />
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
          {drink.emotionsDrink?.length > 0 && (
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
        <ImageViewing
          images={images}
          imageIndex={0}
          visible={isImageViewVisible}
          onRequestClose={() => setIsImageViewVisible(false)}
          backgroundColor="black"
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
        />
      </ScrollView>
    );
  };

  const DrinkDetailModal = ({
    isVisible,
    drink,
    onClose,
  }: {
    isVisible: boolean;
    drink: Drink | null;
    onClose: () => void;
  }) => {
    const [isClosing, setIsClosing] = useState(false);
    const [isImageViewVisible, setIsImageViewVisible] = useState(false);
    
    const images = useMemo(() => 
      drink?.images.split(',').map(url => ({ uri: url.trim() })) || [], 
      [drink?.images]
    );

    const handleClose = useCallback(() => {
      setIsClosing(true);
    }, []);

    return (
      <ReactNativeModal
        isVisible={isVisible && !isClosing}
        onBackdropPress={handleClose}
        onSwipeComplete={handleClose}
        swipeDirection={['down']}
        style={{ margin: 0 }}
        statusBarTranslucent
        useNativeDriver={true}
        useNativeDriverForBackdrop
        propagateSwipe
        animationIn="slideInUp"
        animationOut="slideOutDown"
        animationInTiming={250}
        animationOutTiming={200}
        backdropTransitionInTiming={250}
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
          <View className="items-center pt-2">
            <View className="w-10 h-1 bg-white/20 rounded-full" />
          </View>

          <View className="p-4 border-b border-white/10">
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-lg font-bold">Chi tiết thức uống</Text>
              <TouchableOpacity 
                onPress={handleClose}
                className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
              >
                <Ionicons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {drink && <DrinkDetailContent drink={drink} />}

          <ImageViewing
            images={images}
            imageIndex={0}
            visible={isImageViewVisible}
            onRequestClose={() => setIsImageViewVisible(false)}
          />
        </View>
      </ReactNativeModal>
    );
  };

  const handleIncrement = (drinkId: string, isIncrement: boolean) => {
    handleQuantityChange(
      drinkId,
      isIncrement 
        ? (selectedDrinks.get(drinkId) || 0) + 1
        : Math.max(0, (selectedDrinks.get(drinkId) || 0) - 1)
    );
  };

  // Animation cho 2 footer
  const footerSlideAnim = useAnimatedStyle(() => ({
    transform: [
      { 
        translateY: withSpring(isEmotionMode ? 200 : 0, {
          damping: 15,
          stiffness: 90
        })
      }
    ],
    opacity: withTiming(isEmotionMode ? 0 : 1, { duration: 150 }),
    display: isEmotionMode ? 'none' : 'flex'
  }));

  const emotionFooterAnim = useAnimatedStyle(() => ({
    transform: [
      { 
        translateY: withSpring(isEmotionMode ? 0 : 200, {
          damping: 15,
          stiffness: 90
        })
      }
    ],
    opacity: withTiming(isEmotionMode ? 1 : 0, { duration: 150 })
  }));

  // Animation cho border gradient

  useEffect(() => {
    if (isEmotionMode) {
      // Reset rotation
      borderGradientRotation.value = 0;
      
      // Chạy animation xoay 360 độ
      borderGradientRotation.value = withRepeat(
        withTiming(360, { 
          duration: 8000,
          easing: Easing.linear 
        }),
        -1,
        false
      );
    } else {
      cancelAnimation(borderGradientRotation);
      borderGradientRotation.value = 0;
    }

    return () => {
      cancelAnimation(borderGradientRotation);
    };
  }, [isEmotionMode]);

  const borderGradientStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${borderGradientRotation.value}deg` }]
  }));

  // Thêm animated style cho content padding
  const contentPaddingStyle = useAnimatedStyle(() => ({
    paddingBottom: withSpring(isEmotionMode ? 160 : 0, {
      damping: 15,
      stiffness: 90
    })
  }));


  // Thêm state để lưu danh sách emotions unique từ drinks
  const [emotions, setEmotions] = useState<{
    emotionalDrinksCategoryId: string;
    categoryName: string;
  }[]>([]);

  // Thêm useEffect để lấy danh sách emotions unique từ drinks
  useEffect(() => {
    if (drinks.length > 0) {
      const uniqueEmotions = drinks.reduce((acc, drink) => {
        if (drink.emotionsDrink) {
          drink.emotionsDrink.forEach(emotion => {
            if (!acc.find(e => e.emotionalDrinksCategoryId === emotion.emotionalDrinksCategoryId)) {
              acc.push(emotion);
            }
          });
        }
        return acc;
      }, [] as { emotionalDrinksCategoryId: string; categoryName: string; }[]);
      
      setEmotions(uniqueEmotions);
    }
  }, [drinks]);

  // Cập nhật hàm xử lý chọn emotion
  const handleEmotionSelect = (emotionId: string) => {
    if (selectedEmotion === emotionId) {
      // Chỉ reset emotion selection và recommended drinks
      setSelectedEmotion('');
      setRecommendedDrinks([]);
      // Không tắt emotion mode và không đổi current source
    } else {
      // Chọn emotion mới
      setSelectedEmotion(emotionId);
      const emotionFiltered = drinks.filter(drink => 
        drink.emotionsDrink?.some(emotion => 
          emotion.emotionalDrinksCategoryId === emotionId
        )
      );
      setRecommendedDrinks(emotionFiltered);
      setCurrentSource('emotion');
    }
    // Reset category và emotion text
    setSelectedCategory('all');
    setEmotionText('');
  };

  // Thêm state để lưu giá trị input
  const [emotionText, setEmotionText] = useState('');
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);

  

  // Thêm state isAnalyzing
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Thêm component GlassOverlay
  const GlassOverlay = ({ visible }: { visible: boolean }) => {
    const scaleAnim = useSharedValue(1);
    
    useEffect(() => {
      if (visible) {
        scaleAnim.value = withSequence(
          withSpring(1.1, { damping: 12 }),
          withSpring(1, { damping: 8 })
        );
      }
    }, [visible]);

    const iconStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scaleAnim.value }]
    }));

    if (!visible) return null;

    return (
      <View 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }}
      >
        {/* Blur layer */}
        <BlurView
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          blurType="dark"
          blurAmount={10}
          reducedTransparencyFallbackColor="black"
        >
          {/* Glass effect layer */}
          <LinearGradient
            colors={[
              'rgba(255,255,255,0.1)',
              'rgba(255,255,255,0.05)',
            ]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </BlurView>

        {/* Content */}
        <View className="flex-1 items-center justify-center">
          <Animated.View style={iconStyle}>
            <Image 
              source={require("@/assets/images/happy-face.png")}
              className="w-8 h-8"
            />
          </Animated.View>
          
          <Text 
            className="text-white text-sm font-medium mt-4"
            style={{
              textShadowColor: 'rgba(0, 0, 0, 0.75)',
              textShadowOffset: { width: -1, height: 1 },
              textShadowRadius: 10
            }}
          >
            Đang phân tích cảm xúc...
          </Text>
        </View>
      </View>
    );
  };

  // Thêm state để lưu emotion được phân tích
  const [analyzedEmotion, setAnalyzedEmotion] = useState<string>('');
  
  // Cập nhật hàm handleSendEmotion
  const handleSendEmotion = async () => {
    if (!emotionText.trim()) return;
    
    setIsLoadingRecommendation(true);
    setIsAnalyzing(true);
    setSelectedCategory('all');
    setSelectedEmotion('');
    
    try {
      const response = await emotionService.getDrinkRecommendations(
        emotionText,
        params.id as string
      );
      
      setRecommendedDrinks(response.drinkList);
      setAnalyzedEmotion(response.emotion);
      setIsEmotionMode(true);
      setCurrentSource('emotion');
    } catch (error) {
      console.error('Error:', error);
      Alert.alert(
        'Lỗi',
        'Không thể lấy được gợi ý thức uống. Vui lòng thử lại sau.'
      );
    } finally {
      setIsAnalyzing(false);
      setIsLoadingRecommendation(false);
    }
  };

  // Thêm state để lưu available categories cho emotion hiện tại
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Cập nhật useEffect filter
  useEffect(() => {
    if (!drinks.length) return;

    let filtered = [...drinks];
    
    // Nếu đang ở emotion mode và có recommended drinks
    if (isEmotionMode && recommendedDrinks.length > 0) {
      filtered = recommendedDrinks;
    }

    // Filter by category nếu không phải 'all'
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        drink => drink.drinkCategoryResponse.drinksCategoryId === selectedCategory
      );
    }

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(
        drink => drink.drinkName.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredDrinks(filtered);
  }, [drinks, selectedCategory, searchText, isEmotionMode, recommendedDrinks]);

  // Cập nhật useEffect để tính toán available categories
  useEffect(() => {
    if (isEmotionMode && recommendedDrinks.length > 0) {
      const categories = new Set(
        recommendedDrinks.map(drink => drink.drinkCategoryResponse.drinksCategoryId)
      );
      setAvailableCategories(Array.from(categories));
    } else {
      setAvailableCategories([]); // Reset khi không ở emotion mode
    }
  }, [isEmotionMode, recommendedDrinks]);

  return (
    <View className="flex-1 bg-black">
      {/* Main Content */}
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header với search và categories */}
        <View className="border-b border-white/10">
          {/* Search bar và nút back */}
          <View className="px-4 pt-1 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity 
                onPress={() => router.back()}
                className="h-10 w-10 bg-neutral-800 rounded-full items-center justify-center mr-3"
              >
                <Ionicons name="arrow-back" size={20} color="white" />
              </TouchableOpacity>
              <View className="flex-1 bg-neutral-800 rounded-full flex-row items-center px-3 py-1.5">
                <Ionicons name="search" size={16} color="#9CA3AF" />
                <TextInput
                  placeholder="Tìm thức uống..."
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 ml-2 text-white text-sm"
                  value={searchText}
                  onChangeText={setSearchText}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={handleToggleEmotion}
              className="h-10 w-10 items-center justify-center ml-3 overflow-hidden rounded-full"
            >
              <Animated.View 
                className="absolute w-[400%] h-full" 
                style={[
                  { left: 0 },
                  animatedGradientStyle
                ]}
              >
                <LinearGradient
                  colors={[
                    'rgba(41, 171, 255, 0.85)',
                    'rgba(95, 145, 255, 0.85)',
                    'rgba(149, 119, 255, 0.85)',
                    'rgba(202, 115, 217, 0.85)',
                    'rgba(255, 110, 178, 0.85)',
                    'rgba(255, 98, 132, 0.85)',
                    'rgba(255, 85, 85, 0.85)',
                    'rgba(255, 113, 85, 0.85)',
                    'rgba(255, 141, 85, 0.85)',
                    'rgba(255, 169, 85, 0.85)',
                    'rgba(255, 197, 85, 0.85)',
                    'rgba(148, 184, 255, 0.85)',
                    'rgba(41, 171, 255, 0.85)'
                  ]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
              <Animated.View style={iconAnimatedStyle}>
                <Image 
                  source={
                    isEmotionMode 
                      ? require("@/assets/images/happy-face.png")
                      : require("@/assets/images/smile-face.png")
                  }
                  className="w-5 h-5 z-10"
                  resizeMode="contain"
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Categories trong header */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="px-4 py-2"
          >
            <TouchableOpacity
              onPress={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full mr-2 ${
                selectedCategory === 'all' 
                  ? 'bg-yellow-500' 
                  : 'bg-neutral-800'
              }`}
            >
              <Text className={`text-sm ${
                selectedCategory === 'all' ? 'text-black font-bold' : 'text-white'
              }`}>
                Tất cả
              </Text>
            </TouchableOpacity>
            {categories.map((category) => {
              // Chỉ hiển thị category nếu không có available categories hoặc category nằm trong available list
              const isAvailable = !availableCategories.length || 
                availableCategories.includes(category.drinksCategoryId) ||
                category.drinksCategoryId === 'all';

              if (!isAvailable) return null;

              return (
                <TouchableOpacity
                  key={category.drinksCategoryId}
                  onPress={() => setSelectedCategory(category.drinksCategoryId)}
                  className={`mr-2 px-3 py-1.5 rounded-full ${
                    selectedCategory === category.drinksCategoryId
                      ? 'bg-yellow-500'
                      : 'bg-neutral-800'
                  }`}
                >
                  <Text className={`${
                    selectedCategory === category.drinksCategoryId
                      ? 'text-black font-bold'
                      : 'text-white'
                  }`}>
                    {category.drinksCategoryName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Drink List */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          className="flex-1"
        >
          <Animated.View style={contentPaddingStyle}>
            <View className="px-4">
              {isLoading ? (
                // Hiển thị 6 skeleton items
                <View>
                  {[...Array(6)].map((_, index) => (
                    <DrinkSkeleton key={index} />
                  ))}
                </View>
              ) : (
                <>
                  {isEmotionMode ? (
                    <>
                      {recommendedDrinks.length === 0 ? (
                        // Hiện cảnh báo khi không có recommended drinks
                        <View className="items-center justify-center py-10">
                          <View className="w-20 h-20 rounded-full bg-neutral-900 items-center justify-center mb-4">
                            <Image 
                              source={require("@/assets/images/google-gemini-icon.png")}
                              className="w-12 h-12"
                              resizeMode="contain"
                            />
                          </View>
                          <Text className="text-white text-lg font-medium mb-2">
                            Gợi ý thức uống theo cảm xúc (BETA)
                          </Text>
                          
                          <Text className="text-gray-400 text-sm text-center px-4">
                            Chúng tôi sử dụng trí tuệ nhân tạo để phân tích trạng thái cảm xúc của bạn dựa trên dữ liệu mà bạn nhập vào, chúng tôi cam kết sẽ không lưu trữ dữ liệu của bạn.
                          </Text>
                          <Text className="text-gray-500 text-sm text-center px-4 mt-2">
                            Đây là tính năng thử nghiệm, kết quả có thể không trùng khớp với trạng thái cảm xúc hiện tại của bạn.
                          </Text>
                        </View>
                      ) : (
                        // Chỉ hiện danh sách khi có recommended drinks
                        displayedDrinks.map((drink, index) => (
                          <Animated.View
                            entering={FadeIn.delay(index * 100)}
                            key={drink.drinkId}
                          >
                            <TouchableOpacity 
                              onPress={() => handleOpenDrinkDetail(drink)}
                              activeOpacity={0.7}
                              className="mb-4"
                            >
                              <View className="bg-neutral-900 rounded-2xl overflow-hidden border border-white/5">
                                {/* Phần ảnh */}
                                <View className="relative">
                                  <Image
                                    source={{ uri: drink.images.split(',')[0] }}
                                    className="w-full h-48"
                                    resizeMode="cover"
                                  />
                                  <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                                    className="absolute bottom-0 left-0 right-0 h-24"
                                  />
                                  {/* Badge danh mục */}
                                  <View className="absolute top-3 left-3">
                                    <View className="bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                      <Text className="text-white text-xs font-medium">
                                        {drink.drinkCategoryResponse?.drinksCategoryName || 'Đề xuất'}
                                      </Text>
                                    </View>
                                  </View>
                                  {/* Giá */}
                                  <View className="absolute bottom-3 left-3">
                                    <Text className="text-yellow-500 text-lg font-bold">
                                      {drink.price.toLocaleString('vi-VN')}đ
                                    </Text>
                                  </View>
                                </View>

                                {/* Phần thông tin */}
                                <View className="p-4">
                                  <View className="flex-row items-start justify-between">
                                    <View className="flex-1 mr-4">
                                      <Text className="text-white text-lg font-bold mb-1">
                                        {drink.drinkName}
                                      </Text>
                                      <Text numberOfLines={2} className="text-gray-400 text-sm leading-5">
                                        {drink.description}
                                      </Text>
                                    </View>
                                    
                                    {/* Nút điều chỉnh s�� lượng */}
                                    <View className="bg-white/5 rounded-xl p-1">
                                      <View className="flex-row items-center">
                                        <TouchableOpacity
                                          onPress={() => handleIncrement(drink.drinkId, false)}
                                          className="w-8 h-8 items-center justify-center rounded-lg bg-white/10"
                                        >
                                          <Ionicons name="remove" size={18} color="white" />
                                        </TouchableOpacity>
                                        <Text className="text-white font-medium w-8 text-center">
                                          {selectedDrinks.get(drink.drinkId) || 0}
                                        </Text>
                                        <TouchableOpacity
                                          onPress={() => handleIncrement(drink.drinkId, true)}
                                          className="w-8 h-8 items-center justify-center rounded-lg bg-white/10"
                                        >
                                          <Ionicons name="add" size={18} color="white" />
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  </View>

                                  {/* Emotions tags */}
                                  {drink.emotionsDrink && drink.emotionsDrink.length > 0 && (
                                    <View className="flex-row flex-wrap gap-2 mt-3">
                                      {drink.emotionsDrink.slice(0, 2).map((emotion) => (
                                        <View
                                          key={emotion.emotionalDrinksCategoryId}
                                          className="bg-white/5 px-2.5 py-1 rounded-full"
                                        >
                                          <Text className="text-gray-400 text-xs">
                                            {emotion.categoryName}
                                          </Text>
                                        </View>
                                      ))}
                                      {drink.emotionsDrink.length > 2 && (
                                        <View className="bg-white/5 px-2.5 py-1 rounded-full">
                                          <Text className="text-gray-400 text-xs">
                                            +{drink.emotionsDrink.length - 2}
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                  )}
                                </View>
                              </View>
                            </TouchableOpacity>
                          </Animated.View>
                        ))
                      )}
                    </>
                  ) : (
                    // Hiện danh sách drinks khi không ở emotion mode
                    displayedDrinks.map((drink, index) => (
                      <Animated.View
                        entering={FadeIn.delay(index * 100)}
                        key={drink.drinkId}
                      >
                        <TouchableOpacity 
                          onPress={() => handleOpenDrinkDetail(drink)}
                          activeOpacity={0.7}
                          className="mb-4"
                        >
                          <View className="bg-neutral-900 rounded-2xl overflow-hidden border border-white/5">
                            {/* Phần ảnh */}
                            <View className="relative">
                              <Image
                                source={{ uri: drink.images.split(',')[0] }}
                                className="w-full h-48"
                                resizeMode="cover"
                              />
                              <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.8)']}
                                className="absolute bottom-0 left-0 right-0 h-24"
                              />
                              {/* Badge danh mục */}
                              <View className="absolute top-3 left-3">
                                <View className="bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                  <Text className="text-white text-xs font-medium">
                                    {drink.drinkCategoryResponse?.drinksCategoryName || 'Đề xuất'}
                                  </Text>
                                </View>
                              </View>
                              {/* Giá */}
                              <View className="absolute bottom-3 left-3">
                                <Text className="text-yellow-500 text-lg font-bold">
                                  {drink.price.toLocaleString('vi-VN')}đ
                                </Text>
                              </View>
                            </View>

                            {/* Phần thông tin */}
                            <View className="p-4">
                              <View className="flex-row items-start justify-between">
                                <View className="flex-1 mr-4">
                                  <Text className="text-white text-lg font-bold mb-1">
                                    {drink.drinkName}
                                  </Text>
                                  <Text numberOfLines={2} className="text-gray-400 text-sm leading-5">
                                    {drink.description}
                                  </Text>
                                </View>
                                
                                {/* Nút điều chỉnh số lượng */}
                                <View className="bg-white/5 rounded-xl p-1">
                                  <View className="flex-row items-center">
                                    <TouchableOpacity
                                      onPress={() => handleIncrement(drink.drinkId, false)}
                                      className="w-8 h-8 items-center justify-center rounded-lg bg-white/10"
                                    >
                                      <Ionicons name="remove" size={18} color="white" />
                                    </TouchableOpacity>
                                    <Text className="text-white font-medium w-8 text-center">
                                      {selectedDrinks.get(drink.drinkId) || 0}
                                    </Text>
                                    <TouchableOpacity
                                      onPress={() => handleIncrement(drink.drinkId, true)}
                                      className="w-8 h-8 items-center justify-center rounded-lg bg-white/10"
                                    >
                                      <Ionicons name="add" size={18} color="white" />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>

                              {/* Emotions tags */}
                              {drink.emotionsDrink && drink.emotionsDrink.length > 0 && (
                                <View className="flex-row flex-wrap gap-2 mt-3">
                                  {drink.emotionsDrink.slice(0, 2).map((emotion) => (
                                    <View
                                      key={emotion.emotionalDrinksCategoryId}
                                      className="bg-white/5 px-2.5 py-1 rounded-full"
                                    >
                                      <Text className="text-gray-400 text-xs">
                                        {emotion.categoryName}
                                      </Text>
                                    </View>
                                  ))}
                                  {drink.emotionsDrink.length > 2 && (
                                    <View className="bg-white/5 px-2.5 py-1 rounded-full">
                                      <Text className="text-gray-400 text-xs">
                                        +{drink.emotionsDrink.length - 2}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    ))
                  )}
                </>
              )}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Original Footer với animation slide down */}
        <Animated.View 
          style={[
            { 
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(23,23,23,0.95)'
            },
            footerSlideAnim
          ]}
        >
          <View className="px-4 py-3 flex-row items-center justify-between mb-4">
            <View>
              {discount > 0 ? (
                <>
                  <View className="flex-row items-center mb-1">
                    <Text className="text-gray-400 text-sm line-through mr-2">
                      {originalPrice.toLocaleString('vi-VN')}đ
                    </Text>
                    <View className="bg-yellow-500/20 px-2 py-1 rounded-lg">
                      <Text className="text-yellow-500 text-xs font-bold">-{discount}%</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="pricetag" size={16} color="#FBBF24" />
                    <Text className="text-yellow-500 font-bold text-xl ml-1">
                      {totalPrice.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                </>
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="pricetag" size={16} color="#FBBF24" />
                  <Text className="text-yellow-500 font-bold text-xl ml-1">
                    {totalPrice.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={handleBooking}
              disabled={isBooking || totalPrice === 0}
              className={`bg-yellow-500 px-4 py-2 rounded-xl flex-row items-center ${
                (isBooking || totalPrice === 0) ? 'opacity-50' : ''
              }`}
            >
              <Ionicons name="cart" size={18} color="black" />
              <Text className="text-black font-bold ml-2">
                {isBooking ? 'Đang xử lý...' : 'Xác nhận'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Emotion Footer */}
        <Animated.View 
          style={[
            { 
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: 16,
            },
            emotionFooterAnim
          ]}
        >
          {/* Border Container */}
          <View className="p-[2px] rounded-[20px] overflow-hidden">
            {/* Gradient Border Background */}
            <Animated.View 
              style={[
                {
                  position: 'absolute',
                  top: -150,
                  left: -150,
                  right: -150,
                  bottom: -150,
                },
                borderGradientStyle
              ]}
            >
              <LinearGradient
                colors={[
                  'rgba(41, 171, 255, 0.9)',
                  'rgba(0, 217, 255, 0.9)',
                  'rgba(102, 204, 255, 0.9)',
                  'rgba(153, 102, 255, 0.9)',
                  'rgba(204, 51, 255, 0.9)',
                  'rgba(255, 51, 153, 0.9)',
                  'rgba(255, 102, 102, 0.9)',
                  'rgba(255, 153, 51, 0.9)',
                  'rgba(41, 171, 255, 0.9)',
                  'rgba(0, 217, 255, 0.9)',
                  'rgba(102, 204, 255, 0.9)',
                  'rgba(41, 171, 255, 0.9)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ 
                  flex: 1,
                  transform: [{ rotate: '45deg' }],
                  margin: -50,
                }}
              />
            </Animated.View>

            {/* Content Container */}
            <View className="bg-[#171717] rounded-[20px]">
              <View className="p-4">
                {/* Input Section */}
                <View className="flex-row items-center space-x-3 mb-4">
                  <View className="flex-1">
                    <TextInput
                      placeholder="Bạn đang cảm thấy thế nào?"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      className="bg-white/10 rounded-full px-4 py-3 text-white"
                      value={emotionText}
                      onChangeText={setEmotionText}
                    />
                  </View>
                  <TouchableOpacity 
                    className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
                    onPress={handleSendEmotion}
                    disabled={isLoadingRecommendation || !emotionText.trim()}
                  >
                    {isLoadingRecommendation ? (
                      <ActivityIndicator size="small" color="#FBBF24" />
                    ) : (
                      <Ionicons name="send" size={18} color="white" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
                    onPress={() => handleEmotionModeChange(false)}
                    disabled={isClosingEmotion}
                  >
                    {isClosingEmotion ? (
                      <ActivityIndicator size="small" color="#FBBF24" />
                    ) : (
                      <Ionicons name="close" size={20} color="white" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Emotions Filter */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  className=""
                >
                  {emotions.map((emotion) => (
                    <TouchableOpacity
                      key={emotion.emotionalDrinksCategoryId}
                      onPress={() => handleEmotionSelect(emotion.emotionalDrinksCategoryId)}
                      className={`mr-2 px-3 py-1.5 rounded-full ${
                        selectedEmotion === emotion.emotionalDrinksCategoryId
                          ? 'bg-yellow-500' 
                          : 'bg-neutral-800'
                      }`}
                    >
                      <Text 
                        className={`text-sm ${
                          selectedEmotion === emotion.emotionalDrinksCategoryId
                            ? 'text-black font-bold' 
                            : 'text-white'
                        }`}
                      >
                        {emotion.categoryName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </Animated.View>

        <DrinkDetailModal
          isVisible={isDrinkDetailVisible}
          drink={selectedDrink}
          onClose={() => {
            setIsDrinkDetailVisible(false);
            setSelectedDrink(null);
          }}
        />
      </SafeAreaView>
      <GlassOverlay visible={isAnalyzing} />
    </View>
  );
} 