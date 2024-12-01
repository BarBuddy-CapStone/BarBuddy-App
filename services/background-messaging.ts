import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';

// Đăng ký task xử lý background message
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Received background message:', remoteMessage);
  return Promise.resolve();
});