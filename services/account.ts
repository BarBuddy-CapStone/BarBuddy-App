import api from './api';
import { validateFullname, validatePhone, validateBirthDate } from '@/utils/validation';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { handleConnectionError } from '@/utils/error-handler';

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

interface UpdateResponse {
  data: Account;
  message: string;
}

interface UploadAvatarResponse {
  url: string;
  message: string;
}

class AccountService {
  async getAccountInfo(accountId: string): Promise<Account> {
    try {
      const response = await api.get(`/api/v1/customer/${accountId}`);
      
      if (response.data.statusCode === 200) {
        return response.data.data;
      }
      
      throw new Error(response.data.message);
    } catch (error: any) {
      // Nếu là lỗi từ response của API (có status code)
      if (error.response) {
        throw new Error(error.response.data.message);
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể tải thông tin tài khoản. Vui lòng thử lại sau.'
      );
    }
  }

  async updateAccountInfo(accountId: string, data: UpdateAccountData): Promise<UpdateResponse> {
    try {
      // Validate input data
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

      const currentAccount = await this.getAccountInfo(accountId);

      const payload = {
        email: currentAccount.email,
        image: currentAccount.image,
        status: 1,
        accountId: currentAccount.accountId,
        ...data
      };

      const response = await api.patch(
        `/api/v1/customer-account?accountId=${accountId}`,
        payload
      );

      if (response.data.statusCode === 200) {
        return {
          data: response.data.data,
          message: response.data.message
        };
      }

      throw new Error(response.data.message);
    } catch (error: any) {
      // Nếu là lỗi validation, throw trực tiếp
      if (error.message && !error.response) {
        throw error;
      }
      
      // Nếu là lỗi từ response của API
      if (error.response) {
        throw new Error(error.response.data.message);
      }
      
      // Nếu là lỗi do không kết nối được đến server
      return handleConnectionError(
        async () => { throw error; },
        'Không thể cập nhật thông tin tài khoản. Vui lòng thử lại sau.'
      );
    }
  }

  async uploadAvatar(accountId: string, imageUri: string): Promise<UploadAvatarResponse> {
    try {
      const formData = new FormData();
      
      // Xử lý mime type
      let mimeType = 'image/jpeg';
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

      const uri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;

      formData.append('Image', {
        uri,
        type: mimeType,
        name: `avatar.${extension || 'jpg'}`
      } as any);

      const response = await api.patch(
        `/api/v1/customer/avatar/${accountId}`,
        formData,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
          }
        }
      );

      if (response.data.statusCode === 200) {
        return {
          url: response.data.data.url,
          message: response.data.message
        };
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
        'Không thể tải lên ảnh đại diện. Vui lòng thử lại sau.'
      );
    }
  }
}

export const accountService = new AccountService();
