import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BookingHistory {
  bookingId: string;
  barName: string;
  bookingDate: string;
  bookingTime: string;
  status: number; // Thay đổi thành number
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
export interface BookingDetail {
  bookingId: string;
  barName: string;
  barAddress: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  note: string;
  bookingDate: string;
  bookingTime: string;
  createAt: string;
  images: string[];
  status: number;
  tableNameList: string[];
  bookingDrinksList: any[]; // Tạm thời để any
}

export interface BookingDetailResponse {
  statusCode: number;
  message: string;
  data: BookingDetail;
}

class BookingService {
  private async getAuthHeader() {
    const token = await AsyncStorage.getItem('userToken');
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async getBookingHistory(
    accountId: string,
    pageIndex: number = 1,
    pageSize: number = 10
  ): Promise<BookingHistoryResponse> {
    try {
      const headers = await this.getAuthHeader();
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/Booking/${accountId}?PageIndex=${pageIndex}&PageSize=${pageSize}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching booking history:', error);
      throw error;
    }
  }

  // Thêm method getBookingDetail
  async getBookingDetail(bookingId: string): Promise<BookingDetailResponse> {
    try {
      const headers = await this.getAuthHeader();
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/Booking/detail/${bookingId}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching booking detail:', error);
      throw error;
    }
  }

  // Có thể thêm các method khác liên quan đến booking ở đây
  // Ví dụ: cancelBooking, getBookingDetail, ...
}

export const bookingService = new BookingService();
