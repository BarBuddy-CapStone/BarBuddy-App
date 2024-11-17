import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Image, Text, View, Alert, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  cancelAnimation
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { fcmService } from '@/services/fcm';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function OnboardingScreen() {
  const router = useRouter();
  const { isGuest, isLoading } = useAuth();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const hasNavigated = useRef(false);

  const requestPermissions = async () => {
    try {
      // Kiểm tra quyền location
      const hasDeclinedLocationPermission = await AsyncStorage.getItem('hasDeclinedLocationPermission');
      if (!hasDeclinedLocationPermission) {
        const foregroundPermission = await Location.requestForegroundPermissionsAsync();
        
        if (foregroundPermission.status !== 'granted') {
          Alert.alert(
            'Cần quyền truy cập vị trí',
            'Ứng dụng cần quyền truy cập vị trí để hiển thị các quán bar gần bạn.',
            [{ text: 'OK' }]
          );
          await AsyncStorage.setItem('hasDeclinedLocationPermission', 'true');
        }
      }

      // Kiểm tra quyền notification
      const hasDeclinedNotificationPermission = await AsyncStorage.getItem('hasDeclinedNotificationPermission');
      if (!hasDeclinedNotificationPermission) {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          Alert.alert(
            'Cần quyền thông báo',
            'Ứng dụng cần quyền thông báo để gửi các thông báo quan trọng đến bạn.',
            [{ text: 'OK' }]
          );
          await AsyncStorage.setItem('hasDeclinedNotificationPermission', 'true');
        }

        if (Platform.OS === 'android') {
          await messaging().setAutoInitEnabled(true);
        }

        // Đăng ký device token cho guest
        await fcmService.registerGuestDevice();
      }
    } catch (error) {
      console.error('Lỗi khi xin quyền:', error);
    }
  };

  const navigateNext = () => {
    if (isLoading || hasNavigated.current) return;
    
    hasNavigated.current = true;
    const nextRoute = isGuest ? '/(tabs)' : '/(auth)/welcome';
    
    setTimeout(() => {
      router.replace(nextRoute);
    }, 100);
  };

  useEffect(() => {
    let isMounted = true;

    const startAnimation = async () => {
      if (!isMounted) return;

      await runOnJS(requestPermissions)();

      opacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: 700 }),
        withTiming(0, { duration: 150 }, (finished) => {
          if (finished && isMounted) {
            runOnJS(navigateNext)();
          }
        })
      );

      scale.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: 700 }),
        withTiming(0.8, { duration: 150 })
      );
    };

    const timeout = setTimeout(startAnimation, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  return (
    <View className="flex-1 bg-black">
      <Animated.View className="flex-1 items-center justify-center">
        <AnimatedImage
          source={require('../assets/images/icon.png')}
          className="w-48 h-48"
          style={animatedStyle}
        />
      </Animated.View>
      
      <View className="absolute bottom-10 w-full items-center">
        <Text className="text-white/50 text-sm">Version 1.0.0</Text>
      </View>
    </View>
  );
}
