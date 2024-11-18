import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import { Drink } from './drink';

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
    try {
      const response = await axios.get<{
        statusCode: number;
        message: string;
        data: EmotionResponse;
      }>(
        `${API_CONFIG.BASE_URL}/api/DrinkRecommendation/drink-recommendation`, 
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
  }
}

export const emotionService = new EmotionService();