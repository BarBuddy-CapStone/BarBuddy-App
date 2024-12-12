import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

export default function TermsAndPoliciesScreen() {
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
            Điều Khoản và Chính Sách
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
              Vui lòng đọc kỹ các điều khoản trước khi sử dụng dịch vụ
            </Text>
          </Animated.View>

          {/* Sections */}
          <Section emoji="📋" title="1. Quy Định Đặt Bàn" index={0}>
            <BulletPoint>
              Quý khách chỉ được đặt một khung giờ mỗi ngày tại một quán bar.
            </BulletPoint>
            <BulletPoint>
              Số lượng bàn tối đa có thể đặt trong một lần là 5 bàn.
            </BulletPoint>
            <BulletPoint>
              Khi quý khách chuyển sang khung giờ khác, danh sách bàn đã chọn trước đó sẽ bị hủy.
            </BulletPoint>
            <BulletPoint>
              Quý khách cần đặt ít nhất 1 bàn để tiến hành thanh toán.
            </BulletPoint>
          </Section>

          <Section emoji="💳" title="2. Chính Sách Thanh Toán" index={1}>
            <BulletPoint>
              Thanh toán được thực hiện thông qua các cổng thanh toán trực tuyến được hệ thống hỗ trợ.
            </BulletPoint>
            <BulletPoint>
              Quý khách sẽ nhận được thông báo xác nhận sau khi thanh toán thành công.
            </BulletPoint>
            <BulletPoint>
              Chúng tôi không áp dụng chính sách hoàn tiền cho các đơn đặt bàn đã được thanh toán.
            </BulletPoint>
          </Section>

          <Section emoji="🕒" title="3. Chính Sách Hủy Đặt Bàn" index={2}>
            <BulletPoint>
              Quý khách có thể hủy đặt bàn miễn phí trước khi thanh toán.
            </BulletPoint>
            <BulletPoint>
              Sau khi thanh toán, quý khách chỉ có thể hủy đặt bàn trước 2 giờ so với thời gian đã đặt.
            </BulletPoint>
            <BulletPoint>
              Đối với đặt bàn thường, vui lòng check-in trước 1 giờ so với thời gian đặt để tránh bị hủy tự động.
            </BulletPoint>
            <BulletPoint>
              Đối với đặt bàn kèm đồ uống, quý khách có thể check-in trong suốt khung giờ hoạt động của quán.
            </BulletPoint>
          </Section>

          <Section emoji="⭐" title="4. Đánh Giá Dịch Vụ" index={3}>
            <BulletPoint>
              Quý khách có thể đánh giá và chia sẻ trải nghiệm sau khi sử dụng dịch vụ.
            </BulletPoint>
            <BulletPoint>
              Mỗi lần đặt bàn, quý khách có thể gửi một đánh giá.
            </BulletPoint>
          </Section>

          <Section emoji="📜" title="5. Quy Định Chung" index={4}>
            <BulletPoint>
              <Text>
                Quý khách <Text className="text-yellow-500 font-semibold">phải từ 18 tuổi trở lên</Text> để sử dụng dịch vụ đặt bàn.
              </Text>
            </BulletPoint>
            <BulletPoint>
              Vui lòng cung cấp thông tin chính xác khi đăng ký và đặt bàn.
            </BulletPoint>
            <BulletPoint>
              Mọi thông tin cá nhân của quý khách sẽ được bảo mật theo quy định.
            </BulletPoint>
          </Section>

          {/* Warning Section */}
          <Animated.View 
            entering={FadeInDown.delay(500).springify()}
            className="bg-yellow-500/10 p-6 rounded-xl border border-yellow-500/50 mb-6"
          >
            <View className="flex-row items-center mb-4">
              <Text className="text-2xl mr-2">⚠️</Text>
              <Text className="text-xl font-semibold text-yellow-500">
                Lưu ý về sử dụng đồ uống có cồn
              </Text>
            </View>

            <View className="mb-4">
              <Image 
                source={require('@/assets/images/WarningDrink.png')}
                className="w-full h-28 rounded-xl"
                resizeMode="cover"
              />
            </View>

            <Text className="text-gray-300 font-medium mb-3">
              Vì sự an toàn của quý khách và mọi người, chúng tôi khuyến cáo:
            </Text>

            <BulletPoint>
              <Text className="text-yellow-500 font-semibold">
                Uống có trách nhiệm
              </Text>
            </BulletPoint>
            <BulletPoint>
              <Text className="text-yellow-500 font-semibold">
                Không lái xe khi đã sử dụng đồ uống có cồn
              </Text>
            </BulletPoint>
            <BulletPoint>
              <Text>
                Tuân thủ quy định về{' '}
                <Text className="text-yellow-500 font-semibold">
                  độ tuổi sử dụng đồ uống có cồn
                </Text>
              </Text>
            </BulletPoint>

            <View className="bg-yellow-500/20 p-4 rounded-xl mt-4">
              <Text className="text-yellow-500 font-medium">
                Dịch vụ không dành cho người dưới 18 tuổi và phụ nữ đang mang thai.
              </Text>
              <Text className="text-yellow-500 font-medium mt-2">
                Chúng tôi có quyền từ chối phục vụ nếu phát hiện vi phạm.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
} 