/** DD-MM-YY, the format every Figma frame uses. */
export function formatDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${String(date.getFullYear()).slice(2)}`;
}

export function today() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const formatNumber = (value) =>
  value === null || value === undefined || value === '' ? '' : Number(value).toLocaleString('en-IN');

export const formatMoney = (value) =>
  Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
