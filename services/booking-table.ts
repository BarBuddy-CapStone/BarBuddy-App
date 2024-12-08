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
    return handleConnectionError(async () => {
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
    }, 'Không thể tìm bàn trống. Vui lòng thử lại sau.');
  }

  async bookTable(request: BookingTableRequest, onCancel?: () => void) {
    return handleConnectionError(async () => {
      try {
        const headers = await this.getAuthHeader();
        const response = await api.post('/api/Booking/booking-table', request, { headers });
        return response.data;
      } catch (error) {
        console.error('Error booking table:', error);
        throw error;
      }
    }, 'Không thể đặt bàn. Vui lòng thử lại sau.', onCancel);
  }

  async bookTableWithDrinks(request: BookingDrinkRequest, onCancel?: () => void) {
    return handleConnectionError(async () => {
      try {
        const headers = await this.getAuthHeader();
        const response = await api.post('/api/Booking/booking-drink/mobile', request, { headers });
        return response.data;
      } catch (error) {
        console.error('Error booking table with drinks:', error);
        throw error;
      }
    }, 'Không thể đặt bàn và đồ uống. Vui lòng thử lại sau.', onCancel);
  }

  async getHoldTable(params: GetHoldTableParams): Promise<HoldTableInfo[]> {
    return handleConnectionError(async () => {
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
        console.log(response.data.data);
        return response.data.data;
      } catch (error) {
        console.error('Error getting hold tables:', error);
        return [];
      }
    }, 'Không thể lấy thông tin bàn đã giữ. Vui lòng thử lại sau.');
  }

  async holdTable(request: HoldTableRequest) {
    return handleConnectionError(async () => {
      try {
        const headers = await this.getAuthHeader();
        const response = await api.post('/api/bookingTable/holdTable', request, { headers });
        return response.data;
      } catch (error) {
        console.error('Error holding table:', error);
        throw error;
      }
    }, 'Không thể giữ bàn. Vui lòng thử lại sau.');
  }

  async releaseTable(request: HoldTableRequest) {
    try {
      const headers = await this.getAuthHeader();
      const response = await api.post('/api/bookingTable/releaseTable', request, { headers });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 500) {
        console.log('Ignored 500 error when releasing table:', error);
        return null;
      }
      
      return handleConnectionError(
        async () => { throw error; },
        'Không thể hủy giữ bàn. Vui lòng thử lại sau.'
      );
    }
  }
}

export const bookingTableService = new BookingTableService();
