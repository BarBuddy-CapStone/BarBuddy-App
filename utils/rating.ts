// Tạo file mới để chứa hàm helper
export const formatRating = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return 'Chưa có đánh giá';
  return Number.isInteger(rating) ? rating.toString() : rating.toFixed(1);
}; 