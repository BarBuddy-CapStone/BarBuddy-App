import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, Modal, GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { DrinkOrderItem, BookingDrinkRequest, bookingTableService, SelectedTableInfo } from '@/services/booking-table';
import { Drink, drinkService } from '@/services/drink';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import ImageViewing from 'react-native-image-viewing'
import ReactNativeModal from 'react-native-modal';

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
  const [showFilter, setShowFilter] = useState(false);
  const [categories, setCategories] = useState<{
    drinksCategoryId: string;
    drinksCategoryName: string;
  }[]>([]);
  const [filteredDrinks, setFilteredDrinks] = useState<Drink[]>([]);
  const discount = Number(params.discount) || 0;
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [isDrinkDetailVisible, setIsDrinkDetailVisible] = useState(false);
  const [originalPrice, setOriginalPrice] = useState(0);

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
      drinks
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
    
    // Filter by category
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

    // Sort by price
    if (sortOrder) {
      filtered.sort((a, b) => {
        if (sortOrder === 'asc') {
          return a.price - b.price;
        } else {
          return b.price - a.price;
        }
      });
    }

    setFilteredDrinks(filtered);
  }, [drinks, selectedCategory, searchText, sortOrder]);

  const handleOpenDrinkDetail = (drink: Drink) => {
    setSelectedDrink(drink);
    setIsDrinkDetailVisible(true);
  };

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
    const [isImageViewVisible, setIsImageViewVisible] = useState(false);
    const images = useMemo(() => 
      drink?.images.split(',').map(url => ({ uri: url.trim() })) || [], 
      [drink?.images]
    );

    return (
      <ReactNativeModal
        isVisible={isVisible}
        onBackdropPress={onClose}
        onSwipeComplete={onClose}
        swipeDirection={['down']}
        className="m-0 mt-16"
        style={{ margin: 0 }}
        statusBarTranslucent
        useNativeDriverForBackdrop
        propagateSwipe
      >
        <View className="flex-1 bg-black rounded-t-3xl">
          <View className="items-center pt-2">
            <View className="w-10 h-1 bg-white/20 rounded-full" />
          </View>

          <View className="p-4 border-b border-white/10">
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-lg font-bold">Chi tiết thức uống</Text>
              <TouchableOpacity 
                onPress={onClose}
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

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header với search và categories */}
        <View className="border-b border-white/10">
          {/* Search bar và nút back */}
          <View className="px-4 pt-1 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity 
                onPress={() => router.back()}
                className="h-9 w-9 bg-neutral-800 rounded-full items-center justify-center mr-3"
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
              onPress={() => setShowFilter(true)}
              className="h-9 w-9 bg-neutral-800 rounded-full items-center justify-center ml-3"
            >
              <Ionicons name="filter" size={18} color="white" />
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
            {categories.map(category => (
              <TouchableOpacity
                key={category.drinksCategoryId}
                onPress={() => setSelectedCategory(category.drinksCategoryId)}
                className={`px-3 py-1.5 rounded-full mr-2 ${
                  selectedCategory === category.drinksCategoryId 
                    ? 'bg-yellow-500' 
                    : 'bg-neutral-800'
                }`}
              >
                <Text className={`text-sm ${
                  selectedCategory === category.drinksCategoryId 
                    ? 'text-black font-bold' 
                    : 'text-white'
                }`}>
                  {category.drinksCategoryName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Drink List */}
        <ScrollView className="flex-1">
          <View className="p-4">
            {filteredDrinks.map((drink, index) => (
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
                            {drink.drinkCategoryResponse.drinksCategoryName}
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
            ))}
          </View>
        </ScrollView>

        {/* Bottom Sheet nhỏ gọn */}
        <View className="border-t border-white/10 bg-neutral-900/95">
          <View className="px-4 py-3 flex-row items-center justify-between">
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
        </View>

        {/* Filter Modal */}
        <Modal
          visible={showFilter}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFilter(false)}
        >
          <View className="flex-1 bg-black/50 items-center justify-center">
            <View className="bg-neutral-900 rounded-2xl w-[80%] overflow-hidden">
              <View className="p-4 border-b border-white/10">
                <View className="flex-row justify-between items-center">
                  <Text className="text-white text-lg font-bold">Sắp xếp theo</Text>
                  <TouchableOpacity 
                    onPress={() => setShowFilter(false)}
                    className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="p-4">
                <TouchableOpacity
                  onPress={() => {
                    setSortOrder('asc');
                    setShowFilter(false);
                  }}
                  className={`flex-row items-center p-3 rounded-xl mb-2 ${
                    sortOrder === 'asc' ? 'bg-yellow-500' : 'bg-white/10'
                  }`}
                >
                  <Ionicons 
                    name="arrow-up" 
                    size={20} 
                    color={sortOrder === 'asc' ? 'black' : 'white'} 
                  />
                  <Text className={`ml-3 font-medium ${
                    sortOrder === 'asc' ? 'text-black' : 'text-white'
                  }`}>
                    Giá tăng dần
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setSortOrder('desc');
                    setShowFilter(false);
                  }}
                  className={`flex-row items-center p-3 rounded-xl mb-2 ${
                    sortOrder === 'desc' ? 'bg-yellow-500' : 'bg-white/10'
                  }`}
                >
                  <Ionicons 
                    name="arrow-down" 
                    size={20} 
                    color={sortOrder === 'desc' ? 'black' : 'white'} 
                  />
                  <Text className={`ml-3 font-medium ${
                    sortOrder === 'desc' ? 'text-black' : 'text-white'
                  }`}>
                    Giá giảm dần
                  </Text>
                </TouchableOpacity>

                {sortOrder && (
                  <TouchableOpacity
                    onPress={() => {
                      setSortOrder(null);
                      setShowFilter(false);
                    }}
                    className="flex-row items-center p-3 rounded-xl bg-white/10"
                  >
                    <Ionicons name="refresh" size={20} color="white" />
                    <Text className="ml-3 text-white font-medium">
                      Đặt lại
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>

        <DrinkDetailModal
          isVisible={isDrinkDetailVisible}
          drink={selectedDrink}
          onClose={() => {
            setIsDrinkDetailVisible(false);
            setSelectedDrink(null);
          }}
        />
      </SafeAreaView>
    </View>
  );
} 