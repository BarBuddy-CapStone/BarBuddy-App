import { API_URL, API_TIMEOUT } from '@env';

export const API_CONFIG = {
  BASE_URL: API_URL,
  TIMEOUT: parseInt(API_TIMEOUT, 10),
};

if (!API_URL) {
  console.warn('API_URL không được định nghĩa trong file .env');
}
