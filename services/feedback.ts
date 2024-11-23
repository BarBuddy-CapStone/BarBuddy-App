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
    return handleConnectionError(async () => {
      return await api.get<{ data: FeedbackDetail }>(`/api/feedback/booking/${bookingId}`);
    }, 'Không thể tải đánh giá. Vui lòng thử lại sau.');
  },
  createFeedback: async (data: CreateFeedbackRequest) => {
    return handleConnectionError(async () => {
      return await api.post(`/api/feedback/createFeedBack`, data);
    }, 'Không thể tạo đánh giá. Vui lòng thử lại sau.');
  }
}; 