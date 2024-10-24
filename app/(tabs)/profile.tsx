import { View, Text, ScrollView, Image, TouchableOpacity, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { accountService, type Account } from '@/services/account';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

export default function ProfileScreen() {
  const { user, logout, isGuest, setIsGuest } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const fetchAccount = async () => {
    if (!user?.accountId) return;
    try {
      const data = await accountService.getAccountInfo(user.accountId);
      setAccount(data);
    } catch (error) {
      console.error('Error fetching account:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAccount().finally(() => setRefreshing(false));
  }, [user?.accountId]);

  useEffect(() => {
    fetchAccount();
  }, [user?.accountId]);

  const handleLogoutConfirm = async () => {
    try {
      setLoggingOut(true);
      await logout();
      setAccount(null);
      Toast.show({
        type: 'success',
        text1: 'Đăng xuất thành công',
        text2: 'Hẹn gặp lại bạn!',
        position: 'bottom'
      });
      router.replace('/(auth)/welcome');
    } catch (error) {
      console.error('Error logging out:', error);
      Toast.show({
        type: 'error',
        text1: 'Đăng xuất thất bại',
        text2: 'Vui lòng thử lại sau',
        position: 'bottom'
      });
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const ProfileSkeleton = () => (
    <View className="animate-pulse">
      <View className="items-center">
        <View className="w-24 h-24 rounded-full bg-white/10" />
        <View className="h-6 w-40 bg-white/10 rounded-full mt-4" />
        <View className="h-4 w-32 bg-white/10 rounded-full mt-2" />
      </View>
    </View>
  );

  // Component cho Guest Mode
  const GuestView = () => {
    const handleNavigateToAuth = async (screen: 'login' | 'register') => {
      try {
        // Tắt chế độ khách và điều hướng ngay lập tức
        setIsGuest(false);
        router.replace(`/(auth)/${screen}`);
      } catch (error) {
        console.error('Error navigating to auth:', error);
      }
    };

    return (
      <Animated.View entering={FadeIn} className="flex-1 p-6">
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-white/10 rounded-full items-center justify-center">
            <Ionicons name="person-outline" size={48} color="#EAB308" />
          </View>
          <Text className="text-white text-xl font-bold mt-4">
            Chào mừng bạn đến với Bar Buddy
          </Text>
          <Text className="text-white/60 text-center mt-2">
            Đăng nhập hoặc đăng ký để trải nghiệm đầy đủ tính năng
          </Text>
        </View>

        <View className="space-y-4">
          <TouchableOpacity 
            onPress={() => handleNavigateToAuth('login')}
            className="w-full bg-yellow-500 py-4 rounded-full items-center"
          >
            <Text className="text-neutral-800 font-bold text-lg">
              Đăng nhập
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleNavigateToAuth('register')}
            className="w-full border border-white py-4 rounded-full items-center"
          >
            <Text className="text-white font-bold text-lg">
              Đăng ký
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 border-b border-white/10">
          <Text className="text-yellow-500 text-2xl font-bold">
            Hồ sơ
          </Text>
        </View>

        <ScrollView 
          className="flex-1"
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              enabled={!isGuest} // Disable refresh khi ở guest mode
            />
          }
        >
          {isGuest ? (
            <GuestView />
          ) : (
            loading ? (
              <ProfileSkeleton />
            ) : (
              <Animated.View entering={FadeIn} className="p-6">
                {/* Profile Info */}
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

                {/* Menu Items */}
                <View className="space-y-4">
                  <TouchableOpacity className="flex-row items-center bg-white/5 p-4 rounded-xl">
                    <Ionicons name="person-outline" size={24} color="#EAB308" />
                    <View className="flex-1 ml-3">
                      <Text className="text-white font-medium">Thông tin cá nhân</Text>
                      <Text className="text-white/60 text-sm">Cập nhật thông tin của bạn</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="white" />
                  </TouchableOpacity>

                  <TouchableOpacity className="flex-row items-center bg-white/5 p-4 rounded-xl">
                    <Ionicons name="time-outline" size={24} color="#EAB308" />
                    <View className="flex-1 ml-3">
                      <Text className="text-white font-medium">Lịch sử giao dịch</Text>
                      <Text className="text-white/60 text-sm">Xem lại các giao dịch của bạn</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="white" />
                  </TouchableOpacity>

                  {/* <TouchableOpacity className="flex-row items-center bg-white/5 p-4 rounded-xl">
                    <Ionicons name="settings-outline" size={24} color="#EAB308" />
                    <View className="flex-1 ml-3">
                      <Text className="text-white font-medium">Cài đặt</Text>
                      <Text className="text-white/60 text-sm">Thông báo, bảo mật</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="white" />
                  </TouchableOpacity> */}

                  <TouchableOpacity 
                    onPress={handleLogout}
                    disabled={loggingOut}
                    className="flex-row items-center bg-red-500/10 p-4 rounded-xl"
                  >
                    <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                    <View className="flex-1 ml-3">
                      <Text className="text-red-500 font-medium">
                        Đăng xuất
                      </Text>
                      <Text className="text-red-500/60 text-sm">
                        Tạm biệt!
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )
          )}
        </ScrollView>

        {/* Logout Modal */}
        {!isGuest && (
          <Modal
            animationType="fade"
            transparent={true}
            visible={showLogoutModal}
            onRequestClose={() => setShowLogoutModal(false)}
          >
            <View className="flex-1 bg-black/50 justify-center items-center">
              <View className="bg-neutral-900 m-6 p-6 rounded-3xl w-[85%]">
                <View className="items-center mb-6">
                  <View className="w-16 h-16 bg-red-500/10 rounded-full items-center justify-center mb-4">
                    <Ionicons name="log-out-outline" size={32} color="#EF4444" />
                  </View>
                  <Text className="text-white text-xl font-bold mb-2">
                    Xác nhận đăng xuất
                  </Text>
                  <Text className="text-white/60 text-center">
                    Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?
                  </Text>
                </View>

                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    onPress={() => setShowLogoutModal(false)}
                    disabled={loggingOut}
                    className="flex-1 py-4 rounded-2xl bg-white/5"
                  >
                    <Text className="text-white font-medium text-center">
                      Hủy
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleLogoutConfirm}
                    disabled={loggingOut}
                    className="flex-1 py-4 rounded-2xl bg-red-500"
                  >
                    {loggingOut ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-medium text-center">
                        Đăng xuất
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
        
        {/* Toast Message */}
        <Toast />
      </SafeAreaView>
    </View>
  );
}
