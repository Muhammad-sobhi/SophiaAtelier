import React, { useRef } from 'react';
import { Paperclip, X } from 'lucide-react';

/** Optional receipt image for a payroll payment / loan; value is a data URL sent as receipt_image */
export default function ReceiptPicker({ value, onChange }) {
  const inputRef = useRef(null);

  const pick = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  const clear = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <input type="file" accept="image/*" ref={inputRef} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-1.5 rounded-2xl">
          <img src={value} alt="إيصال" className="w-10 h-10 rounded-xl object-cover border border-emerald-300" />
          <span className="flex-1 text-[10px] font-bold text-emerald-700">تم إرفاق الإيصال</span>
          <button type="button" onClick={clear} className="p-1 text-rose-500 hover:bg-rose-100/60 rounded-lg cursor-pointer" title="حذف الإيصال">
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-3 py-2 rounded-2xl border border-dashed border-slate-300 hover:border-indigo-300 transition-all cursor-pointer">
          <Paperclip size={13} />
          إرفاق صورة الإيصال (اختياري)
        </button>
      )}
    </div>
  );
}
