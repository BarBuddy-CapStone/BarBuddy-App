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
  data: {
    tableTypeResponses: TableType[];
    totalPages: number;
    pageIndex: number;
    pageSize: number;
    totalItems: number;
  };
}

class TableTypeService {
  async getTableTypesOfBar(barId: string): Promise<TableType[]> {
    return handleConnectionError(async () => {
      try {
        const response = await api.get<TableTypeResponse>(`/api/TableType/getTTOfBar/${barId}`);
        return response.data.data.tableTypeResponses;
      } catch (error) {
        console.error('Error fetching table types of bar:', error);
        return [];
      }
    }, 'Không thể tải loại bàn. Vui lòng thử lại sau.');
  }
}

export const tableTypeService = new TableTypeService();
