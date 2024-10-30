export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  fullname: string;
  phone: string;
  dob: string; // ISO string format
}

export interface RegisterResponse {
  statusCode: number;
  message: string;
  data: boolean;
}

export interface LoginResponse {
  statusCode: number;
  message: string;
  data?: {
    accountId: string;
    fullname: string;
    email: string;
    phone: string;
    image: string;
    accessToken: string;
    identityId: string | null;
  };
}

export interface ErrorResponse {
  statusCode: number;
  message: string;
}

export interface UserInfo {
  accountId: string;
  fullname: string;
  email: string;
  phone: string;
  image: string;
  accessToken: string;
  identityId: string | null;
  role: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface VerifyOTPResponse {
  statusCode: number;
  message: string;
  data: null;
}
