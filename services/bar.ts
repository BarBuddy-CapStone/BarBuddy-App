import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import { GoongLocation, goongService } from './goong';
import { handleConnectionError } from '@/utils/error-handler';

export type Bar = {
  barId: string;
  barName: string;
  address: string;
  images: string;
  discount: number;
  isAnyTableAvailable: boolean;
  feedBacks: Array<{
    rating: number;
  }>;
  barTimeResponses: Array<{
    barTimeId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  location?: {
    lat: number;
    lng: number;
    distance?: number;
  };
};

export type BarDetail = {
  barId: string;
  barName: string;
  address: string;
  description: string;
  phoneNumber: string;
  email: string;
  startTime: string;
  endTime: string;
  images: string;
  discount: number;
  status: boolean;
  timeSlot: number;
  isAnyTableAvailable: boolean;
  feedBacks: Array<{
    bookingId: string;
    imageAccount: string | null;
    accountName: string | null;
    barId: string;
    rating: number;
    comment: string;
    isDeleted: boolean;
    createdTime: string;
    lastUpdatedTime: string;
  }>;
  tables: Array<{
    tableId: string;
    tableName: string;
    barId: string;
    tableTypeId: string;
    tableTypeName: string | null;
    minimumGuest: number;
    maximumGuest: number;
    minimumPrice: number;
    status: number;
  }> | null;
  barTimeResponses: Array<{
    barTimeId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  location?: {
    lat: number;
    lng: number;
    distance?: number;
  };
};

export interface IBarService {
  getBars(pageIndex?: number, pageSize?: number, search?: string): Promise<Bar[]>;
  getBarDetail(barId: string): Promise<BarDetail | null>;
  calculateBarDistances(bars: Bar[], userLocation: GoongLocation): Promise<Bar[]>;
}

// Thêm interface mới cho response của API getBar
export interface CustomerBar {
  barId: string;
  barName: string;
  address: string;
  images: string;
}

interface CustomerBarResponse {
  statusCode: number;
  message: string;
  data: CustomerBar[];
}

// Thêm biến global để lưu trữ bars đã tính khoảng cách
let cachedBarsWithDistance: Bar[] = [];
let hasCachedDistances = false;

class BarService implements IBarService {
  private readonly maxRetries = 5;
  private readonly retryDelay = 100;

  private async retryOperation<T>(operation: () => Promise<T>, retries = this.maxRetries): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && axios.isAxiosError(error) && error.response?.status === 429) {
        await this.delay(this.retryDelay);
        return this.retryOperation(operation, retries - 1);
      }
      console.error('Operation failed:', error);
      return null;
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getBars(pageIndex: number = 1, pageSize: number = 1000, search?: string): Promise<Bar[]> {
    try {
      let url = `${API_CONFIG.BASE_URL}/api/v1/bars?PageIndex=${pageIndex}&PageSize=${pageSize}`;
      if (search) {
        url += `&Search=${encodeURIComponent(search)}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data.statusCode === 200) {
        return response.data.data || [];
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
        'Không thể tải danh sách quán. Vui lòng thử lại sau.'
      );
    }
  }

  async getBarDetail(barId: string): Promise<BarDetail | null> {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/bar-detail/${barId}`
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
        'Không thể tải thông tin chi tiết quán. Vui lòng thử lại sau.'
      );
    }
  }

  async getCustomerBars(): Promise<CustomerBar[]> {
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/Bar/customer/getBar?PageIndex=1&PageSize=100`;
      const response = await axios.get<CustomerBarResponse>(url);
      
      if (response.data.statusCode === 200) {
        return response.data.data || [];
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
        'Không thể tải danh sách quán. Vui lòng thử lại sau.'
      );
    }
  }

  async calculateBarDistances(bars: Bar[], userLocation: GoongLocation): Promise<Bar[]> {
    // Nếu đã có cache và không phải force refresh thì trả về cache
    if (hasCachedDistances && cachedBarsWithDistance.length > 0) {
      return cachedBarsWithDistance;
    }

    const batchSize = 5;
    const updatedBars: Bar[] = [...bars];
    
    for (let i = 0; i < bars.length; i += batchSize) {
      const batch = bars.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (bar) => {
          if (!bar.location) {
            const processBar = async () => {
              const location = await this.retryOperation(async () => 
                goongService.geocodeAddress(bar.address)
              );

              if (location) {
                const distance = await this.retryOperation(async () =>
                  goongService.calculateDistance(userLocation, location)
                );

                const index = updatedBars.findIndex(b => b.barId === bar.barId);
                if (index !== -1) {
                  updatedBars[index] = {
                    ...updatedBars[index],
                    location: {
                      ...location,
                      distance: distance !== null ? distance : undefined
                    }
                  };
                }
              }
            };

            try {
              await processBar();
            } catch (error) {
              console.error(`Failed to process bar ${bar.barId}:`, error);
            }
          }
        })
      );
      
      await this.delay(100);
    }
    
    // Lưu kết quả vào cache
    cachedBarsWithDistance = updatedBars;
    hasCachedDistances = true;
    
    return updatedBars;
  }

  // Thêm method mới để clear cache khi cần refresh
  clearDistanceCache() {
    cachedBarsWithDistance = [];
    hasCachedDistances = false;
  }

  async getBarDetailWithDistance(barId: string, userLocation?: GoongLocation): Promise<BarDetail | null> {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/bar-detail/${barId}`
      );
      const barDetail = response.data.data;

      if (userLocation && barDetail) {
        const processLocation = async (retries = this.maxRetries): Promise<GoongLocation | null> => {
          try {
            return await goongService.geocodeAddress(barDetail.address);
          } catch (error) {
            if (retries > 0 && axios.isAxiosError(error) && error.response?.status === 429) {
              await this.delay(500);
              return processLocation(retries - 1);
            }
            throw error;
          }
        };

        const processDistance = async (location: GoongLocation, retries = this.maxRetries): Promise<number | null> => {
          try {
            return await goongService.calculateDistance(userLocation, location);
          } catch (error) {
            if (retries > 0 && axios.isAxiosError(error) && error.response?.status === 429) {
              await this.delay(500);
              return processDistance(location, retries - 1);
            }
            throw error;
          }
        };

        const location = await processLocation();

        if (location) {
          const distance = await processDistance(location);

          return {
            ...barDetail,
            location: {
              ...location,
              distance: distance !== null ? distance : undefined
            }
          };
        }
      }

      return barDetail;
    } catch (error) {
      console.error('Error fetching bar detail:', error);
      return null;
    }
  }
}

export const barService = new BarService();
