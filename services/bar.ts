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
  }>;
};

export interface IBarService {
  getBars(pageIndex?: number, pageSize?: number): Promise<Bar[]>;
  getBarDetail(barId: string): Promise<BarDetail | null>;
}

class BarService implements IBarService {
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
