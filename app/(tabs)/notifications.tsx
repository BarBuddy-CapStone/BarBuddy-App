import { View, Text, FlatList, RefreshControl, Image, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback, useEffect, useContext } from 'react';
import { NotificationContext } from '@/contexts/NotificationContext';
import { notificationService, type Notification } from '@/services/notification';
import { format, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { GuestView } from '@/components/GuestView';
import Animated, { 
  FadeIn, 
  useAnimatedStyle, 
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue
} from 'react-native-reanimated';

// Cập nhật enum cho các loại thông báo
enum NotificationType {
  SYSTEM = 0,      // Thông báo hệ thống
  PROMOTIONAL = 1, // Thông báo quảng bá
  BOOKING = 2,     // Thông báo đặt bàn
  EVENT = 3,       // Thông báo sự kiện
  PAYMENT = 4      // Thông báo thanh toán
}

// Thêm hàm helper để format thời gian
const formatNotificationTime = (date: Date) => {
  if (isToday(date)) {
    return `Hôm nay, ${format(date, 'HH:mm', { locale: vi })}`;
  } else if (isYesterday(date)) {
    return `Hôm qua, ${format(date, 'HH:mm', { locale: vi })}`;
  }
  return format(date, 'dd/MM/yyyy, HH:mm', { locale: vi });
};

// Cập nhật component NotificationIcon
const NotificationIcon = ({ type }: { type: number }) => {
  let iconName = 'notifications';
  let iconColor = '#EAB308'; // yellow-500 - default color

  switch (type) {
    case NotificationType.SYSTEM:
      iconName = 'information-circle';
      iconColor = '#EF4444'; // red-500
      break;
    case NotificationType.PROMOTIONAL:
      iconName = 'megaphone';
      iconColor = '#F59E0B'; // amber-500
      break;
    case NotificationType.BOOKING:
      iconName = 'calendar';
      iconColor = '#22C55E'; // green-500
      break;
    case NotificationType.EVENT:
      iconName = 'star';
      iconColor = '#8B5CF6'; // violet-500
      break;
    case NotificationType.PAYMENT:
      iconName = 'wallet';
      iconColor = '#3B82F6'; // blue-500
      break;
    default:
      break;
  }

  return (
    <View 
      className="w-10 h-10 rounded-full items-center justify-center" 
      style={{ backgroundColor: `${iconColor}15` }}
    >
      <Ionicons name={iconName as any} size={20} color={iconColor} />
    </View>
  );
};

const NotificationSkeleton = () => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  return (
    <Animated.View 
      style={animatedStyle}
      className="flex-row p-4 space-x-3 border-b border-neutral-800/50"
    >
      {/* Icon skeleton */}
      <View className="w-8 h-8 rounded-full bg-neutral-800" />
      
      <View className="flex-1">
        {/* Title skeleton */}
        <View className="h-5 bg-neutral-800 rounded-full w-2/3 mb-2" />
        
        {/* Message skeleton */}
        <View className="space-y-2">
          <View className="h-4 bg-neutral-800 rounded-full w-5/6" />
          <View className="h-4 bg-neutral-800 rounded-full w-4/6" />
        </View>
        
        {/* Time skeleton */}
        <View className="h-3 bg-neutral-800 rounded-full w-20 mt-2" />
      </View>
    </Animated.View>
  );
};

export default function NotificationsScreen() {
  const { notifications, setNotifications, fetchNotifications } = useContext(NotificationContext);
  const { isGuest, user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications(1);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchNotifications().then(() => setLoading(false));
  }, []);

  const renderNotification = ({ item }: { item: Notification }) => (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="overflow-hidden"
    >
      <TouchableOpacity
        className={`flex-row p-4 space-x-3 ${!item.isRead ? 'bg-neutral-900' : 'bg-black'} border-b border-neutral-800/50`}
        onPress={async () => {
          if (item.mobileDeepLink) {
            router.push(item.mobileDeepLink as any);
          }
          if (!item.isRead) {
            await notificationService.markAsRead(item.id);
            setNotifications(prevNotifications =>
              prevNotifications.map(n =>
                n.id === item.id ? { ...n, isRead: true } : n
              )
            );
          }
        }}
      >
        <NotificationIcon type={item.type} />
        
        <View className="flex-1 min-w-0">
          <View className="mb-2">
            <Text 
              className={`font-semibold ${!item.isRead ? 'text-white' : 'text-white/80'}`}
              style={{
                lineHeight: 20,
              }}
            >
              {item.title}
            </Text>
          </View>
          
          <View className={`flex-row ${item.imageUrl ? 'space-x-3' : ''}`}>
            <View className="flex-1">
              <Text 
                className={`${!item.isRead ? 'text-white/70' : 'text-white/50'} text-sm mb-1.5`}
                style={{
                  lineHeight: 18,
                }}
              >
                {item.message}
              </Text>
              <Text className="text-xs text-white/40">
                {formatNotificationTime(new Date(item.createdAt || new Date()))}
              </Text>
            </View>

            {item.imageUrl && item.imageUrl.trim() !== '' && (
              <View className="shrink-0">
                <Image 
                  source={{ uri: item.imageUrl }}
                  className="w-16 h-16 rounded-lg bg-neutral-800"
                />
              </View>
            )}
          </View>

          {!item.isRead && (
            <View className="absolute -right-1 top-1">
              <View className="w-2 h-2 rounded-full bg-yellow-500" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const handleMarkAllAsRead = async () => {
    setIsMarkingRead(true);
    const success = await notificationService.markAllAsRead();
    if (success) {
      setNotifications(prevNotifications =>
        prevNotifications.map(n => ({ ...n, isRead: true }))
      );
    }
    setIsMarkingRead(false);
  };

  const renderContent = () => {
    if (isGuest || !user?.accountId) {
      return <GuestView screenName="notifications" />;
    }

    return (
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          <View className="border-b border-neutral-800">
            <View className="px-4 py-3 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-8 h-8 rounded-full bg-neutral-800/80 items-center justify-center mr-3">
                  <Ionicons name="notifications" size={18} color="#EAB308" />
                </View>
                <Text className="text-white text-lg font-semibold">Thông báo</Text>
              </View>
              
              <TouchableOpacity
                className={`h-8 px-3 rounded-full flex-row items-center justify-center space-x-1.5 ${isMarkingRead ? 'bg-yellow-500/20' : 'bg-neutral-800'}`}
                onPress={handleMarkAllAsRead}
                disabled={isMarkingRead}
              >
                <Ionicons 
                  name={isMarkingRead ? "checkmark-circle" : "checkmark-circle-outline"} 
                  size={16} 
                  color={isMarkingRead ? "#EAB308" : "#FFF"} 
                />
                <Text className={`text-sm font-medium ${isMarkingRead ? 'text-yellow-500' : 'text-white'}`}>
                  {isMarkingRead ? 'Đang đánh dấu...' : 'Đánh dấu đã đọc'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View className="flex-1">
              {[1, 2, 3, 4, 5].map((item) => (
                <NotificationSkeleton key={item} />
              ))}
            </View>
          ) : (
            <FlatList
              data={notifications}
              renderItem={renderNotification}
              keyExtractor={item => item.id}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  tintColor="#EAB308"
                  colors={['#EAB308']}
                />
              }
              onEndReached={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchNotifications(nextPage);
              }}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={() => (
                <Animated.View 
                  entering={FadeIn}
                  className="flex-1 items-center justify-center py-20"
                >
                  <View className="w-16 h-16 rounded-full bg-white/5 items-center justify-center mb-4">
                    <Ionicons name="notifications-off" size={32} color="#9CA3AF" />
                  </View>
                  <Text className="text-white/60 text-base">Chưa có thông báo nào</Text>
                </Animated.View>
              )}
              contentContainerStyle={{ 
                paddingBottom: Platform.OS === 'android' ? 60 : 80,
                flexGrow: 1
              }}
            />
          )}
        </SafeAreaView>
      </View>
    );
  };

  return renderContent();
}
