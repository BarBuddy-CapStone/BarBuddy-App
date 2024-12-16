/**
 * Chuyển đổi các ký tự HTML entities thành ký tự thông thường
 */
export function decodeHtmlEntities(text: string): string {
  const entities = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  };

  return text.replace(/&[a-z0-9]+;/gi, (entity) => {
    return entities[entity as keyof typeof entities] || entity;
  });
}

/**
 * Xóa các ký tự HTML và decode HTML entities
 */
export function sanitizeText(text: string): string {
  // Xóa các thẻ HTML
  const withoutTags = text.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  return decodeHtmlEntities(withoutTags);
} 