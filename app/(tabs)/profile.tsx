import { View, Text, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { user } = useAuth();

  return (
    <ScrollView className="flex-1 bg-black p-4">
      <View className="bg-white/10 p-4 rounded-xl">
        <Text className="text-white text-lg font-bold mb-4">Thông tin người dùng:</Text>
        
        <View className="space-y-2">
          <Text className="text-white">Account ID: {user?.accountId}</Text>
          <Text className="text-white">Họ tên: {user?.fullname}</Text>
          <Text className="text-white">Email: {user?.email}</Text>
          <Text className="text-white">Số điện thoại: {user?.phone}</Text>
          <Text className="text-white">Role: {user?.role}</Text>
          <Text className="text-white">Identity ID: {user?.identityId || 'Không có'}</Text>
          <Text className="text-white">Access Token: {user?.accessToken.substring(0, 20)}...</Text>
        </View>
      </View>
    </ScrollView>
  );
}
