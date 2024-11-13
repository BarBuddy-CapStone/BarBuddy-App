import { GOONG_API_KEY, GOONG_MAPS_KEY } from '@env';

export const GOONG_CONFIG = {
  API_KEY: GOONG_API_KEY,
  API_URL: 'https://rsapi.goong.io',
  MAPS_KEY: GOONG_MAPS_KEY
};

if (!GOONG_API_KEY || !GOONG_MAPS_KEY) {
  console.warn('GOONG_API_KEY hoặc GOONG_MAPS_KEY không được định nghĩa trong file .env');
} 