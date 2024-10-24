import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Image, Text, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  cancelAnimation
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function OnboardingScreen() {
  const router = useRouter();
  const { isGuest, isLoading } = useAuth();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const hasNavigated = useRef(false);

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

    const startAnimation = () => {
      if (!isMounted) return;

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
