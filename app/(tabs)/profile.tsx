import { View, Text, ScrollView, Image, TouchableOpacity, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { accountService, type Account } from '@/services/account';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  useEffect(() => {
    if (user?.accountId) {
      setIsGuest(false); // Đảm bảo isGuest được set false khi có user
    }
  }, [user?.accountId, setIsGuest]);

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

  // Thay thế component GuestView hiện tại bằng phiên bản mới này
  const GuestView = () => {
    return (
      <View className="flex-1">
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="lock-closed-outline" size={64} color="#EAB308" />
          <Text className="text-white text-xl font-bold mt-6 text-center">
            Đăng nhập để xem hồ sơ
          </Text>
          <Text className="text-white/60 text-center mt-2 mb-6">
            Bạn cần đăng nhập để xem và quản lý thông tin cá nhân
          </Text>
          
          <TouchableOpacity
            className="bg-yellow-500 w-full py-3 rounded-xl"
            onPress={() => router.push('/login')}
          >
            <Text className="text-black font-bold text-center text-lg">
              Đăng nhập ngay
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-4 w-full py-3 rounded-xl border border-yellow-500"
            onPress={() => router.push('/register')}
          >
            <Text className="text-yellow-500 font-bold text-center text-lg">
              Đăng ký tài khoản
            </Text>
          </TouchableOpacity>

          {/* Thêm nút Reset App */}
          <TouchableOpacity 
            onPress={() => {
              // Reset toàn bộ app state
              setAccount(null);
              setIsGuest(true);
              logout();
              // Clear storage
              AsyncStorage.clear();
              // Redirect về màn welcome
              router.replace('/(auth)/welcome');
              // Hiển thị thông báo
              Toast.show({
                type: 'success',
                text1: 'Đã reset ứng dụng',
                text2: 'Tất cả dữ liệu đã được xóa',
                position: 'bottom'
              });
            }}
            className="mt-8 flex-row items-center justify-center bg-orange-500/10 py-3 px-4 rounded-xl"
          >
            <Ionicons name="refresh-circle-outline" size={24} color="#F97316" />
            <Text className="text-orange-500 font-medium ml-2">
              Reset App
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isGuest || !user?.accountId) {
    return (
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          <View className="px-6 py-4 border-b border-white/10">
            <Text className="text-yellow-500 text-2xl font-bold">
              Hồ sơ
            </Text>
          </View>
          <View className="flex-1 justify-center">
            <GuestView />
          </View>
        </SafeAreaView>
      </View>
    );
  }

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
              enabled={!isGuest}
              tintColor="#EAB308"
            />
          }
        >
          {loading ? (
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

                <TouchableOpacity 
                  onPress={() => {
                    // Reset toàn bộ app state
                    setAccount(null);
                    setIsGuest(true);
                    logout();
                    // Clear storage nếu cần
                    AsyncStorage.clear();
                    // Redirect về màn welcome
                    router.replace('/(auth)/welcome');
                    // Hiển thị thông báo
                    Toast.show({
                      type: 'success',
                      text1: 'Đã reset ứng dụng',
                      text2: 'Tất cả dữ liệu đã được xóa',
                      position: 'bottom'
                    });
                  }}
                  className="flex-row items-center bg-orange-500/10 p-4 rounded-xl"
                >
                  <Ionicons name="refresh-circle-outline" size={24} color="#F97316" />
                  <View className="flex-1 ml-3">
                    <Text className="text-orange-500 font-medium">
                      Reset App
                    </Text>
                    <Text className="text-orange-500/60 text-sm">
                      Xóa tất cả dữ liệu và reset ứng dụng
                    </Text>
                  </View>
                </TouchableOpacity>

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
          )}
        </ScrollView>

        {/* Logout Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showLogoutModal}
          onRequestClose={() => setShowLogoutModal(false)}
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
                  onPress={() => setShowLogoutModal(false)}
                >
                  <Text className="text-white font-bold text-center">
                    Hủy
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  className="flex-1 bg-red-500 py-3 rounded-xl"
                  onPress={handleLogoutConfirm}
                  disabled={loggingOut}
                >
                  {loggingOut ? (
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
      </SafeAreaView>
    </View>
  );
}
