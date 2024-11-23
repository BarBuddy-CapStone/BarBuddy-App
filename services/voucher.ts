import api from './api';
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
  async getVoucher(bookingDate: string, bookingTime: string, voucherCode: string, barId: string) {
    return handleConnectionError(async () => {
      try {
        const response = await api.get<VoucherApiResponse>(
          `/api/Voucher/getOneVoucher`,
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
    }, 'Không thể kiểm tra mã giảm giá. Vui lòng thử lại sau.');
  }
}

export const voucherService = new VoucherService();