import axios from 'axios';
import { API_CONFIG } from '@/config/api';

export interface TableType {
  tableTypeId: string;  // thay vì id
  typeName: string;     // thay vì name
  description: string;
  minimumPrice: number;
}

class TableTypeService {
  async getTableTypes(): Promise<TableType[]> {
    try {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/TableType`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching table types:', error);
      return [];
    }
  }
}

export const tableTypeService = new TableTypeService();
