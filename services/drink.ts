import axios from 'axios';
import { API_CONFIG } from '@/config/api';

export type Drink = {
  drinkId: string;
  drinkName: string;
  description: string;
  price: number;
  images: string;
  drinkCategoryResponse: {
    drinksCategoryId: string;
    drinksCategoryName: string;
  };
};

class DrinkService {
  async getDrinks(): Promise<Drink[]> {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/Drink/customer`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching drinks:', error);
      return [];
    }
  }
}

export const drinkService = new DrinkService();
