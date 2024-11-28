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
   * @returns Promise<Drink[]> - Array of recommended drinks
   */
  async getDrinkRecommendations(emotion: string, barId: string): Promise<EmotionResponseItem[]> {
    return handleConnectionError(async () => {
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
        
        if (response?.data?.data) {
          return response.data.data;
        }
        throw new Error('Invalid response format');
      } catch (error) {
        console.error('Error getting drink recommendations:', error);
        throw error;
      }
    }, 'Không thể lấy gợi ý đồ uống. Vui lòng thử lại sau.');
  }
}

export const emotionService = new EmotionService();