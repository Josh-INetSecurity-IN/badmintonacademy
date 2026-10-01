export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const formatINR = (amount: number | string | null | undefined): string => {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const getAge = (dateOfBirth: string | Date | null | undefined): number | null => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
};

export const normalizePhone = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  if (!cleaned.startsWith('91') && cleaned.length === 12) cleaned = '91' + cleaned.slice(-10);
  return cleaned;
};

export const buildWhatsAppLink = (phone: string, message: string): string => {
  const normalized = normalizePhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};

export const buildPaymentReminder = (params: {
  name: string;
  academyName: string;
  feeType: string;
  amount: number;
  billingMonth: string;
  dueDate: string;
}): string => {
  return `Hello ${params.name},

This is a gentle reminder from ${params.academyName} that your ${params.feeType} of ${formatINR(params.amount)} for ${params.billingMonth} is due on ${params.dueDate}.

Kindly make the payment at your convenience.

If you have already paid, please ignore this message.

Thank you,
${params.academyName}`;
};

export const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escape = (val: string | number): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const getMonthLabel = (monthKey: string): string => {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
};