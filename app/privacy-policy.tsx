import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  const Section = ({ 
    emoji, 
    title, 
    children, 
    index 
  }: { 
    emoji: string;
    title: string;
    children: React.ReactNode;
    index: number;
  }) => (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).springify()}
      className="bg-neutral-800/50 p-6 rounded-xl border border-neutral-700 mb-6"
    >
      <Text className="text-xl font-semibold mb-6 text-yellow-500 flex-row items-center">
        <Text className="text-2xl mr-2">{emoji}</Text>
        {title}
      </Text>
      {children}
    </Animated.View>
  );

  const BulletPoint = ({ children }: { children: React.ReactNode }) => (
    <View className="flex-row items-start mb-4">
      <Text className="text-yellow-500 mr-2">•</Text>
      <Text className="text-gray-300 flex-1">{children}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-4 pt-1 pb-2 flex-row items-center border-b border-white/10">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-9 w-9 bg-neutral-800 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="flex-1 text-yellow-500 text-lg font-bold text-center mr-9">
            Chính Sách Bảo Mật
          </Text>
        </View>

        <ScrollView 
          className="flex-1 px-4 py-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Intro */}
          <Animated.View 
            entering={FadeIn}
            className="items-center mb-8"
          >
            <Text className="text-gray-400 text-center">
              Cam kết bảo vệ thông tin cá nhân của khách hàng
            </Text>
          </Animated.View>

          {/* Sections */}
          <Section emoji="🔒" title="1. Thông Tin Thu Thập" index={0}>
            <BulletPoint>
              Thông tin cá nhân: họ tên, email, số điện thoại, ngày sinh
            </BulletPoint>
            <BulletPoint>
              Thông tin đặt bàn và lịch sử giao dịch
            </BulletPoint>
            <BulletPoint>
              Phản hồi và đánh giá của khách hàng
            </BulletPoint>
          </Section>

          <Section emoji="🛡️" title="2. Mục Đích Sử Dụng" index={1}>
            <BulletPoint>
              Xác thực và quản lý tài khoản người dùng
            </BulletPoint>
            <BulletPoint>
              Xử lý đơn đặt bàn và thanh toán
            </BulletPoint>
            <BulletPoint>
              Cải thiện chất lượng dịch vụ
            </BulletPoint>
            <BulletPoint>
              Gửi thông báo về đơn đặt bàn và khuyến mãi
            </BulletPoint>
          </Section>

          <Section emoji="🔐" title="3. Bảo Mật Thông Tin" index={2}>
            <BulletPoint>
              Mã hóa thông tin thanh toán và dữ liệu nhạy cảm
            </BulletPoint>
            <BulletPoint>
              Giới hạn quyền truy cập thông tin khách hàng
            </BulletPoint>
            <BulletPoint>
              Định kỳ kiểm tra và cập nhật hệ thống bảo mật
            </BulletPoint>
          </Section>

          <Section emoji="📜" title="4. Quyền Của Khách Hàng" index={3}>
            <BulletPoint>
              Quyền truy cập và chỉnh sửa thông tin cá nhân
            </BulletPoint>
            <BulletPoint>
              Quyền yêu cầu xóa tài khoản và dữ liệu
            </BulletPoint>
            <BulletPoint>
              Quyền từ chối nhận thông báo quảng cáo
            </BulletPoint>
          </Section>

          {/* Contact Section */}
          <Animated.View 
            entering={FadeInDown.delay(500).springify()}
            className="bg-yellow-500/10 p-6 rounded-xl border border-yellow-500/50 mb-6"
          >
            <View className="flex-row items-center mb-4">
              <Text className="text-2xl mr-2">📞</Text>
              <Text className="text-xl font-semibold text-yellow-500">
                Liên Hệ Về Vấn Đề Bảo Mật
              </Text>
            </View>

            <Text className="text-gray-300 font-medium mb-3">
              Nếu quý khách có bất kỳ thắc mắc nào về chính sách bảo mật, vui lòng liên hệ:
            </Text>

            <BulletPoint>
              Email: barbuddy05924@gmail.com
            </BulletPoint>
            <BulletPoint>
              Hotline: 0982502200
            </BulletPoint>

            <View className="bg-yellow-500/20 p-4 rounded-xl mt-4">
              <Text className="text-yellow-500 font-medium">
                Chúng tôi cam kết bảo vệ thông tin của quý khách và liên tục cập nhật các biện pháp bảo mật mới nhất.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
} 