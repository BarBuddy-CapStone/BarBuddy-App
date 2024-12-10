import api from './api';
import { handleConnectionError } from '@/utils/error-handler';

export interface PaymentDetail {
  paymentHistoryId: string;
  providerName: string;
  transactionCode: string;
  paymentDate: string;
  paymentFee: number;
  totalPrice: number;
  note: string | null;
  status: number;
  account: {
    fullname: string;
    email: string;
    phone: string;
    image: string;
  };
  booking: {
    bookingCode: string;
    barName: string;
    barAddress: string;
    bookingDate: string;
    bookingTime: string;
    expireAt: string;
    qrTicket: string;
    bookingDrinks: Array<{
      drinkId: string;
      actualPrice: number;
      quantity: number;
    }>;
  };
}

export interface PaymentHistory {
  bookingId: string;
  customerName: string;
  phoneNumber: string;
  barName: string;
  transactionCode: string;
  paymentDate: string;
  totalPrice: number;
  note: string | null;
  status: number;
  providerName: string;
  paymentFee: number;
}

interface PaymentHistoryResponse {
  totalPage: number;
  response: PaymentHistory[];
}

export const paymentService = {
  getPaymentDetail: async (paymentId: string): Promise<PaymentDetail> => {
    try {
      const response = await api.get(`/api/v1/Payment/payment-detail/${paymentId}`);
      
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
        'Không thể tải chi tiết thanh toán. Vui lòng thử lại sau.'
      );
    }
  },

  getPaymentHistory: async (accountId: string, pageIndex: number = 1): Promise<PaymentHistoryResponse> => {
    try {
      const response = await api.get(
        `/api/PaymentHistory/${accountId}?PageIndex=${pageIndex}&PageSize=1000`
      );
      
      // Trả về trực tiếp data vì API này không có statusCode
      return response.data;

    } catch (error: any) {
      // Nếu là lỗi từ response của API
      if (error.response) {
        throw new Error(error.response.data.message || 'Có lỗi xảy ra');
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể tải lịch sử thanh toán. Vui lòng thử lại sau.'
      );
    }
  }
}; 