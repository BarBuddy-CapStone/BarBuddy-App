import messaging from '@react-native-firebase/messaging';

// Đăng ký task xử lý background message
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Received background message:', remoteMessage);
  // Để Firebase tự động xử lý hiển thị thông báo
  return Promise.resolve();
}); 