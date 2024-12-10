import api from './api';
import { handleConnectionError } from '@/utils/error-handler';

export interface EventVoucher {
  eventVoucherId: string;
  eventId: string;
  eventVoucherName: string;
  voucherCode: string;
  discount: number;
  maxPrice: number;
  quantity: number;
  status: boolean;
}

export interface EventTime {
  timeEventId: string;
  date: string | null;
  startTime: string;
  endTime: string;
  dayOfWeek: number | null;
}

export interface Event {
  eventId: string;
  barId: string;
  barName: string;
  eventName: string;
  images: string;
  isHide: boolean;
  isStill: number;
  eventVoucherResponse: EventVoucher;
  eventTimeResponses: EventTime[];
}

export interface EventResponse {
  statusCode: number;
  message: string;
  data: {
    eventResponses: Event[];
    totalPages: number;
    currentPage: number;
    pageSize: number;
    totalItems: number;
  };
}

interface GetEventsParams {
  barId?: string | null;
  isStill?: number | null;
  search?: string | null;
  isEveryWeekEvent?: number | null;
  pageIndex?: number;
  pageSize?: number;
}

interface PaginatedEvents {
  events: Event[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

export interface EventDetail extends Event {
  description: string;
}

export interface EventDetailResponse {
  statusCode: number;
  message: string;
  data: EventDetail;
}

class EventService {
  async getEvents({
    barId = null,
    isStill = null,
    search = null,
    isEveryWeekEvent = null,
    pageIndex = 1,
    pageSize = 8
  }: GetEventsParams = {}): Promise<PaginatedEvents> {
    try {
      let url = `/api/Event?PageIndex=${pageIndex}&PageSize=${pageSize}`;
      
      if (barId) url += `&BarId=${barId}`;
      if (isStill !== null) url += `&IsStill=${isStill}`;
      if (search) url += `&Search=${encodeURIComponent(search)}`;
      if (isEveryWeekEvent !== null) url += `&IsEveryWeekEvent=${isEveryWeekEvent}`;

      const response = await api.get<EventResponse>(url);
      
      if (response.data.statusCode === 200) {
        const { eventResponses, totalPages, currentPage, totalItems } = response.data.data;
        return {
          events: eventResponses || [],
          totalPages,
          currentPage,
          totalItems
        };
      }
      
      throw new Error(response.data.message);
    } catch (error: any) {
      // Xử lý trường hợp 404 đặc biệt
      if (error.response?.status === 404) {
        return {
          events: [],
          totalPages: 0,
          currentPage: 1,
          totalItems: 0
        };
      }
      
      // Nếu là lỗi từ response của API khác
      if (error.response) {
        throw new Error(error.response.data.message);
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể tải danh sách sự kiện. Vui lòng thử lại sau.'
      );
    }
  }

  async getCurrentEvents(): Promise<Event[]> {
    try {
      const currentEvents = await this.getEvents({ isStill: 0 });
      
      if (!currentEvents.events.length) {
        const allEvents = await this.getEvents({ isStill: null });
        return allEvents.events;
      }
      
      return currentEvents.events;
    } catch (error: any) {
      // Xử lý trường hợp 404 đặc biệt
      if (error.response?.status === 404) {
        return [];
      }
      
      // Nếu là lỗi từ response của API
      if (error.response) {
        throw new Error(error.response.data.message);
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể tải danh sách sự kiện hiện tại. Vui lòng thử lại sau.'
      );
    }
  }

  async getEventDetail(eventId: string): Promise<EventDetail> {
    try {
      const response = await api.get<EventDetailResponse>(
        `/api/Event/getOne/${eventId}`
      );
      
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
        'Không thể tải chi tiết sự kiện. Vui lòng thử lại sau.'
      );
    }
  }
}

export const eventService = new EventService();