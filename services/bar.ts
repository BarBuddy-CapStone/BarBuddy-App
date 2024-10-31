import axios from 'axios';
import { API_CONFIG } from '@/config/api';

export type Bar = {
  barId: string;
  barName: string;
  address: string;
  images: string;
  discount: number;
  isAnyTableAvailable: boolean;
  feedBacks: Array<{
    rating: number;
  }>;
  barTimeResponses: Array<{
    barTimeId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
};

export type BarDetail = {
  barId: string;
  barName: string;
  address: string;
  description: string;
  phoneNumber: string;
  email: string;
  startTime: string;
  endTime: string;
  images: string;
  discount: number;
  status: boolean;
  isAnyTableAvailable: boolean;
  feedBacks: Array<{
    bookingId: string;
    imageAccount: string | null;
    accountName: string | null;
    barId: string;
    rating: number;
    comment: string;
    isDeleted: boolean;
    createdTime: string;
    lastUpdatedTime: string;
  }>;
  tables: Array<{
    tableId: string;
    tableName: string;
    barId: string;
    tableTypeId: string;
    tableTypeName: string | null;
    minimumGuest: number;
    maximumGuest: number;
    minimumPrice: number;
    status: number;
  }> | null;
  barTimeResponses: Array<{
    barTimeId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
};

export interface IBarService {
  getBars(pageIndex?: number, pageSize?: number, search?: string): Promise<Bar[]>;
  getBarDetail(barId: string): Promise<BarDetail | null>;
}

class BarService implements IBarService {
  async getBars(pageIndex: number = 1, pageSize: number = 1000, search?: string): Promise<Bar[]> {
    try {
      let url = `${API_CONFIG.BASE_URL}/api/v1/bars?PageIndex=${pageIndex}&PageSize=${pageSize}`;
      if (search) {
        url += `&Search=${encodeURIComponent(search)}`;
      }
      
      const response = await axios.get(url);
      return response.data.data || []; // Trả về mảng rỗng nếu data là null

    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Nếu status là 404, trả về mảng rỗng thay vì coi là lỗi
        return [];
      }

      // Log các lỗi khác
      console.error('Error fetching bars:', error);
      return [];
    }
  }

  async getBarDetail(barId: string): Promise<BarDetail | null> {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/bar-detail/${barId}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching bar detail:', error);
      return null;
    }
  }
}

export const barService = new BarService();
