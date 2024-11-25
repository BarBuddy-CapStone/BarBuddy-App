import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text } from 'react-native';
import React, { useEffect, useState } from 'react';
import { notificationService } from '@/services/notification';
import { signalRService } from '@/services/signalr';

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const setupNotifications = async () => {
      await signalRService.connect();
      
      // Lắng nghe cập nhật số lượng thông báo chưa đọc
      signalRService.setUnreadCountCallback((count) => {
        setUnreadCount(count);
      });

      // Lắng nghe thông báo mới
      signalRService.setNotificationCallback((notification) => {
        setUnreadCount(prev => prev + 1);
      });

      // Lấy số lượng ban đầu
      const initialCount = await notificationService.getUnreadCount();
      setUnreadCount(initialCount);
    };

    setupNotifications();

    return () => {
      signalRService.setUnreadCountCallback(() => {});
      signalRService.setNotificationCallback(() => {});
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#EAB308',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          height: Platform.select({ ios: 72, android: 56 }),
          paddingBottom: Platform.select({ ios: 16, android: 0 }),
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.1)',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 4,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginTop: 4,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bars"
        options={{
          title: 'Quán Bar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'globe' : 'globe-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="booking-history"
        options={{
          title: 'Lịch sử',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'calendar' : 'calendar-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Thông báo',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons 
                name={focused ? 'notifications' : 'notifications-outline'} 
                size={24} 
                color={color} 
              />
              {unreadCount > 0 && (
                <View className="absolute -right-2 -top-1 bg-red-500 rounded-full min-w-[16px] h-4 items-center justify-center px-1">
                  <Text className="text-white text-xs font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
