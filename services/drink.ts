import axios from 'axios';
import { API_CONFIG } from '@/config/api';

export type Drink = {
  drinkId: string;
  drinkCategoryResponse: {
    barId: string;
    drinksCategoryId: string;
    drinksCategoryName: string;
    description: string;
    isDrinkCategory: boolean;
  };
  barName: string | null;
  drinkName: string;
  description: string;
  price: number;
  images: string;
  emotionsDrink: {
    barId: string;
    emotionalDrinksCategoryId: string;
    categoryName: string;
    description: string | null;
  }[];
  createdDate: string;
  updatedDate: string;
  status: boolean;
};

export type DrinkDetail = Drink;

export interface DrinkCategory {
  drinksCategoryId: string;
  drinksCategoryName: string;
}

class DrinkService {
  async getDrinks(barId: string): Promise<Drink[]> {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/Drink/customer/${barId}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching drinks:', error);
      return [];
    }
  }

  async getDrinkDetail(drinkId: string): Promise<DrinkDetail | null> {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/Drink/${drinkId}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching drink detail:', error);
      return null;
    }
  }

  async getDrinkCategories(): Promise<DrinkCategory[]> {
    const response = await axios.get('/api/drinks/categories');
    return response.data;
  }
}

export const drinkService = new DrinkService();
