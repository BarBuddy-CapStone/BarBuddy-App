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

class BookingService {
  async getBookingHistory(
    accountId: string,
    pageIndex: number = 1,
    pageSize: number = 10
  ): Promise<BookingHistoryResponse> {
    return handleConnectionError(async () => {
      try {
        const response = await api.get(
          `/api/Booking/${accountId}?PageIndex=${pageIndex}&PageSize=${pageSize}`
        );
        return response.data;
      } catch (error) {
        console.error('Error fetching booking history:', error);
        throw error;
      }
    }, 'Không thể tải lịch sử đặt bàn. Vui lòng thử lại sau.');
  }

  async getBookingDetail(bookingId: string): Promise<BookingDetailResponse> {
    return handleConnectionError(async () => {
      try {
        const response = await api.get(
          `/api/Booking/detail/${bookingId}`
        );  
        console.log(response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching booking detail:', error);
        throw error;
      }
    }, 'Không thể tải chi tiết đặt bàn. Vui lòng thử lại sau.');
  }

  async cancelBooking(bookingId: string): Promise<boolean> {
    return handleConnectionError(async () => {
      try {
        // Lấy token hiện tại
        const accessToken = await AsyncStorage.getItem('accessToken');
        
        const response = await api.patch(
          `/api/Booking/cancel/${bookingId}`,
          {},
          { 
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            validateStatus: (status) => true 
          }
        );
        
        if (response.status === 405) {
          throw new Error('Phương thức không được phép. Vui lòng liên hệ admin.');
        }
        
        if (response.status === 202) {
          throw new Error(`Bạn chỉ có thể hủy bàn trước ${response.data.message || '2'} giờ đồng hồ đến giờ phục vụ.`);
        }
        
        if (response.data.statusCode !== 200) {
          throw new Error(response.data.message || 'Không thể hủy đặt bàn');
        }
        
        return true;
      } catch (error: any) {
        // Nếu là lỗi 401, để interceptor xử lý
        if (error.response?.status === 401) {
          return api.patch(
            `/api/Booking/cancel/${bookingId}`,
            {},
            { validateStatus: (status) => true }
          );
        }
        
        if (error.response?.status === 202) {
          throw new Error(`Bạn chỉ có thể hủy bàn trước ${error.response.data.message || '2'} giờ đồng hồ đến giờ phục vụ.`);
        }
        
        if (error.response) {
          throw new Error(
            error.response.data.message || 
            `Lỗi ${error.response.status}: Không thể hủy đặt bàn`
          );
        }
        throw error;
      }
    }, 'Không thể hủy đặt bàn. Vui lòng thử lại sau.');
  }

  async orderExtraDrinks(bookingId: string, drinks: ExtraDrinkRequest[]): Promise<{success: boolean; message?: string}> {
    return handleConnectionError(async () => {
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

        // Kiểm tra các trường hợp lỗi
        if (response.status === 400) {
          return {
            success: false,
            message: response.data.message || 'Không thể đặt thêm đồ uống'
          };
        }

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
        return {
          success: false,
          message: error.response?.data?.message || 'Không thể đặt thêm đồ uống'
        };
      }
    }, 'Không thể đặt thêm đồ uống. Vui lòng thử lại sau.');
  }
}

export const bookingService = new BookingService();
