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

export const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) {
    return 'Vui lòng xác nhận mật khẩu';
  }

  if (password !== confirmPassword) {
    return 'Mật khẩu xác nhận không khớp';
  }

  return null;
};

export const validateFullname = (name: string): string | null => {
  if (!name) {
    return 'Họ tên không được để trống';
  }

  if (name.length > 100) {
    return 'Họ tên không được vượt quá 100 ký tự';
  }

  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone) {
    return null; // Phone is optional
  }

  const phoneRegex = /^0[3-9]\d{8,9}$/;
  if (!phoneRegex.test(phone)) {
    return 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam hợp lệ';
  }

  return null;
};

export const validateBirthDate = (birthDate: string): string | null => {
  if (!birthDate) {
    return 'Ngày sinh không được để trống';
  }

  // Kiểm tra định dạng DD/MM/YYYY
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!dateRegex.test(birthDate)) {
    return 'Ngày sinh không đúng định dạng DD/MM/YYYY';
  }

  // Chuyển đổi chuỗi thành Date object
  const [day, month, year] = birthDate.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  const now = new Date();

  // Kiểm tra tính hợp lệ của ngày
  if (date.getDate() !== day || date.getMonth() + 1 !== month || date.getFullYear() !== year) {
    return 'Ngày sinh không hợp lệ';
  }

  // Kiểm tra tuổi >= 18
  const age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (age < 18 || (age === 18 && monthDiff < 0) || 
      (age === 18 && monthDiff === 0 && now.getDate() < date.getDate())) {
    return 'Bạn phải đủ 18 tuổi';
  }

  return null;
};

export const validateRegisterForm = (
  email: string,
  password: string,
  confirmPassword: string,
  fullname: string,
  phone: string,
  birthDate: string
): string | null => {
  const emailError = validateEmail(email);
  if (emailError) return emailError;

  const passwordError = validatePassword(password);
  if (passwordError) return passwordError;

  const confirmPasswordError = validateConfirmPassword(password, confirmPassword);
  if (confirmPasswordError) return confirmPasswordError;

  const fullnameError = validateFullname(fullname);
  if (fullnameError) return fullnameError;

  const phoneError = validatePhone(phone);
  if (phoneError) return phoneError;

  const birthDateError = validateBirthDate(birthDate);
  if (birthDateError) return birthDateError;

  return null;
};
