import Constants from 'expo-constants';

const { goongApiKey, goongMapsKey } = Constants.expoConfig?.extra || {};

export const GOONG_CONFIG = {
  API_KEY: goongApiKey,
  API_URL: 'https://rsapi.goong.io',
  MAPS_KEY: goongMapsKey
};

if (!goongApiKey || !goongMapsKey) {
  console.warn('GOONG_API_KEY hoặc GOONG_MAPS_KEY không được định nghĩa trong file .env');
} 