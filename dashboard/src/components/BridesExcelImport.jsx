import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, FileUp, RefreshCw, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';

/** Brides page: download the Excel template, fill it, then import it back (bride + booking + payments per row) */
export default function BridesExcelImport({ onImported }) {
  const fileInputRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await apiClient.download('/clients/excel-template', 'قالب_العرائس.xlsx');
    } catch (err) {
      toast.error(err?.message || 'تعذر تحميل القالب');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('يرجى اختيار ملف إكسل بصيغة xlsx');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setIsImporting(true);
    try {
      const res = await apiClient.postFormData('/clients/import-excel', formData);
      setResult(res);
      if (res.created > 0) onImported?.();
    } catch (err) {
      toast.error(err?.message || 'فشل استيراد الملف');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 disabled:opacity-50"
        title="تحميل قالب إكسل لإدخال العرائس"
      >
        {isDownloading ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={14} />}
        <span className="hidden sm:inline">قالب إكسل</span>
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 disabled:opacity-50"
        title="استيراد العرائس من ملف القالب بعد تعبئته"
      >
        {isImporting ? <RefreshCw size={14} className="animate-spin" /> : <FileUp size={14} />}
        <span className="hidden sm:inline">{isImporting ? 'جاري الاستيراد...' : 'استيراد إكسل'}</span>
      </button>
      <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />

      {result && createPortal(
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
          onClick={(e) => e.target === e.currentTarget && setResult(null)}
        >
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800">نتيجة استيراد العرائس</h3>
              <button type="button" onClick={() => setResult(null)} aria-label="إغلاق" className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto">
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold">
                <CheckCircle2 size={16} />
                تم إضافة {result.created} حجز
                {result.updated_clients > 0 && ` (منها ${result.updated_clients} لعرائس موجودة بالفعل)`}
              </div>
              {result.skipped?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-800">
                    <AlertTriangle size={15} />
                    صفوف لم يتم استيرادها ({result.skipped.length}) — صححيها وأعيدي رفعها وحدها
                  </div>
                  <ul className="divide-y divide-slate-100 border border-slate-200 rounded-2xl text-xs">
                    {result.skipped.map((s) => (
                      <li key={s.row} className="p-2.5 flex gap-2">
                        <span className="font-black text-slate-500 whitespace-nowrap">صف {s.row}</span>
                        <span className="font-bold text-slate-700">{s.name || '—'}:</span>
                        <span className="text-rose-700 font-semibold">{s.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
