import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthHeader {
  headers?: {
    Authorization: string;
  };
}

export async function getAuthHeader(): Promise<AuthHeader> {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      return {}; // Trả về empty object cho guest
    }
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  } catch (error) {
    console.error('Error getting auth header:', error);
    return {}; // Trả về empty object nếu có lỗi
  }
} 