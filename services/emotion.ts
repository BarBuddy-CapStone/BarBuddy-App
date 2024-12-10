import api from './api';
import { Drink } from './drink';
import { handleConnectionError } from '@/utils/error-handler';

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
      const response = await api.get<EmotionApiResponse>(
        `/api/DrinkRecommendation/drink-recommendation-v2`, 
        {
          params: {
            emotion,
            barId
          }
        }
      );
      
      if (response.data.statusCode === 200) {
        return response.data.data;
      }
      
      throw new Error(response.data.message);
    } catch (error: any) {
      // Nếu là lỗi từ response của API
      if (error.response) {
        throw new Error(error.response.data.message);
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