import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function OnboardingScreen() {
  const router = useRouter();
  const { setIsFirstTime, isGuest, isLoading } = useAuth();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);

  const navigateNext = () => {
    if (isLoading) return;
    
    setIsFirstTime(false);
    const nextRoute = isGuest ? '/(tabs)' : '/(auth)/welcome';
    
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(router.replace)(nextRoute);
      }
    });
    scale.value = withTiming(0.8, { duration: 200 });
  };

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withTiming(1, { duration: 300 });

    const timeout = setTimeout(navigateNext, 1500);
    return () => clearTimeout(timeout);
  }, [isLoading]);

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
      
      {/* Version Text */}
      <View className="absolute bottom-10 w-full items-center">
        <Text className="text-white/50 text-sm">Version 1.0.0</Text>
      </View>
    </View>
  );
}
