import api from './api';
import { handleConnectionError } from '@/utils/error-handler';

export interface TableType {
  tableTypeId: string;  // thay vì id
  typeName: string;     // thay vì name
  description: string;
  minimumPrice: number;
}

class TableTypeService {
  async getTableTypesOfBar(barId: string): Promise<TableType[]> {
    return handleConnectionError(async () => {
      try {
        const response = await api.get(`/api/TableType/getTTOfBar/${barId}`);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching table types of bar:', error);
        return [];
      }
    }, 'Không thể tải loại bàn. Vui lòng thử lại sau.');
  }
}

export const tableTypeService = new TableTypeService();
