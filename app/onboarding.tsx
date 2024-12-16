import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Image, Text, View, Alert, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  cancelAnimation,
  withDelay
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { fcmService } from '@/services/fcm';
import { tokenService } from '@/services/token';
import { ActivityIndicator } from 'react-native';
import { notificationService } from '@/services/notification';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function OnboardingScreen() {
  const router = useRouter();
  const { isGuest, isLoading, resetAllStorage } = useAuth();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const spinnerOpacity = useSharedValue(0);
  const hasNavigated = useRef(false);

  const requestPermissions = async () => {
    try {
      // Kiểm tra quyền vị trí
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
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Kiểm tra quyền thông báo
      const hasDeclinedNotificationPermission = await AsyncStorage.getItem('hasDeclinedNotificationPermission');
      if (!hasDeclinedNotificationPermission) {
        try {
          // Yêu cầu quyền thông báo trực tiếp
          const permissionResult = await messaging().requestPermission();
          
          if (permissionResult === messaging.AuthorizationStatus.DENIED) {
            Alert.alert(
              'Cần quyền thông báo',
              'Ứng dụng cần quyền thông báo để gửi các thông báo quan trọng đến bạn.',
              [{ text: 'OK' }]
            );
            await AsyncStorage.setItem('hasDeclinedNotificationPermission', 'true');
          } else if (permissionResult === messaging.AuthorizationStatus.AUTHORIZED ||
                    permissionResult === messaging.AuthorizationStatus.PROVISIONAL) {
            if (Platform.OS === 'android') {
              await messaging().setAutoInitEnabled(true);
            }
            const fcmToken = await notificationService.registerForPushNotificationsAsync();
            if (fcmToken) {
              await fcmService.registerGuestDevice();
            }
          }
        } catch (error) {
          console.error('Lỗi khi xin quyền thông báo:', error);
          await AsyncStorage.setItem('hasDeclinedNotificationPermission', 'true');
        }
      } else {
        // Kiểm tra nếu đã có quyền thì đăng ký device
        const currentPermission = await messaging().hasPermission();
        if (currentPermission === messaging.AuthorizationStatus.AUTHORIZED ||
            currentPermission === messaging.AuthorizationStatus.PROVISIONAL) {
          if (Platform.OS === 'android') {
            await messaging().setAutoInitEnabled(true);
          }
          const fcmToken = await notificationService.registerForPushNotificationsAsync();
          if (fcmToken) {
            await fcmService.registerGuestDevice();
          }
        }
      }
    } catch (error) {
      console.error('Lỗi khi xin quyền:', error);
    }
  };

  const checkAuth = async () => {
    if (!isGuest) {
      try {
        const isValid = await tokenService.checkAndSetupAuth();
        if (!isValid) {
          await resetAllStorage();
          return false;
        }
        return true;
      } catch (error) {
        console.error('Error checking auth:', error);
        await resetAllStorage();
        return false;
      }
    }
    return false;
  };

  const performChecks = async () => {
    // Hiển thị spinner
    spinnerOpacity.value = withTiming(1, { duration: 150 });
    
    // Thực hiện các kiểm tra
    await requestPermissions();
    const isAuthenticated = await checkAuth();

    // Animation kết thúc và chuyển màn hình ngay lập tức
    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0.8, { duration: 200 });
    spinnerOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(navigateToNextScreen)(isAuthenticated);
    });
  };

  const navigateToNextScreen = (isAuthenticated: boolean) => {
    if (isLoading || hasNavigated.current) return;
    hasNavigated.current = true;
    
    // Set app ready trước khi navigate
    notificationService.setAppReady(true);
    
    if (!isAuthenticated && !isGuest) {
      router.replace('/(auth)/welcome');
      return;
    }
    router.replace('/(tabs)');
  };

  useEffect(() => {
    let isMounted = true;

    const startAnimation = () => {
      if (!isMounted) return;

      // Animation xuất hiện logo
      opacity.value = withTiming(1, { duration: 500 });
      scale.value = withTiming(1, { duration: 500 }, () => {
        // Sau khi logo xuất hiện, bắt đầu kiểm tra
        runOnJS(performChecks)();
      });
    };

    // Bắt đầu animation ngay lập tức
    startAnimation();

    return () => {
      isMounted = false;
      cancelAnimation(opacity);
      cancelAnimation(scale);
      cancelAnimation(spinnerOpacity);
    };
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    opacity: spinnerOpacity.value
  }));

  return (
    <View className="flex-1 bg-black">
      <Animated.View className="flex-1 items-center justify-center">
        <AnimatedImage
          source={require('../assets/images/icon.png')}
          className="w-48 h-48"
          style={logoStyle}
        />
        <Animated.View 
          className="absolute bottom-32"
          style={spinnerStyle}
        >
          <ActivityIndicator size="large" color="#EAB308" />
        </Animated.View>
      </Animated.View>
      
      <View className="absolute bottom-10 w-full items-center">
        <Text className="text-white/50 text-sm">Version 1.0.1</Text>
      </View>
    </View>
  );
}
