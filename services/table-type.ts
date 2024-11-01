import axios from 'axios';
import { API_CONFIG } from '@/config/api';

export interface TableType {
  tableTypeId: string;  // thay vì id
  typeName: string;     // thay vì name
  description: string;
  minimumPrice: number;
}

class TableTypeService {
  async getTableTypesOfBar(barId: string): Promise<TableType[]> {
    try {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/TableType/getTTOfBar/${barId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching table types of bar:', error);
      return [];
    }
  }
}

export const tableTypeService = new TableTypeService();
