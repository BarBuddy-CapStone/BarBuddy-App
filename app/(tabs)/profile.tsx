import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-xl">Hồ Sơ Screen</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

