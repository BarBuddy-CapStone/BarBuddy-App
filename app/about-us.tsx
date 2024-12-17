import React from 'react';
import { View, Text, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const FeatureCard = ({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) => (
  <Animated.View 
    entering={FadeInRight.delay(300)}
    className="bg-neutral-800 p-6 rounded-xl mb-4"
  >
    <View className="w-12 h-12 bg-yellow-500 rounded-full items-center justify-center mb-4">
      <Text className="text-2xl">{icon}</Text>
    </View>
    <Text className="text-xl font-semibold text-yellow-500 mb-3">{title}</Text>
    <Text className="text-gray-300">{description}</Text>
  </Animated.View>
);

const Copyright = () => (
  <Animated.View 
    entering={FadeInDown.delay(500)}
    className="py-6 px-4 border-t border-white/10 mt-4"
  >
    <Text className="text-gray-400 text-center text-sm">
      © 2024 Bar Buddy - FA24SE068. All rights reserved.
    </Text>
    <Text className="text-gray-500 text-center text-xs mt-1">
      BarBuddy v1.0.0
    </Text>
  </Animated.View>
);

const AboutUs = () => {
  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center px-4 py-3 border-b border-white/10">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold ml-3">Về chúng tôi</Text>
        </View>

        <ScrollView 
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Hero Section */}
          <Animated.View 
            entering={FadeInDown.delay(100)}
            className="items-center my-8"
          >
            <Text className="text-3xl font-bold text-amber-400 text-center mb-4">
              Bar Buddy - Người Bạn Đồng Hành
            </Text>
            <Text className="text-base text-gray-300 text-center">
              Khám phá không gian giải trí đẳng cấp cùng hệ thống quản lý bar thông minh
            </Text>
          </Animated.View>

          {/* Mission & Vision */}
          <Animated.View 
            entering={FadeInDown.delay(200)}
            className="bg-neutral-800 p-6 rounded-xl mb-6"
          >
            <Text className="text-xl font-bold text-yellow-500 mb-3">Sứ Mệnh</Text>
            <Text className="text-gray-300 mb-6 leading-5">
              Bar Buddy ra đời với sứ mệnh mang đến trải nghiệm giải trí đẳng cấp và tiện lợi nhất cho người dùng. 
              Chúng tôi kết nối những người yêu thích không gian bar với những địa điểm tốt nhất tại Sài Gòn.
            </Text>

            <Text className="text-xl font-bold text-yellow-500 mb-3">Tầm Nhìn</Text>
            <Text className="text-gray-300 leading-5">
              Trở thành nền tảng hàng đầu trong lĩnh vực kết nối và quản lý hệ thống bar, 
              mang đến những trải nghiệm giải trí độc đáo và an toàn cho cộng đồng.
            </Text>
          </Animated.View>

          {/* Features */}
          <Text className="text-2xl font-bold text-amber-400 mb-6">Điểm Nổi Bật</Text>
          <FeatureCard 
            icon="🎵"
            title="Không Gian Đẳng Cấp"
            description="Hệ thống bar được tuyển chọn kỹ lưỡng, đảm bảo chất lượng và phong cách độc đáo"
          />
          <FeatureCard 
            icon="🍸"
            title="Đồ Uống Đặc Sắc"
            description="Menu đa dạng với các loại cocktail độc đáo và đồ uống cao cấp"
          />
          <FeatureCard 
            icon="📱"
            title="Đặt Chỗ Dễ Dàng"
            description="Hệ thống đặt chỗ thông minh, nhanh chóng và tiện lợi"
          />

          {/* Contact */}
          <Animated.View 
            entering={FadeInDown.delay(400)}
            className="bg-neutral-800 p-6 rounded-xl mb-6"
          >
            <Text className="text-2xl font-bold text-amber-400 mb-4 text-center">
              Liên Hệ Với Chúng Tôi
            </Text>
            <Text className="text-gray-300 mb-4 text-center">
              Hãy để chúng tôi đồng hành cùng bạn trong hành trình khám phá những trải nghiệm tuyệt vời
            </Text>
            <TouchableOpacity 
              onPress={() => Linking.openURL('mailto:barbuddy05924@gmail.com')}
              className="mb-2"
            >
              <Text className="text-gray-300 text-center text-yellow-500">Email: barbuddy05924@gmail.com</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => Linking.openURL('tel:0982502200')}
            >
              <Text className="text-gray-300 text-center text-yellow-500">Hotline: 0982502200</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Copyright Section */}
          <Copyright />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default AboutUs; 