import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

export const toastConfig = {
  success: (props: any) => (
    <View style={styles.container}>
      <View style={[styles.toastContainer, styles.successBorder]}>
        <View style={styles.contentContainer}>
          <Ionicons name="checkmark-circle" size={24} color="#EAB308" />
          <View style={styles.textContainer}>
            <Text style={styles.titleText}>
              {props.text1}
            </Text>
            <Text style={styles.messageText}>
              {props.text2}
            </Text>
          </View>
        </View>
      </View>
    </View>
  ),
  error: (props: any) => (
    <View style={styles.container}>
      <View style={[styles.toastContainer, styles.errorBorder]}>
        <View style={styles.contentContainer}>
          <Ionicons name="alert-circle" size={24} color="#EF4444" />
          <View style={styles.textContainer}>
            <Text style={styles.titleText}>
              {props.text1}
            </Text>
            <Text style={styles.messageText}>
              {props.text2}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
};

const styles = StyleSheet.create({
  container: {
    width: '90%',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  toastContainer: {
    backgroundColor: '#262626', // bg-neutral-800
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  successBorder: {
    borderLeftColor: '#EAB308', // border-yellow-500
  },
  errorBorder: {
    borderLeftColor: '#EF4444', // border-red-500
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  titleText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  messageText: {
    color: '#9CA3AF', // text-gray-400
    fontSize: 14,
    marginTop: 4,
  },
});

export const showToast = (type: 'success' | 'error', title: string, message: string) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: 'bottom',
    visibilityTime: 2000,
    bottomOffset: 40,
  });
}; 