import { useEffect, useRef, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { View } from 'react-native';

// Giữ splash screen hiển thị
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, isGuest, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const initialRoute = useRef(true);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';

    if (initialRoute.current) {
      initialRoute.current = false;
      requestAnimationFrame(() => {
        router.replace('/onboarding');
      });
      return;
    }

    if (!inOnboarding) {
      if (isAuthenticated && !inTabsGroup) {
        router.replace('/(tabs)');
      } else if (!isAuthenticated && !isGuest && !inAuthGroup) {
        router.replace('/(auth)/welcome');
      }
    }
  }, [isAuthenticated, isGuest, segments, isLoading]);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          animation: 'fade',
          animationDuration: 300,
          contentStyle: {
            backgroundColor: 'black'
          }
        }}
      >
        <Stack.Screen 
          name="onboarding"
          options={{
            animation: 'none',
            gestureEnabled: false
          }}
        />
        <Stack.Screen name="(auth)" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <AuthProvider>
        <LoadingLayout loaded={loaded} />
      </AuthProvider>
    </View>
  );
}

function LoadingLayout({ loaded }: { loaded: boolean }) {
  const { isLoading } = useAuth();
  
  useEffect(() => {
    if (loaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isLoading]);

  if (!loaded || isLoading) {
    return null;
  }

  return <RootLayoutNav />;
}
