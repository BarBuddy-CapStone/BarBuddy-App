import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleConnectionError } from '@/utils/error-handler';

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
    numOfPeople: number;
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
  numOfPeople: number;
  voucherCode: string | null;
  tableIds: string[];
  selectedTables: SelectedTableInfo[];
  paymentDestination: string;
  drinks: DrinkOrderItem[];
}

export interface HoldTableRequest {
  tableId: string;
  time: string; // Format: HH:mm:ss
  barId: string;
  date: string; // Format: yyyy-MM-dd
}

export interface GetHoldTableParams {
  barId: string;
  date: string; // Format: yyyy-MM-dd
  timeSpan: string; // Format: HH:mm
}

export interface HoldTableInfo {
  accountId: string;
  isHeld: boolean;
  holdExpiry: string;
  tableId: string;
  tableName: string;
  date: string;
  time: string;
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
      const response = await api.get('/api/bookingTable/filter', {
        params: {
          BarId: filter.barId,
          TableTypeId: filter.tableTypeId,
          Date: filter.date,
          Time: filter.timeSpan
        },
        headers
      });

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
        'Không thể tìm bàn trống. Vui lòng thử lại sau.'
      );
    }
  }

  async bookTable(request: BookingTableRequest, onCancel?: () => void) {
    try {
      const headers = await this.getAuthHeader();
      const response = await api.post('/api/Booking/booking-table', request, { headers });

      if (response.data.statusCode === 200) {
        return {
          data: response.data.data,
          message: response.data.message
        };
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
        'Không thể đặt bàn. Vui lòng thử lại sau.',
        onCancel
      );
    }
  }

  async bookTableWithDrinks(request: BookingDrinkRequest, onCancel?: () => void) {
    try {
      const headers = await this.getAuthHeader();
      const response = await api.post('/api/Booking/booking-drink/mobile', request, { headers });

      if (response.data.statusCode === 200) {
        return response.data;
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
        'Không thể đặt bàn và đồ uống. Vui lòng thử lại sau.',
        onCancel
      );
    }
  }

  async getHoldTable(params: GetHoldTableParams): Promise<HoldTableInfo[]> {
    try {
      const headers = await this.getAuthHeader();
      const response = await api.get(
        `/api/bookingTable/getHoldTable/${params.barId}`, 
        {
          params: {
            Date: params.date,
            Time: params.timeSpan
          },
          headers
        }
      );

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
        'Không thể lấy thông tin bàn đã giữ. Vui lòng thử lại sau.'
      );
    }
  }

  async holdTable(request: HoldTableRequest) {
    try {
      const headers = await this.getAuthHeader();
      const response = await api.post('/api/bookingTable/holdTable', request, { headers });

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
        'Không thể giữ bàn. Vui lòng thử lại sau.'
      );
    }
  }

  async releaseTable(request: HoldTableRequest) {
    try {
      const headers = await this.getAuthHeader();
      const response = await api.post('/api/bookingTable/releaseTable', request, { headers });

      if (response.data.statusCode === 200) {
        return response.data.data;
      }

      throw new Error(response.data.message);
    } catch (error: any) {
      if (error.response?.status === 500) {
        return null;
      }
      
      // Nếu là lỗi từ response của API
      if (error.response) {
        throw new Error(error.response.data.message);
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể hủy giữ bàn. Vui lòng thử lại sau.'
      );
    }
  }
}

export const bookingTableService = new BookingTableService();
