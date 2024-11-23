import api from './api';
import { Drink } from './drink';
import { handleConnectionError } from '@/utils/error-handler';

interface EmotionResponse {
  drinkList: Drink[];
  emotion: string;
}

class EmotionService {
  /**
   * Get drink recommendations based on emotion
   * @param emotion - User's emotion text
   * @param barId - ID of the bar
   * @returns Promise<Drink[]> - Array of recommended drinks
   */
  async getDrinkRecommendations(emotion: string, barId: string) {
    return handleConnectionError(async () => {
      try {
        const response = await api.get<{
          statusCode: number;
          message: string;
          data: EmotionResponse;
        }>(
          `/api/DrinkRecommendation/drink-recommendation`, 
          {
            params: {
              emotion,
              barId
            }
          }
        );
        
        return response.data.data;
      } catch (error) {
        console.error('Error getting drink recommendations:', error);
        throw error;
      }
    }, 'Không thể lấy gợi ý đồ uống. Vui lòng thử lại sau.');
  }
}

export const emotionService = new EmotionService();