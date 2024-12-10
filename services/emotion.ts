import { Alert } from 'react-native';
import api from './api';
import { Drink } from './drink';
import { handleConnectionError } from '@/utils/error-handler';
import axios from 'axios';

export interface EmotionResponseItem {
  drink: Drink;
  reason: string;
}

interface EmotionApiResponse {
  statusCode: number;
  message: string;
  data: EmotionResponseItem[];
}

class EmotionService {
  /**
   * Get drink recommendations based on emotion
   * @param emotion - User's emotion text
   * @param barId - ID of the bar
   * @returns Promise<EmotionResponseItem[]> - Array of recommended drinks
   */
  async getDrinkRecommendations(
    emotion: string, 
    barId: string,
    onCancel?: () => void
  ): Promise<EmotionResponseItem[]> {
    try {
      // Tạo CancelToken source để handle timeout
      const source = axios.CancelToken.source();
      
      // Set timeout 30 seconds
      const timeout = setTimeout(() => {
        source.cancel('Timeout - Request took too long');
      }, 30000);

      try {
        const response = await api.get<EmotionApiResponse>(
          `/api/DrinkRecommendation/drink-recommendation-v2`, 
          {
            params: {
              emotion,
              barId
            },
            cancelToken: source.token
          }
        );

        // Clear timeout nếu request thành công
        clearTimeout(timeout);

        if (response.data.statusCode === 200) {
          return response.data.data;
        }
        
        throw new Error(response.data.message);
      } catch (error) {
        // Clear timeout để tránh memory leak
        clearTimeout(timeout);
        throw error;
      }

    } catch (error: any) {
      // Xử lý riêng cho timeout
      if (axios.isCancel(error)) {
        Alert.alert(
          "Quá thời gian", 
          "Không thể phân tích cảm xúc. Vui lòng thử lại sau."
        );
        throw new Error('Quá thời gian phân tích cảm xúc');
      }

      // Nếu là lỗi từ response của API
      if (error.response) {
        Alert.alert(
          "Lỗi phân tích", 
          "Không thể lấy gợi ý đồ uống. Vui lòng thử lại sau."
        );
        throw new Error(error.response.data.message);
      }

      // Nếu là error.message (từ throw new Error ở trên)
      if (error.message) {
        throw error;
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể lấy gợi ý đồ uống. Vui lòng thử lại sau.',
        onCancel
      );
    }
  }
}

export const emotionService = new EmotionService();