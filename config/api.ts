import Constants from 'expo-constants';

const { apiUrl, apiTimeout } = Constants.expoConfig?.extra || {};

export const API_CONFIG = {
  BASE_URL: apiUrl,
  TIMEOUT: parseInt(apiTimeout || '10000', 10),
};

if (!apiUrl) {
  console.warn('API_URL không được định nghĩa trong file .env');
}
