import api from './api';

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
    return await api.get<{ data: FeedbackDetail }>(`/api/feedback/booking/${bookingId}`);
  },
  createFeedback: async (data: CreateFeedbackRequest) => {
    return await api.post(`/api/feedback/createFeedBack`, data);
  }
}; 