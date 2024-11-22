import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { savePreviousScreen } from '@/utils/navigation';

export const GuestView = ({ screenName }: { screenName: string }) => {
  const handleNavigateToLogin = async () => {
    await savePreviousScreen(screenName);
    router.push('/login');
  };

  const handleNavigateToRegister = async () => {
    await savePreviousScreen(screenName);
    router.push('/register');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Ionicons name="lock-closed-outline" size={64} color="#EAB308" />
          <Text style={styles.title}>
            Đăng nhập để tiếp tục
          </Text>
          <Text style={styles.subtitle}>
            Bạn cần đăng nhập để xem thông tin của mình
          </Text>
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleNavigateToLogin}
          >
            <Text style={styles.loginButtonText}>
              Đăng nhập ngay
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleNavigateToRegister}
          >
            <Text style={styles.registerButtonText}>
              Đăng ký tài khoản
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#EAB308',
    width: '100%',
    padding: 12,
    borderRadius: 12,
  },
  loginButtonText: {
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 18,
  },
  registerButton: {
    marginTop: 16,
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  registerButtonText: {
    color: '#EAB308',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 18,
  },
}); 