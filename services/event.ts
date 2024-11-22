import api from './api';

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
      const { eventResponses, totalPages, currentPage, totalItems } = response.data.data;
      
      return {
        events: eventResponses || [],
        totalPages,
        currentPage,
        totalItems
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          events: [],
          totalPages: 0,
          currentPage: 1,
          totalItems: 0
        };
      }
      throw error;
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
      if (error.response?.status === 404) {
        return [];
      }
      console.error('Error fetching current events:', error);
      return [];
    }
  }

  async getEventDetail(eventId: string): Promise<EventDetail> {
    try {
      const response = await api.get<EventDetailResponse>(
        `/api/Event/getOne/${eventId}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching event detail:', error);
      throw error;
    }
  }
}

export const eventService = new EventService();