import api from './api';

export interface TableType {
  tableTypeId: string;  // thay vì id
  typeName: string;     // thay vì name
  description: string;
  minimumPrice: number;
}

class TableTypeService {
  async getTableTypesOfBar(barId: string): Promise<TableType[]> {
    try {
      const response = await api.get(`/api/TableType/getTTOfBar/${barId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching table types of bar:', error);
      return [];
    }
  }
}

export const tableTypeService = new TableTypeService();
