import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import { validateFullname, validatePhone, validateBirthDate } from '@/utils/validation';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export type Account = {
  accountId: string;
  email: string;
  fullname: string;
  phone: string;
  dob: string;
  image?: string | null; 
};

export type UpdateAccountData = {
  fullname?: string;
  phone?: string;
  dob?: string;
};

class AccountService {
  async getAccountInfo(accountId: string): Promise<Account> {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/customer/${accountId}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw error;
    }
  }

  async updateAccountInfo(accountId: string, data: UpdateAccountData): Promise<Account> {
    if (data.fullname) {
      const fullnameError = validateFullname(data.fullname);
      if (fullnameError) throw new Error(fullnameError);
    }

    if (data.phone) {
      const phoneError = validatePhone(data.phone);
      if (phoneError) throw new Error(phoneError);
    }

    if (data.dob) {
      const dateStr = format(new Date(data.dob), 'dd/MM/yyyy');
      const dobError = validateBirthDate(dateStr);
      if (dobError) throw new Error(dobError);
    }

    try {
      const currentAccount = await this.getAccountInfo(accountId);

      const payload = {
        email: currentAccount.email,
        image: currentAccount.image,
        status: 1,
        accountId: currentAccount.accountId,
        ...data
      };

      const response = await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v1/customer-account?accountId=${accountId}`,
        payload
      );
      return response.data.data;
    } catch (error) {
      console.error('Error updating account info:', error);
      throw error;
    }
  }

  async uploadAvatar(accountId: string, imageUri: string): Promise<{ url: string }> {
    try {
      const formData = new FormData();
      
      // Xử lý mime type
      let mimeType = 'image/jpeg'; // default
      const extension = imageUri.split('.').pop()?.toLowerCase();
      if (extension) {
        switch (extension) {
          case 'png':
            mimeType = 'image/png';
            break;
          case 'jpg':
          case 'jpeg':
            mimeType = 'image/jpeg';
            break;
          case 'gif':
            mimeType = 'image/gif';
            break;
        }
      }

      // Chuẩn hóa uri cho iOS
      const uri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;

      // Thêm file vào form data với key là 'Image' theo yêu cầu của API
      formData.append('Image', {
        uri,
        type: mimeType,
        name: `avatar.${extension || 'jpg'}`
      } as any);

      const response = await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v1/customer/avatar/${accountId}`,
        formData,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      if (axios.isAxiosError(error) && error.response?.data?.errors?.Image) {
        // Trả về lỗi cụ thể từ API
        throw new Error(error.response.data.errors.Image[0]);
      }
      throw error;
    }
  }
}

export const accountService = new AccountService();
