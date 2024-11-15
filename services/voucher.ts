import axios from 'axios';
import { API_CONFIG } from '@/config/api';

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
  async getVoucher(bookingDate: string, bookingTime: string, voucherCode: string, barId: string) {
    try {
      const response = await axios.get<VoucherApiResponse>(
        `${API_CONFIG.BASE_URL}/api/Voucher/getOneVoucher`,
        {
          params: {
            bookingDate,
            bookingTime,
            voucherCode,
            barId
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export const voucherService = new VoucherService();