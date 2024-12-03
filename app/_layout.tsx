import { useEffect } from 'react';
import { router, Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { View, Linking } from 'react-native';
import '@/services/background-messaging';
import { tokenService } from '@/services/token';

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
        gestureEnabled: true
      }}>
        <Stack.Screen name="onboarding" options={{ 
          animation: 'slide_from_right',
          gestureEnabled: true
        }} />
        <Stack.Screen name="(auth)" options={{ 
          animation: 'slide_from_right',
          gestureEnabled: true
        }} />
        <Stack.Screen name="(tabs)" options={{ 
          animation: 'fade',
          gestureEnabled: true
        }} />
        <Stack.Screen 
          name="payment/success/[paymentId]" 
          options={{ 
            animation: 'none',
            headerBackVisible: false,
            gestureEnabled: false
          }} 
        />
        <Stack.Screen 
          name="payment/failure/[paymentId]" 
          options={{ 
            animation: 'none',
            headerBackVisible: false,
            gestureEnabled: false
          }} 
        />
        <Stack.Screen 
          name="payment/error/[paymentId]" 
          options={{ 
            animation: 'none',
            headerBackVisible: false,
            gestureEnabled: false
          }} 
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Xử lý deep link khi app đang chạy
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Kiểm tra nếu app được mở bởi deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    if (!url) return;

    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);

      if (pathSegments[0] === 'payment' && pathSegments.length === 3) {
        const [_, status, paymentId] = pathSegments;
        
        if (['success', 'failure', 'error'].includes(status)) {
          // Đảm bảo navigation stack được reset hoàn toàn
          await router.replace('/(tabs)/booking-history');
          
          // Delay ngắn để đảm bảo navigation stack đã được reset
          setTimeout(() => {
            router.push({
              pathname: `/payment/${status}/${paymentId}` as any,
              params: { 
                fromPayment: 'true',
                clearHistory: 'true'
              }
            });
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
      router.replace('/payment/error/0');
    }
  };

  useEffect(() => {
    tokenService.setupAxiosInterceptors();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <AuthProvider>
        <LocationProvider>
          <NotificationProvider>
            <LoadingLayout loaded={loaded} />
          </NotificationProvider>
        </LocationProvider>
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
