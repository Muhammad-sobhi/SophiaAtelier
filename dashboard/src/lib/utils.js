import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function cleanDate(raw) {
  if (!raw) return '';
  return String(raw).trim().split('T')[0].split(' ')[0];
}

export function formatDate(raw) {
  if (!raw) return '-';
  const clean = cleanDate(raw);
  if (!clean) return '-';
  try {
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return clean;
  } catch {
    return clean;
  }
}