import { View, Text, FlatList, Image, TouchableOpacity, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState, memo } from 'react';
import { accountService, type Account } from '@/services/account';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Định nghĩa interfaces
interface MenuItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  variant?: 'default' | 'warning' | 'danger';
}

// Các components con được tối ưu
const ProfileHeader = memo(({ account }: { account: Account | null }) => (
  <View className="items-center mb-8">
    <Image 
      source={{ uri: account?.image }} 
      className="w-24 h-24 rounded-full"
    />
    <Text className="text-white text-xl font-bold mt-4">
      {account?.fullname}
    </Text>
    <Text className="text-white/60">
      {account?.email}
    </Text>
  </View>
));

const MenuItem = memo(({ item }: { item: MenuItem }) => {
  const getVariantStyles = () => {
    switch (item.variant) {
      case 'warning':
        return {
          container: 'bg-orange-500/10',
          icon: '#F97316',
          text: 'text-orange-500',
          subtext: 'text-orange-500/60'
        };
      case 'danger':
        return {
          container: 'bg-red-500/10',
          icon: '#EF4444',
          text: 'text-red-500',
          subtext: 'text-red-500/60'
        };
      default:
        return {
          container: 'bg-neutral-900',
          icon: '#EAB308',
          text: 'text-white',
          subtext: 'text-white/60'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <TouchableOpacity 
      onPress={item.onPress}
      className={`flex-row items-center p-4 rounded-xl ${styles.container}`}
    >
      <Ionicons name={item.icon} size={24} color={styles.icon} />
      <View className="flex-1 ml-3">
        <Text className={`font-medium ${styles.text}`}>
          {item.title}
        </Text>
        <Text className={`text-sm ${styles.subtext}`}>
          {item.subtitle}
        </Text>
      </View>
      {item.variant === 'default' && (
        <Ionicons name="chevron-forward" size={24} color="white" />
      )}
    </TouchableOpacity>
  );
});

const ProfileSkeleton = memo(() => (
  <View className="animate-pulse p-6">
    <View className="items-center">
      <View className="w-24 h-24 rounded-full bg-white/10" />
      <View className="h-6 w-40 bg-white/10 rounded-full mt-4" />
      <View className="h-4 w-32 bg-white/10 rounded-full mt-2" />
    </View>
  </View>
));

const LogoutModal = memo(({ 
  visible, 
  onClose, 
  onConfirm, 
  loading 
}: { 
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <View className="flex-1 bg-black/50 justify-center items-center p-6">
      <View className="bg-neutral-900 w-full rounded-2xl p-6">
        <Text className="text-white text-xl font-bold text-center mb-2">
          Đăng xuất
        </Text>
        <Text className="text-white/60 text-center mb-6">
          Bạn có chắc chắn muốn đăng xuất?
        </Text>
        
        <View className="flex-row space-x-3">
          <TouchableOpacity
            className="flex-1 bg-white/10 py-3 rounded-xl"
            onPress={onClose}
          >
            <Text className="text-white font-bold text-center">
              Hủy
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="flex-1 bg-red-500 py-3 rounded-xl"
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-center">
                Đăng xuất
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
));

const GuestView = memo(() => (
  <View className="flex-1 bg-black p-6 items-center justify-center">
    <Ionicons name="person-circle-outline" size={64} color="#EAB308" />
    <Text className="text-white text-xl font-bold mt-4 text-center">
      Chưa đăng nhập
    </Text>
    <Text className="text-white/60 text-center mt-2 mb-8">
      Vui lòng đăng nhập để xem thông tin tài khoản
    </Text>
    
    <TouchableOpacity
      className="bg-yellow-500 py-3 px-6 rounded-xl w-full"
      onPress={() => router.push('/(auth)/login')}
    >
      <Text className="text-black font-bold text-center">
        Đăng nhập
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      className="bg-transparent border border-yellow-500 mt-3 py-3 px-6 rounded-xl w-full"
      onPress={() => router.push('/(auth)/register')}
    >
      <Text className="text-yellow-500 font-bold text-center">
        Đăng ký
      </Text>
    </TouchableOpacity>
  </View>
));

export default function ProfileScreen() {
  const { user, logout, isGuest, setIsGuest } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutConfirm = useCallback(async () => {
    try {
      setLoggingOut(true);
      await logout();
      setAccount(null);
      setShowLogoutModal(false);
      setLoggingOut(false);
      router.replace('/(auth)/welcome');
    } catch (error) {
      setLoggingOut(false);
      setShowLogoutModal(false);
      Toast.show({
        type: 'error',
        text1: 'Đăng xuất thất bại',
        text2: 'Vui lòng thử lại sau',
        position: 'bottom'
      });
    }
  }, [logout]);

  const fetchAccount = useCallback(async () => {
    if (!user?.accountId) return;
    try {
      const data = await accountService.getAccountInfo(user.accountId);
      setAccount(data);
    } catch (error) {
      console.error('Error fetching account:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.accountId]);

  const menuItems = useCallback((): MenuItem[] => [
    {
      id: '1',
      icon: 'person-outline',
      title: 'Thông tin cá nhân',
      subtitle: 'Xem và chỉnh sửa thông tin của bạn',
      variant: 'default',
      onPress: () => router.push('/profile/edit' as any)
    },
    {
      id: '2',
      icon: 'time-outline',
      title: 'Lịch sử giao dịch',
      subtitle: 'Xem lại các giao dịch của bạn',
      variant: 'default',
      onPress: () => router.push('/profile/history' as any)
    },
    {
      id: '3',
      icon: 'log-out-outline',
      title: 'Đăng xuất',
      subtitle: 'Tạm biệt!',
      variant: 'danger',
      onPress: () => setShowLogoutModal(true)
    }
  ], [router]);

  const renderItem = useCallback(({ item }: { item: MenuItem }) => (
    <MenuItem item={item} />
  ), []);

  const keyExtractor = useCallback((item: MenuItem) => item.id, []);

  useEffect(() => {
    if (user?.accountId) {
      setIsGuest(false);
      fetchAccount();
    }
  }, [user?.accountId, fetchAccount, setIsGuest]);

  // Render content based on guest status
  const renderContent = () => {
    if (isGuest || !user?.accountId) {
      return <GuestView />;
    }

    return (
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          {loading ? (
            <ProfileSkeleton />
          ) : (
            <Animated.View entering={FadeIn} className="flex-1">
              <FlatList
                data={menuItems()}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                ListHeaderComponent={<ProfileHeader account={account} />}
                contentContainerStyle={{ padding: 24 }}
                ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                refreshControl={
                  <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={() => {
                      setRefreshing(true);
                      fetchAccount().finally(() => setRefreshing(false));
                    }}
                    enabled={!isGuest}
                    tintColor="#EAB308"
                  />
                }
              />
            </Animated.View>
          )}

          <LogoutModal
            visible={showLogoutModal}
            onClose={() => setShowLogoutModal(false)}
            onConfirm={handleLogoutConfirm}
            loading={loggingOut}
          />
        </SafeAreaView>
      </View>
    );
  };

  return renderContent();
}
