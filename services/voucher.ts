import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export const voucherService = new VoucherService();