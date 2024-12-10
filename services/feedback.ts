import api from './api';
import { handleConnectionError } from '@/utils/error-handler';

export interface FeedbackDetail {
  feedbackId: string;
  rating: number;
  comment: string;
  createdTime: string;
  lastUpdatedTime: string;
  customerName: string;
  customerAvatar: string;
  barName: string;
  barAddress: string;
  barImage: string;
  startTime: string;
  endTime: string;
}

interface CreateFeedbackRequest {
  bookingId: string;
  rating: number;
  comment: string;
}

export const feedbackService = {
  getFeedbackByBooking: async (bookingId: string) => {
    try {
      const response = await api.get<{ 
        statusCode: number;
        message: string;
        data: FeedbackDetail 
      }>(`/api/feedback/booking/${bookingId}`);
      
      console.log("response", response);

      if (response.data.statusCode === 200) {
        return response.data.data;
      }

      throw new Error(response.data.message);
    } catch (error: any) {
      // Nếu là lỗi từ response của API
      if (error.response) {
        throw new Error(error.response.data.message);
      }

      console.log("error", error);
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        
        async () => { throw error; },
        'Không thể tải đánh giá. Vui lòng thử lại sau.'
      );
    }
  },

  createFeedback: async (data: CreateFeedbackRequest) => {
    try {
      const response = await api.post<{
        statusCode: number;
        message: string;
        data: any;
      }>(`/api/feedback/createFeedBack`, data);

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
        'Không thể tạo đánh giá. Vui lòng thử lại sau.'
      );
    }
  }
}; 