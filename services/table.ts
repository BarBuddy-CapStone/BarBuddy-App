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
    return handleConnectionError(async () => {
      try {
        const queryParams = tableIds.map(id => `TableIdList=${id}`).join('&');
        const response = await api.get<TableResponse>(`/api/Table/tableList?${queryParams}`);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching table details:', error);
        return [];
      }
    }, 'Không thể tải thông tin bàn. Vui lòng thử lại sau.');
  }
}

export const tableService = new TableService(); 