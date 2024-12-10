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
    try {
      const response = await api.get(`/api/v1/Drink/customer/${barId}`);
      
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
        'Không thể tải danh sách đồ uống. Vui lòng thử lại sau.'
      );
    }
  }

  async getDrinkDetail(drinkId: string): Promise<DrinkDetail | null> {
    try {
      const response = await api.get(`/api/v1/Drink/${drinkId}`);
      
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
        'Không thể tải chi tiết đồ uống. Vui lòng thử lại sau.'
      );
    }
  }
}

export const drinkService = new DrinkService();
