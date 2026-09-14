import React, { useState, useEffect, useMemo } from 'react';
import { Users, Share2, MapPin, TrendingUp, Heart, Ruler, Package, RotateCcw, Calendar } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export function BridesLifecycleReport() {
  const [brides, setBrides] = useState([]);
  const [visits, setVisits] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      apiClient.get('/clients?per_page=1000'),
      apiClient.get('/visits?per_page=1000'),
      apiClient.get('/bookings?per_page=1000'),
    ])
      .then(([clientRes, visRes, bookRes]) => {
        if (!isMounted) return;
        setBrides(Array.isArray(clientRes) ? clientRes : clientRes?.data || []);
        setVisits(Array.isArray(visRes) ? visRes : visRes?.data || []);
        setBookings(Array.isArray(bookRes) ? bookRes : bookRes?.data || []);
      })
      .catch((err) => console.error('Failed to load brides report:', err))
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, []);

  // Lifecycle Funnel Counts
  const funnel = useMemo(() => {
    const totalClients = brides.length;
    let visitCount = 0;
    let bookingCount = 0;
    let fittingCount = 0;
    let pickupCount = 0;
    let returnCount = 0;

    brides.forEach((b) => {
      const stage = b.current_stage || b.stage || 'visit';
      if (stage === 'visit') visitCount += 1;
      else if (stage === 'booking') bookingCount += 1;
      else if (stage === 'fitting') fittingCount += 1;
      else if (stage === 'picked_up') pickupCount += 1;
      else if (stage === 'returned') returnCount += 1;
    });

    return [
      { id: 'visit', label: 'الزيارة الأولى', count: visitCount, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-400' },
      { id: 'booking', label: 'حجز مؤكد', count: bookingCount, icon: Heart, color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
      { id: 'fitting', label: 'بروفات القياس', count: fittingCount, icon: Ruler, color: 'text-violet-600', bg: 'bg-violet-50', bar: 'bg-violet-500' },
      { id: 'picked_up', label: 'استلام الفستان', count: pickupCount, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' },
      { id: 'returned', label: 'إرجاع وتسوية', count: returnCount, icon: RotateCcw, color: 'text-slate-600', bg: 'bg-slate-100', bar: 'bg-slate-500' },
    ];
  }, [brides]);

  // Marketing Channels
  const channelStats = useMemo(() => {
    const map = {};
    const total = brides.length || 1;

    brides.forEach((b) => {
      const src = b.source || 'أخرى';
      if (!map[src]) map[src] = { count: 0, booked: 0 };
      map[src].count += 1;
      const stage = b.current_stage || b.stage;
      if (['booking', 'fitting', 'picked_up', 'returned'].includes(stage)) {
        map[src].booked += 1;
      }
    });

    const labels = {
      instagram: 'انستجرام (Instagram)',
      whatsapp: 'واتساب (WhatsApp)',
      facebook: 'فيسبوك (Facebook)',
      walkin: 'زيارة مباشرة (Walk-in)',
      referral: 'ترشيح / معرفة سابقة',
      other: 'أخرى (Other)'
    };

    return Object.entries(map).map(([key, data]) => ({
      key,
      label: labels[key.toLowerCase()] || key,
      count: data.count,
      percent: Math.round((data.count / total) * 100),
      convRate: data.count > 0 ? Math.round((data.booked / data.count) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [brides]);

  // Cities breakdown
  const cityStats = useMemo(() => {
    const map = {};
    brides.forEach((b) => {
      const city = b.city?.trim() || 'غير محدد';
      map[city] = (map[city] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [brides]);

  return (
    <div className="space-y-4 animate-fade-in text-right" dir="rtl">
      {/* Funnel Section */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-150 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">تقارير العرائس</h3>
              <p className="text-[10px] font-bold text-slate-400">توزيع إجمالي العرائس الحالي عبر مراحل الرحلة</p>
            </div>
          </div>
          <span className="font-mono text-xs font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl border border-indigo-100">
            {brides.length} عروس مسجلة
          </span>
        </div>

        {/* Funnel Step Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-2">
          {funnel.map((step) => {
            const Icon = step.icon;
            const percent = brides.length > 0 ? Math.round((step.count / brides.length) * 100) : 0;
            return (
              <div key={step.id} className="p-3 bg-slate-50/70 border border-slate-150 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`w-7 h-7 rounded-lg ${step.bg} ${step.color} flex items-center justify-center`}>
                    <Icon size={14} />
                  </div>
                  <span className="font-mono text-xs font-black text-slate-800">{step.count}</span>
                </div>
                <div>
                  <span className="text-[11px] font-black text-slate-700 block">{step.label}</span>
                  <span className="text-[9.5px] font-bold text-slate-400 block">{percent}% من الإجمالي</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${step.bar}`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Grid: Marketing Sources & Geographic Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Marketing Sources */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-150 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Share2 size={16} className="text-indigo-600" />
              <h3 className="text-xs font-black text-slate-800">قنوات الاستقطاب والتسويق</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">معدل التحويل للحجز</span>
          </div>

          <div className="space-y-3">
            {channelStats.map((ch) => (
              <div key={ch.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{ch.label}</span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-400 font-mono">{ch.count} عروس ({ch.percent}%)</span>
                    <span className="text-emerald-700 font-mono font-black bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {ch.convRate}% تحويل
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${ch.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-150 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-rose-600" />
              <h3 className="text-xs font-black text-slate-800">التوزيع الجغرافي (أعلى المدن والمحافظات)</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">إقبال العرائس</span>
          </div>

          <div className="space-y-2.5">
            {cityStats.map((c) => {
              const p = brides.length > 0 ? Math.round((c.count / brides.length) * 100) : 0;
              return (
                <div key={c.name} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-150/70">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-xs font-black text-slate-800">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="font-mono text-slate-700">{c.count} عروس</span>
                    <span className="font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {p}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BridesLifecycleReport;
