import AsyncStorage from '@react-native-async-storage/async-storage';

const PREVIOUS_SCREEN_KEY = '@previous_screen';

export const savePreviousScreen = async (screen: string) => {
  try {
    await AsyncStorage.setItem(PREVIOUS_SCREEN_KEY, screen);
  } catch (error) {
    console.error('Error saving previous screen:', error);
  }
};

export const getPreviousScreen = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(PREVIOUS_SCREEN_KEY);
  } catch (error) {
    console.error('Error getting previous screen:', error);
    return null;
  }
};

export const clearPreviousScreen = async () => {
  try {
    await AsyncStorage.removeItem(PREVIOUS_SCREEN_KEY);
  } catch (error) {
    console.error('Error clearing previous screen:', error);
  }
}; 