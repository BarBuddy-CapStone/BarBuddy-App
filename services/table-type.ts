import api from './api';
import { handleConnectionError } from '@/utils/error-handler';

export interface TableType {
  tableTypeId: string;
  barId: string;
  typeName: string;
  description: string;
  minimumGuest: number;
  maximumGuest: number;
  minimumPrice: number;
}

export interface TableTypeResponse {
  statusCode: number;
  message: string;
  data: TableType[];
}

class TableTypeService {
  async getTableTypesOfBar(barId: string): Promise<TableType[]> {
    try {
      const response = await api.get<TableTypeResponse>(`/api/TableType/Bar?barId=${barId}`);
      
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
        'Không thể tải loại bàn. Vui lòng thử lại sau.'
      );
    }
  }
}

export const tableTypeService = new TableTypeService();
