import { API_CONFIG } from '@/config/api';
import axios from 'axios';

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
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/Payment/payment-detail/${paymentId}`
      );
      
      return response.data.data;
    } catch (error) {
      console.error('=== Payment Service Error ===');
      console.error('Error type:', error?.constructor?.name);
      if (axios.isAxiosError(error)) {
        console.error('Full error:', {
          status: error.response?.status,
          data: error.response?.data,
          config: error.config
        });
      }
      throw error;
    }
  },

  getPaymentHistory: async (accountId: string, pageIndex: number = 1): Promise<PaymentHistoryResponse> => {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/PaymentHistory/${accountId}?PageIndex=${pageIndex}&PageSize=1000`
      );
      return response.data;
    } catch (error) {
      console.error('=== Payment History Service Error ===');
      if (axios.isAxiosError(error)) {
        console.error('Error Response:', {
          status: error.response?.status,
          data: error.response?.data
        });
      }
      throw error;
    }
  }
}; 