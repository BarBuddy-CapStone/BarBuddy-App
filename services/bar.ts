import axios from 'axios';
import { API_CONFIG } from '@/config/api';

export type Bar = {
  barId: string;
  barName: string;
  address: string;
  images: string;
  startTime: string;
  endTime: string;
  discount: number;
  isAnyTableAvailable: boolean;
  feedBacks: Array<{
    rating: number;
  }>;
};

class BarService {
  async getBars(pageIndex: number = 1, pageSize: number = 10): Promise<Bar[]> {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/bars?PageIndex=${pageIndex}&PageSize=${pageSize}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching bars:', error);
      return [];
    }
  }
}

export const barService = new BarService();
