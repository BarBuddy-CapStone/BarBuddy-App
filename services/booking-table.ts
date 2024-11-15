import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BookingTableFilter = {
  barId: string;
  tableTypeId: string;
  date: string;
  timeSpan: string;
};

export type Table = {
  tableId: string;
  tableName: string;
  status: number;
};

export type BookingTableResponse = {
  tableTypeId: string;
  typeName: string;
  description: string;
  bookingTables: {
    reservationDate: string;
    reservationTime: string;
    tables: Table[];
  }[];
};

export interface BookingTableRequest {
    barId: string;
    bookingDate: string; // Format: yyyy-MM-dd
    bookingTime: string; // Format: HH:mm
    note: string;
    tableIds: string[];
}

export interface DrinkOrderItem {
  drinkId: string;
  quantity: number;
}

export interface SelectedTableInfo {
  id: string;
  name: string;
  typeId: string;
  typeName: string;
}

export interface BookingDrinkRequest {
  barId: string;
  bookingDate: string;
  bookingTime: string;
  note: string;
  voucherCode: string | null;
  tableIds: string[];
  selectedTables: SelectedTableInfo[];
  paymentDestination: string;
  drinks: DrinkOrderItem[];
}

class BookingTableService {
  private async getAuthHeader() {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      Authorization: `Bearer ${token}`
    };
  }

  async findAvailableTables(filter: BookingTableFilter): Promise<BookingTableResponse> {
    try {
      const headers = await this.getAuthHeader();
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/bookingTable/filter`,
        {
          params: {
            BarId: filter.barId,
            TableTypeId: filter.tableTypeId,
            Date: filter.date,
            Time: filter.timeSpan
          },
          headers
        }
      );
      return response.data.data;
    } catch (error) {
      return {
        tableTypeId: filter.tableTypeId,
        typeName: '',
        description: '',
        bookingTables: [{
          reservationDate: filter.date,
          reservationTime: filter.timeSpan,
          tables: []
        }]
      };
    }
  }

  async bookTable(request: BookingTableRequest) {
    try {
      const headers = await this.getAuthHeader();
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/Booking/booking-table`,
        request,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error booking table:', error);
      throw error;
    }
  }

  async bookTableWithDrinks(request: BookingDrinkRequest) {
    try {
      const headers = await this.getAuthHeader();

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/Booking/booking-drink/mobile`,
        request,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error booking table with drinks:', error);
      // Log thêm response error nếu có
      if (axios.isAxiosError(error)) {
        console.error('Error response:', {
          status: error.response?.status,
          data: error.response?.data
        });
      }
      throw error;
    }
  }
}

export const bookingTableService = new BookingTableService();
