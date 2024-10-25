import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function DrinksSelectionScreen() {
  const { id, tables, date, time } = useLocalSearchParams();
  
  return (
    <View>
      <Text>Drinks Selection Screen</Text>
    </View>
  );
}
