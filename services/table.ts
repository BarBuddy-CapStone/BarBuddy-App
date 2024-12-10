import api from './api';
import { handleConnectionError } from '@/utils/error-handler';

export interface TableDetail {
  tableId: string;
  tableName: string; 
  tableTypeId: string;
  tableTypeName: string;
  minimumGuest: number;
  maximumGuest: number;
  minimumPrice: number;
}

export interface TableResponse {
  statusCode: number;
  message: string;
  data: TableDetail[];
}

class TableService {
  async getTableDetails(tableIds: string[]): Promise<TableDetail[]> {
    try {
      const queryParams = tableIds.map(id => `TableIdList=${id}`).join('&');
      const response = await api.get<TableResponse>(`/api/Table/tableList?${queryParams}`);
      
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
        'Không thể tải thông tin bàn. Vui lòng thử lại sau.'
      );
    }
  }
}

export const tableService = new TableService(); 