import api from './api';
import { handleConnectionError } from '@/utils/error-handler';

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
    return handleConnectionError(async () => {
      try {
        const response = await api.get(`/api/v1/Drink/customer/${barId}`);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching drinks:', error);
        return [];
      }
    }, 'Không thể tải danh sách đồ uống. Vui lòng thử lại sau.');
  }

  async getDrinkDetail(drinkId: string): Promise<DrinkDetail | null> {
    return handleConnectionError(async () => {
      try {
        const response = await api.get(`/api/v1/Drink/${drinkId}`);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching drink detail:', error);
        return null;
      }
    }, 'Không thể tải chi tiết đồ uống. Vui lòng thử lại sau.');
  }
}

export const drinkService = new DrinkService();
