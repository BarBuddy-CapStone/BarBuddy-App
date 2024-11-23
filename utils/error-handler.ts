import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export const handleConnectionError = async (
  callback: () => Promise<any>,
  errorMessage: string = 'Không thể kết nối đến máy chủ'
) => {
  try {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return new Promise((resolve) => {
        Alert.alert(
          'Lỗi kết nối',
          'Không có kết nối internet. Vui lòng kiểm tra lại kết nối của bạn.',
          [
            { text: 'Đóng', style: 'cancel' },
            {
              text: 'Thử lại',
              onPress: async () => {
                resolve(await handleConnectionError(callback, errorMessage));
              },
            },
          ]
        );
      });
    }

    return await callback();
  } catch (error) {
    return new Promise((resolve) => {
      Alert.alert(
        'Lỗi kết nối',
        errorMessage,
        [
          { text: 'Đóng', style: 'cancel' },
          {
            text: 'Thử lại',
            onPress: async () => {
              resolve(await handleConnectionError(callback, errorMessage));
            },
          },
        ]
      );
    });
  }
}; 