import React from 'react';
import { BadgePercent, X } from 'lucide-react';
import { offerLabel, offerCoversAny, resolveOfferDiscount } from '@/lib/offers';

/**
 * Offer prompt for booking forms: suggests the running offer on the chosen dresses,
 * applies or removes it, and shows rent / discount / total.
 */
export function OfferDiscountBox({ offers, dressIds, gross, offerId, onChange, savedBooking }) {
  const applied = offerId ? offers.find((o) => o.id === offerId) : null;
  const keptEnded = offerId && !applied && savedBooking?.offer_id === offerId;
  const suggested = !offerId ? offers.find((o) => offerCoversAny(o, dressIds)) : null;
  const discount = resolveOfferDiscount({ offers, offerId, gross, savedBooking });
  const notCovering = applied && !offerCoversAny(applied, dressIds);

  if (!applied && !keptEnded && !suggested) return null;

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-2.5 space-y-2 text-right">
      {suggested ? (
        <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-700">
          <BadgePercent size={16} className="shrink-0" />
          <span className="flex-1">
            الفستان عليه عرض {suggested.name_ar || suggested.name}: {offerLabel(suggested)}
          </span>
          <button
            type="button"
            onClick={() => onChange(suggested.id)}
            className="px-3 py-1 rounded-lg border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
          >
            تطبيق العرض
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-700">
            <BadgePercent size={16} className="shrink-0" />
            <span className="flex-1">
              {applied
                ? `تم تطبيق عرض ${applied.name_ar || applied.name}: ${offerLabel(applied)}`
                : 'عرض محفوظ على الحجز (انتهت مدته)'}
            </span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="p-1 rounded-lg text-indigo-500 hover:bg-indigo-100 transition-colors cursor-pointer"
              aria-label="إلغاء العرض"
              title="إلغاء العرض"
            >
              <X size={14} />
            </button>
          </div>
          {notCovering && (
            <p role="alert" className="text-[10.5px] font-bold text-rose-600">العرض لا يشمل الفساتين المختارة، ألغيه أو غيّري الفستان</p>
          )}
          <div className="border-t border-indigo-100 pt-1.5 space-y-0.5 text-[11px] font-bold font-mono">
            <div className="flex justify-between text-slate-500"><span>سعر الإيجار</span><span>{gross.toLocaleString()} ج.م</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600"><span>الخصم</span><span>−{discount.toLocaleString()} ج.م</span></div>
            )}
            <div className="flex justify-between text-slate-800"><span>الإجمالي بعد العرض</span><span>{Math.max(0, gross - discount).toLocaleString()} ج.م</span></div>
          </div>
        </>
      )}
    </div>
  );
}
