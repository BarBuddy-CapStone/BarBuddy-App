export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'Email không được để trống';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Email không hợp lệ';
  }
  
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Mật khẩu không được để trống';
  }
  
  if (password.length < 6 || password.length > 20) {
    return 'Mật khẩu phải từ 6-20 ký tự';
  }
  
  return null;
};
