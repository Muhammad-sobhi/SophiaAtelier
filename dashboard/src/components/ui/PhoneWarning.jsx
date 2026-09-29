import { AlertTriangle } from 'lucide-react';
import { getPhoneWarning } from '@/lib/phone';

/** Non-blocking warning under a bride phone field */
export function PhoneWarning({ value }) {
  const warning = getPhoneWarning(value);
  if (!warning) return null;
  return (
    <p role="alert" className="mt-1 text-[10px] font-bold text-amber-700 text-right flex items-start gap-1 leading-snug">
      <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
      <span>{warning}</span>
    </p>
  );
}
