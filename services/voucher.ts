import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleConnectionError } from '@/utils/error-handler';

export interface VoucherResponse {
  eventVoucherId: string;
  eventId: string;
  eventVoucherName: string;
  voucherCode: string;
  discount: number;
  maxPrice: number;
  quantity: number;
  status: boolean;
}

export interface VoucherApiResponse {
  statusCode: number;
  message: string;
  data: VoucherResponse | null;
}

class VoucherService {
  private async getAuthHeader() {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      Authorization: `Bearer ${token}`
    };
  }

  async getVoucher(bookingDate: string, bookingTime: string, voucherCode: string, barId: string) {
    try {
      const headers = await this.getAuthHeader();
      const response = await api.get<VoucherApiResponse>(
        `/api/Voucher/getOneVoucher`,
        {
          params: {
            bookingDate,
            bookingTime,
            voucherCode,
            barId
          },
          headers
        }
      );

      if (response.data.statusCode === 200) {
        return response.data;
      }

      throw new Error(response.data.message || 'Không thể áp dụng voucher');
    } catch (error: any) {
      // Nếu là lỗi authentication
      if (error.message === 'No authentication token found') {
        throw error;
      }

      // Nếu là lỗi từ API
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Không thể áp dụng voucher');
      }
      
      // Nếu là lỗi kết nối
      throw new Error('Không thể kiểm tra mã giảm giá. Vui lòng thử lại sau.');
    }
  }
}

export const voucherService = new VoucherService();