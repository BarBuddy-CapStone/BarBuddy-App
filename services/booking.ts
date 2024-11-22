import api from './api';
import { API_CONFIG } from '@/config/api';
import { getAuthHeader } from '@/utils/auth-header';

export interface BookingHistory {
  bookingId: string;
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

export interface BookingDetail {
  bookingId: string;
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
}

export interface BookingDetailResponse {
  statusCode: number;
  message: string;
  data: BookingDetail;
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
      return response.data;
    } catch (error) {
      console.error('Error fetching booking history:', error);
      throw error;
    }
  }

  async getBookingDetail(bookingId: string): Promise<BookingDetailResponse> {
    try {
      const response = await api.get(
        `/api/Booking/detail/${bookingId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching booking detail:', error);
      throw error;
    }
  }

  async cancelBooking(bookingId: string): Promise<boolean> {
    try {
      const response = await api.patch(
        `/api/Booking/cancel/${bookingId}`,
        {},
        {
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
  }

  // Có thể thêm các method khác liên quan đến booking ở đây
  // Ví dụ: cancelBooking, getBookingDetail, ...
}

export const bookingService = new BookingService();
