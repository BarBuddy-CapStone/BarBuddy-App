import axios from 'axios';
import { API_CONFIG } from '@/config/api';

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
    return await axios.get<{ data: FeedbackDetail }>(`${API_CONFIG.BASE_URL}/api/feedback/booking/${bookingId}`);
  },
  createFeedback: async (data: CreateFeedbackRequest) => {
    return await axios.post(`${API_CONFIG.BASE_URL}/api/feedback/createFeedBack`, data);
  }
}; 