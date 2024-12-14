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
import { savePreviousScreen } from '@/utils/navigation';
import { GuestView } from '@/components/GuestView';

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
      source={
        account?.image 
          ? { uri: account.image }
          : require('@/assets/images/default-avatar.png')
      }
      className="w-24 h-24 rounded-full bg-neutral-800"
      defaultSource={require('@/assets/images/default-avatar.png')}
      onError={(e) => {
      }}
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
      <Image
        source={require('@/assets/images/default-avatar.png')}
        className="w-24 h-24 rounded-full bg-neutral-800 opacity-30"
      />
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

// Thêm component mới cho tiêu đề nhóm
const MenuSection = memo(({ title }: { title: string }) => (
  <Text className="text-white/60 text-sm font-medium uppercase mb-3 mt-6 px-1">
    {title}
  </Text>
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

  // Cập nhật lại menuItems
  const menuItems = useCallback((): (MenuItem | { type: 'section', title: string })[] => [
    {
      type: 'section',
      title: 'Tài khoản'
    },
    {
      id: '1',
      icon: 'person-outline',
      title: 'Thông tin cá nhân',
      subtitle: 'Xem và chỉnh sửa thông tin của bạn',
      variant: 'default',
      onPress: () => router.push(`/profile-detail/${user?.accountId}` as any)
    },
    {
      id: '2',
      icon: 'time-outline',
      title: 'Lịch sử giao dịch',
      subtitle: 'Xem lại các giao dịch của bạn',
      variant: 'default',
      onPress: () => router.push(`/payment-history/${user?.accountId}` as any)
    },
    {
      type: 'section',
      title: 'Điều khoản'
    },
    {
      id: '3',
      icon: 'document-text-outline',
      title: 'Điều khoản sử dụng',
      subtitle: 'Các quy định và điều khoản',
      variant: 'default',
      onPress: () => router.push('/terms-and-policies')
    },
    {
      id: '4',
      icon: 'shield-checkmark-outline',
      title: 'Chính sách bảo mật',
      subtitle: 'Chính sách về quyền riêng tư',
      variant: 'default', 
      onPress: () => router.push('/privacy-policy')
    },
    {
      type: 'section',
      title: 'Khác'
    },
    {
      id: '5',
      icon: 'log-out-outline',
      title: 'Đăng xuất',
      subtitle: 'Tạm biệt!',
      variant: 'danger',
      onPress: () => setShowLogoutModal(true)
    }
  ], [router, user?.accountId]);

  // Cập nhật renderItem để xử lý cả MenuItem và section
  const renderItem = useCallback(({ item }: { item: MenuItem | { type: 'section', title: string } }) => {
    if ('type' in item && item.type === 'section') {
      return <MenuSection title={item.title} />;
    }
    return <MenuItem item={item as MenuItem} />;
  }, []);

  // Cập nhật keyExtractor
  const keyExtractor = useCallback((item: MenuItem | { type: 'section', title: string }) => {
    if ('type' in item) {
      return `section-${item.title}`;
    }
    return item.id;
  }, []);

  // Cập nhật ItemSeparatorComponent để có khoảng cách nhỏ hơn giữa các mục trong cùng một nhóm
  const ItemSeparator = memo(() => (
    <View style={{ height: 8 }} />
  ));

  useEffect(() => {
    if (user?.accountId) {
      setIsGuest(false);
      fetchAccount();
    }
  }, [user?.accountId, fetchAccount, setIsGuest]);

  // Render content based on guest status
  const renderContent = () => {
    if (isGuest || !user?.accountId) {
      return <GuestView screenName="profile" />;
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
                contentContainerStyle={{ padding: 24, paddingBottom: 80 }}
                ItemSeparatorComponent={ItemSeparator}
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
