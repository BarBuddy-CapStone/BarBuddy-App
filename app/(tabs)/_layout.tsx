import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#EAB308', // yellow-500
        tabBarInactiveTintColor: '#9CA3AF', // gray-400
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#333',
          height: 64,  // Tăng chiều cao của tabBar
          paddingBottom: 8,  // Thêm padding bottom
          paddingTop: 8,     // Thêm padding top
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 4,       // Tăng khoảng cách giữa icon và text
          fontWeight: '500',  // Semi-bold cho text
        },
        tabBarIconStyle: {
          marginTop: 4,       // Điều chỉnh vị trí icon
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
        name="check-in"
        options={{
          title: 'Check-In',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'qr-code' : 'qr-code-outline'} 
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
