import React from 'react';

/**
 * One dress's availability from the API (/visits/{id}/availability or /availability):
 * on the try-on date and on the bride's wedding date.
 */
export function DressAvailability({ row }) {
  if (!row) return null;
  const onVisit = row.visit_date;
  const onWedding = row.wedding_date;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] font-bold">
      <div className={`rounded-lg px-2 py-1 border ${!onVisit ? 'bg-slate-50 border-slate-100 text-slate-500' : onVisit.available ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
        {!onVisit ? (
          <div>تاريخ الزيارة غير محدد</div>
        ) : onVisit.available ? (
          <div className="font-black">✓ متاح يوم التجربة</div>
        ) : (
          <>
            <div className="font-black">✗ غير متاح يوم التجربة</div>
            <div className="leading-snug opacity-90">{onVisit.reason}</div>
            <div className="font-black">
              {onVisit.available_from ? <>متاح للتجربة من: <span dir="ltr">{onVisit.available_from}</span></> : 'موعد الإتاحة غير محدد'}
            </div>
          </>
        )}
      </div>
      <div className={`rounded-lg px-2 py-1 border ${!onWedding ? 'bg-slate-50 border-slate-100 text-slate-500' : onWedding.available ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
        {!onWedding ? (
          <div>تاريخ الفرح غير محدد</div>
        ) : onWedding.available ? (
          <div className="font-black">✓ متاح يوم الفرح</div>
        ) : (
          <>
            <div className="font-black">✗ محجوز يوم الفرح</div>
            {onWedding.conflicts?.map((c, i) => (
              <div key={i} className="leading-snug">لـ {c.client_name || 'عروس أخرى'}: من <span dir="ltr">{c.from}</span> إلى <span dir="ltr">{c.to}</span></div>
            ))}
            {onWedding.available_from && (
              <div className="font-black">متاح لفرح من: <span dir="ltr">{onWedding.available_from}</span></div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
