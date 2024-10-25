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
  const { isAuthenticated, isGuest, isLoading, allowNavigation } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !allowNavigation) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (
      (inAuthGroup && isAuthenticated) ||
      (inTabsGroup && !isAuthenticated && !isGuest)
    ) {
      router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/welcome');
    }
  }, [isAuthenticated, isGuest, segments, isLoading, allowNavigation]);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'black' },
        animation: 'fade',
      }}>
        <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right' }} />
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
