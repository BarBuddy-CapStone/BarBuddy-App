import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';

// Đăng ký task xử lý background message
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Received background message:', JSON.stringify(remoteMessage, null, 2));
  console.log('Background message data:', JSON.stringify(remoteMessage.data, null, 2));
  return Promise.resolve();
});