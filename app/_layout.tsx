import { useEffect } from 'react';
import { router, Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { View, Linking } from 'react-native';

// Giữ splash screen hiển thị
SplashScreen.preventAutoHideAsync();

// Thêm khai báo type ở đầu file
declare global {
  namespace ReactNavigation {
    interface RootParamList {
      '/payment/[status]/[paymentId]': {
        status: 'success' | 'failure' | 'error';
        paymentId: string;
      };
    }
  }
}

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
        <Stack.Screen name="payment/success/[paymentId]" />
        <Stack.Screen name="payment/failure/[paymentId]" />
        <Stack.Screen name="payment/error/[paymentId]" />
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

  const handleDeepLink = (url: string) => {
    if (!url) return;

    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);

      if (pathSegments[0] === 'payment' && pathSegments.length === 3) {
        const [_, status, paymentId] = pathSegments;
        
        if (['success', 'failure', 'error'].includes(status)) {
          router.replace({
            pathname: '/payment/[status]/[paymentId]' as any,
            params: { 
              status: status as 'success' | 'failure' | 'error', 
              paymentId 
            }
          });
        }
      }
    } catch (error) {
      console.error('Error parsing deep link URL:', error);
    }
  };

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
