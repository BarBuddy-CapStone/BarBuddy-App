import { View, Text, FlatList, RefreshControl, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback, useEffect } from 'react';
import { notificationService, type Notification } from '@/services/notification';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { signalRService } from '@/services/signalr';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const setupSignalR = async () => {
      console.log('Bắt đầu kết nối SignalR...');
      await signalRService.connect();

      signalRService.setNotificationCallback((newNotification: Notification) => {
        console.log('Nhận notification mới trong component:', newNotification);
        setNotifications(prev => {
          const exists = prev.some(n => n.id === newNotification.id);
          console.log('Notification đã tồn tại:', exists);
          if (exists) return prev;
          
          const newNotifications = [newNotification, ...prev];
          console.log('Danh sách notifications mới:', newNotifications);
          return newNotifications;
        });
      });
    };

    setupSignalR();

    return () => {
      console.log('Cleanup SignalR connection...');
      signalRService.disconnect();
    };
  }, []);

  const fetchNotifications = async (pageNumber: number = 1) => {
    try {
      console.log('Đang lấy notifications trang:', pageNumber);
      const data = await notificationService.getPublicNotifications(pageNumber);
      console.log('Nhận được notifications:', data);
      
      if (pageNumber === 1) {
        setNotifications(data);
      } else {
        setNotifications(prev => {
          const newNotifications = [...prev];
          data.forEach((notification: Notification) => {
            if (!newNotifications.some(n => n.id === notification.id)) {
              newNotifications.push(notification);
            }
          });
          return newNotifications;
        });
      }
      return data;
    } catch (error) {
      console.error('Lỗi khi lấy notifications:', error);
      return [];
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications(1);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, []);

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      className="flex-row p-4 bg-neutral-900 border-b border-neutral-800"
      onPress={() => {
        if (item.deepLink) {
          router.push(item.deepLink as any);
        }
      }}
    >
      <View className="flex-1">
        <Text className="text-white font-semibold mb-1">{item.title}</Text>
        <Text className="text-white/60 mb-2">{item.message}</Text>
        <Text className="text-white/40 text-xs">
          {format(new Date(item.createdAt || new Date()), 'HH:mm - dd/MM/yyyy', { 
            locale: vi 
          })}
        </Text>
      </View>
      {!item.isRead && (
        <View className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-800">
        <Text className="text-white text-xl font-bold">Thông báo</Text>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={() => {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchNotifications(nextPage);
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center py-8">
            <Text className="text-white/60">Chưa có thông báo nào</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
