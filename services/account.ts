import axios from 'axios';
import { API_CONFIG } from '@/config/api';

export type Account = {
  accountId: string;
  email: string;
  fullname: string;
  phone: string;
  dob: string;
  image: string;
};

class AccountService {
  async getAccountInfo(accountId: string): Promise<Account> {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/customer/${accountId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw error;
    }
  }
}

export const accountService = new AccountService();
