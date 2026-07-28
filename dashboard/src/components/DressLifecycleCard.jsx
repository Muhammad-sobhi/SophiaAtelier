import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
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

  const imageUrl = dress?.image_path
    ? `${(apiBaseUrl || import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${dress.image_path}`
    : null;

  const renderColumn = (stageId, label, colorClasses) => {
    const isActive = dress?.current_stage === stageId;

    return (
      <div key={stageId} className="flex flex-col space-y-3">
        <div className={`p-2.5 rounded-xl border border-slate-100 font-extrabold text-[11px] text-center ${colorClasses}`}>
          {label}
        </div>

        <div className="flex-1 min-h-[220px]">
          {isActive ? (
            <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative transition-all duration-300 hover:shadow-md">
              <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 mb-3.5">
                {imageUrl ? (
                  <img src={imageUrl} alt={dress.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Sparkles size={24} className="text-slate-300" />
                  </div>
                )}

                {dress.trying_fee > 0 && (
                  <div className="absolute top-2 right-2 bg-rose-600/90 text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-sm">
                    رسوم قياس: {dress.trying_fee.toLocaleString()} ج.م
                  </div>
                )}
              </div>

              <div className="mb-3">
                <h4 className="text-xs font-black text-slate-800 mb-0.5">{dress.name}</h4>
                {dress.designer && (
                  <span className="text-[10px] font-bold text-slate-400">الديزاينر: {dress.designer}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold text-slate-650 mb-3.5">
                <div className="flex items-center gap-1.5">
                  <Ruler size={10} className="text-slate-400" />
                  <span>مقاس: {dress.size || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign size={10} className="text-slate-400" />
                  <span>إيجار: {parseFloat(dress.rental_price || 0).toLocaleString()} ج.م</span>
                </div>
                {dress.latest_booking_client && (
                  <div className="col-span-2 text-[9px] text-slate-500 font-bold bg-slate-50 rounded-lg p-1.5 border border-slate-100 mt-1">
                    العميلة: {dress.latest_booking_client}
                  </div>
                )}
              </div>

              {actions.length > 0 && (
                <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                  {actions.map((act) => (
                    <button
                      key={act.action}
                      onClick={() => act.action && handleStageAction(act.action)}
                      disabled={act.disabled}
                      className={`w-full py-2.5 text-white rounded-xl text-[10px] font-extrabold transition-all duration-300 active:scale-95 cursor-pointer shadow-xs ${act.color}`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full border border-dashed border-slate-200/60 rounded-2xl flex items-center justify-center bg-slate-50/20 p-4 min-h-[220px]">
              <span className="text-[10px] font-bold text-slate-300">—</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-4 sm:p-6 shadow-xs animate-fade-in h-full" dir="rtl">
      {/* Mobile Stage Selector Tabs */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-3 mb-4 border-b border-slate-100 scrollbar-none">
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
      <div className="hidden md:grid md:grid-cols-3 gap-6 text-right">
        {renderColumn('ready', 'جاهز (جاهز للاستخدام)', 'border-emerald-100 bg-emerald-50/30 text-emerald-700')}
        {renderColumn('booked', 'محجوز (محجوز / مستأجر)', 'border-blue-100 bg-blue-50/30 text-blue-700')}
        {renderColumn('dry_clean', 'دراي كلين (تنظيف / صيانة)', 'border-purple-100 bg-purple-50/30 text-purple-700')}
      </div>

      {/* Mobile Single Selected Stage Display */}
      <div className="block md:hidden text-right">
        {selectedMobileStage === 'ready' && renderColumn('ready', 'جاهز (جاهز للاستخدام)', 'border-emerald-100 bg-emerald-50/30 text-emerald-700')}
        {selectedMobileStage === 'booked' && renderColumn('booked', 'محجوز (محجوز / مستأجر)', 'border-blue-100 bg-blue-50/30 text-blue-700')}
        {selectedMobileStage === 'dry_clean' && renderColumn('dry_clean', 'دراي كلين (تنظيف / صيانة)', 'border-purple-100 bg-purple-50/30 text-purple-700')}
      </div>
    </div>
  );
}