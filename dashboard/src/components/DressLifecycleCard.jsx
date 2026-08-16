import React, { useState, useEffect } from 'react';
import { apiClient, getStorageUrl } from '@/lib/api-client';
import { CheckCircle2, ShoppingBag, Sparkles, DollarSign, Ruler } from 'lucide-react';

const DRESS_STAGES = [
  { id: 'ready', label: 'جاهز', icon: CheckCircle2, color: 'emerald' },
  { id: 'booked', label: 'محجوز', icon: ShoppingBag, color: 'blue' },
  { id: 'dry_clean', label: 'دراي كلين', icon: Sparkles, color: 'purple' },
];

export function DressLifecycleCard({ dress, onStageUpdate, apiBaseUrl }) {
  const [selectedMobileStage, setSelectedMobileStage] = useState(dress?.current_stage || 'ready');

  useEffect(() => {
    setSelectedMobileStage(dress?.current_stage || 'ready');
  }, [dress?.id, dress?.current_stage]);

  const handleStageAction = async (action) => {
    try {
      await apiClient.put(`/dresses/${dress.id}/stage-action`, { action });
      onStageUpdate?.();
    } catch (e) {
      console.error('Dress stage action failed:', e);
      alert(e?.message || 'فشل تنفيذ الإجراء.');
    }
  };

  const getActions = () => {
    switch (dress?.current_stage) {
      case 'ready':
        return [
          { label: 'حجز الفستان', action: 'mark_booked', color: 'bg-blue-600 hover:bg-blue-700', disabled: false }
        ];
      case 'booked':
        if (dress.status === 'out') {
          return [
            { label: 'إرجاع ودراي كلين', action: 'mark_dry_clean', color: 'bg-purple-600 hover:bg-purple-700', disabled: false }
          ];
        }
        return [
          { label: 'تسليم للعميلة', action: 'mark_out', color: 'bg-amber-600 hover:bg-amber-700', disabled: false },
          { label: 'إلغاء الحجز', action: 'cancel_booking', color: 'bg-slate-500 hover:bg-slate-600', disabled: false }
        ];
      case 'dry_clean':
        return [
          { label: 'إنهاء التنظيف', action: 'mark_ready', color: 'bg-emerald-600 hover:bg-emerald-700', disabled: false }
        ];
      default:
        return [];
    }
  };

  const actions = getActions();

  const imageUrl = getStorageUrl(dress?.image_path || dress?.images?.[0]?.image_path || dress?.images?.[0] || dress);

  const renderColumn = (stageId, label, colorClasses) => {
    const isActive = dress?.current_stage === stageId;

    return (
      <div key={stageId} className="flex flex-col space-y-2">
        <div className={`py-1.5 px-2.5 rounded-xl border border-slate-100 font-extrabold text-[10px] text-center ${colorClasses}`}>
          {label}
        </div>

        <div className="flex-1 min-h-[140px]">
          {isActive ? (
            <div className="bg-white rounded-2xl border border-slate-150 p-2.5 shadow-xs relative transition-all duration-300 hover:shadow-md flex flex-col justify-between h-full">
              <div className="flex items-start gap-2.5 mb-2">
                {/* Thumbnail */}
                <div className="relative w-14 h-18 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0">
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden w-full h-full items-center justify-center bg-slate-50">
                        <Sparkles size={16} className="text-slate-300" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles size={16} className="text-slate-300" />
                    </div>
                  )}

                  {dress.trying_fee > 0 && (
                    <div className="absolute top-0.5 right-0.5 bg-rose-600/90 text-white text-[6.5px] font-black px-1 py-0.2 rounded shadow-2xs">
                      رسوم قياس
                    </div>
                  )}
                </div>

                {/* Info Block */}
                <div className="flex-1 min-w-0 text-right space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-black text-slate-800 truncate leading-tight">{dress.name}</h4>
                    {dress.code && (
                      <span className="text-[7.5px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1 py-0.2 rounded flex-shrink-0">
                        #{dress.code}
                      </span>
                    )}
                  </div>
                  {dress.designer && (
                    <span className="text-[8.5px] font-bold text-slate-400 block truncate">المصمم: {dress.designer}</span>
                  )}
                  <div className="flex items-center gap-2 text-[8.5px] font-extrabold text-slate-600 flex-wrap pt-0.5">
                    <div className="flex items-center gap-0.5">
                      <Ruler size={9} className="text-slate-400" />
                      <span>مقاس: {dress.size || '—'}</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-indigo-650">
                      <DollarSign size={9} className="text-indigo-400" />
                      <span>إيجار: {parseFloat(dress.rental_price || 0).toLocaleString()} ج.م</span>
                    </div>
                  </div>
                  {dress.latest_booking_client && (
                    <div className="text-[8px] text-slate-600 font-bold bg-slate-50 rounded-lg px-1.5 py-0.5 border border-slate-150 truncate mt-1">
                      العميلة: {dress.latest_booking_client}
                    </div>
                  )}
                </div>
              </div>

              {actions.length > 0 && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                  {actions.map((act) => (
                    <button
                      key={act.action}
                      onClick={() => act.action && handleStageAction(act.action)}
                      disabled={act.disabled}
                      className={`flex-1 py-1.5 text-white rounded-xl text-[9px] font-extrabold transition-all duration-300 active:scale-95 cursor-pointer shadow-2xs ${act.color}`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full border border-dashed border-slate-200/70 rounded-2xl flex items-center justify-center bg-slate-50/20 p-2 min-h-[140px]">
              <span className="text-[9px] font-bold text-slate-300">—</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-150 p-3 sm:p-4 shadow-xs animate-fade-in h-full" dir="rtl">
      {/* Mobile Stage Selector Tabs */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-2 mb-3 border-b border-slate-100 scrollbar-none">
        {DRESS_STAGES.map((s) => {
          const isSelected = selectedMobileStage === s.id;
          const isCurrentStage = dress?.current_stage === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedMobileStage(s.id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-violet-600 text-white shadow-xs'
                  : isCurrentStage
                  ? 'bg-violet-50 text-violet-700 border border-violet-200'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span>{s.label}</span>
              {isCurrentStage && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* Desktop Grid containing 3 Columns */}
      <div className="hidden md:grid md:grid-cols-3 gap-3 text-right">
        {renderColumn('ready', 'جاهز (جاهز للاستخدام)', 'border-emerald-100 bg-emerald-50/40 text-emerald-700')}
        {renderColumn('booked', 'محجوز (محجوز / مستأجر)', 'border-blue-100 bg-blue-50/40 text-blue-700')}
        {renderColumn('dry_clean', 'دراي كلين (تنظيف / صيانة)', 'border-purple-100 bg-purple-50/40 text-purple-700')}
      </div>

      {/* Mobile Single Selected Stage Display */}
      <div className="block md:hidden text-right">
        {selectedMobileStage === 'ready' && renderColumn('ready', 'جاهز (جاهز للاستخدام)', 'border-emerald-100 bg-emerald-50/40 text-emerald-700')}
        {selectedMobileStage === 'booked' && renderColumn('booked', 'محجوز (محجوز / مستأجر)', 'border-blue-100 bg-blue-50/40 text-blue-700')}
        {selectedMobileStage === 'dry_clean' && renderColumn('dry_clean', 'دراي كلين (تنظيف / صيانة)', 'border-purple-100 bg-purple-50/40 text-purple-700')}
      </div>
    </div>
  );
}