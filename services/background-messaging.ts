import messaging from '@react-native-firebase/messaging';

// Đăng ký task xử lý background message
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
}); 