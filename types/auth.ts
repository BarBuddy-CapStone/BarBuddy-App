export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullname: string;
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
