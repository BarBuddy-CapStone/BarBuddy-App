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
    return handleConnectionError(async () => {
      try {
        const response = await api.get(`/api/v1/Payment/payment-detail/${paymentId}`);
        return response.data.data;
      } catch (error) {
        console.error('=== Payment Service Error ===');
        throw error;
      }
    }, 'Không thể tải chi tiết thanh toán. Vui lòng thử lại sau.');
  },

  getPaymentHistory: async (accountId: string, pageIndex: number = 1): Promise<PaymentHistoryResponse> => {
    return handleConnectionError(async () => {
      try {
        const response = await api.get(
          `/api/PaymentHistory/${accountId}?PageIndex=${pageIndex}&PageSize=1000`
        );
        return response.data;
      } catch (error) {
        console.error('=== Payment History Service Error ===');
        throw error;
      }
    }, 'Không thể tải lịch sử thanh toán. Vui lòng thử lại sau.');
  }
}; 