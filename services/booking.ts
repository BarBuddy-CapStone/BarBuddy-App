import api from './api';
import { handleConnectionError } from '@/utils/error-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BookingHistory {
  bookingId: string;
  barId: string;
  barName: string;
  bookingDate: string;
  bookingTime: string;
  bookingCode: string;
  status: number;
  createAt: string;
  image: string;
  isRated: boolean | null;
}

export interface BookingHistoryResponse {
  statusCode: number;
  message: string;
  data: {
    totalPage: number;
    response: BookingHistory[];
  };
}

// Thêm interface cho booking detail
export interface BookingDrink {
  drinkId: string;
  drinkName: string;
  actualPrice: number;
  quantity: number;
  image: string;
}

export interface BookingExtraDrink {
  drinkId: string;
  drinkName: string;
  actualPrice: number;
  quantity: number;
  image: string;
  status: number;
  createdDate: string | null;
  updatedDate: string | null;
  customerId: string | null;
  staffId: string | null;
  staffName: string | null;
  bookingExtraDrinkId: string;
}

export interface BookingDetail {
  bookingId: string;
  barId: string;
  barName: string;
  barAddress: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  note: string;
  totalPrice: number | null;
  additionalFee: number | null;
  bookingDate: string;
  bookingTime: string;
  createAt: string;
  qrTicket: string;
  images: string[];
  status: number;
  isRated: boolean | null;
  numOfPeople: number;
  tableNameList: string[];
  bookingDrinksList: BookingDrink[];
  bookingDrinkExtraResponses: BookingExtraDrink[];
}

export interface BookingDetailResponse {
  statusCode: number;
  message: string;
  data: BookingDetail;
}

// Thêm interface cho request
interface ExtraDrinkRequest {
  drinkId: string;
  quantity: number;
}

// Thêm interface cho serving bookings
export interface ServingBooking {
  bookingId: string;
  barId: string;
  barName: string;
  bookingDate: string;
  bookingTime: string;
  bookingCode: string;
  note: string;
  status: number;
  createAt: string;
  image: string;
  isRated: boolean;
}

export interface ServingBookingsResponse {
  statusCode: number;
  message: string;
  data: ServingBooking[];
}

class BookingService {
  async getBookingHistory(
    accountId: string,
    pageIndex: number = 1,
    pageSize: number = 10
  ): Promise<BookingHistoryResponse> {
    try {
      const response = await api.get(
        `/api/Booking/${accountId}?PageIndex=${pageIndex}&PageSize=${pageSize}`
      );

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
        'Không thể tải lịch sử đặt bàn. Vui lòng thử lại sau.'
      );
    }
  }

  async getBookingDetail(bookingId: string): Promise<BookingDetailResponse> {
    try {
      const response = await api.get(`/api/Booking/detail/${bookingId}`);

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
        'Không thể tải chi tiết đặt bàn. Vui lòng thử lại sau.'
      );
    }
  }

  async cancelBooking(bookingId: string): Promise<{success: boolean; message: string}> {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      
      const response = await api.patch(
        `/api/Booking/cancel/${bookingId}`,
        {},
        { 
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 202) {
        throw new Error(response.data.message || 'Bạn chỉ có thể hủy bàn trước 2 giờ đồng hồ đến giờ phục vụ.');
      }

      if (response.data.statusCode === 200) {
        return {
          success: true,
          message: response.data.message || 'Hủy đặt bàn thành công!'
        };
      }

      throw new Error(response.data.message || 'Không thể hủy đặt bàn');

    } catch (error: any) {
      // Xử lý lỗi 401 - để interceptor xử lý
      if (error.response?.status === 401) {
        return api.patch(
          `/api/Booking/cancel/${bookingId}`,
          {},
          { validateStatus: (status) => true }
        );
      }
      
      // Nếu là lỗi từ response của API (có status code)
      if (error.response) {
        throw new Error(error.response.data.message || 'Không thể hủy đặt bàn');
      }
      
      // Nếu là error.message (từ throw new Error ở trên)
      if (error.message) {
        throw error;
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể hủy đặt bàn. Vui lòng thử lại sau.'
      );
    }
  }

  async orderExtraDrinks(bookingId: string, drinks: ExtraDrinkRequest[]): Promise<{success: boolean; message?: string}> {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');

      const response = await api.post(
        `/api/Booking/extra-drink/${bookingId}`,
        drinks,
        { 
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          validateStatus: (status) => true 
        }
      );

      // Xử lý các trường hợp lỗi
      if (response.status === 400) {
        return {
          success: false,
          message: response.data.message || 'Không thể đặt thêm đồ uống'
        };
      }

      // Xử lý lỗi 401
      if (response.status === 401) {
        const retryResponse = await api.post(
          `/api/Booking/extra-drink/${bookingId}`,
          drinks,
          { 
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (retryResponse.status !== 200) {
          return {
            success: false,
            message: retryResponse.data.message || 'Không thể đặt thêm đồ uống'
          };
        }
      }

      if (response.status !== 200) {
        return {
          success: false,
          message: response.data.message || 'Không thể đặt thêm đồ uống'
        };
      }

      return { success: true };
    } catch (error: any) {
      // Nếu là lỗi từ response của API
      if (error.response) {
        return {
          success: false,
          message: error.response.data.message || 'Không thể đặt thêm đồ uống'
        };
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể đặt thêm đồ uống. Vui lòng thử lại sau.'
      );
    }
  }

  async getServingBookings(accountId: string): Promise<ServingBookingsResponse> {
    try {
      const response = await api.get(`/api/Booking/serving/${accountId}`);

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
        'Không thể tải danh sách đơn đang phục vụ. Vui lòng thử lại sau.'
      );
    }
  }
}

export const bookingService = new BookingService();
