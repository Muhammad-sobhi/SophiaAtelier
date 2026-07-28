import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Sparkles, Calendar, TrendingUp, Users, ShoppingBag, Share2, UserCheck, Award } from 'lucide-react';











export default function ReportsPage() {
  const [visits, setVisits] = useState([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [sourceStats, setSourceStats] = useState({});
  const [dressStats, setDressStats] = useState({});
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [employeeStats, setEmployeeStats] = useState(







    []);

  const channelSourceLabels = {
    'instagram': 'إنستجرام (Instagram)',
    'whatsapp': 'واتساب (WhatsApp)',
    'walkin': 'زيارة مباشرة (Walk-in)',
    'referral': 'توصية (Referral)',
    'website': 'الموقع الإلكتروني (Website)',
    'أخرى': 'أخرى (Other)'
  };

  useEffect(() => {
    const loadReportData = async () => {
      try {
        // 1. Fetch Visits
        const visitsRes = await apiClient.get('/visits');
        const visitsData = Array.isArray(visitsRes) ? visitsRes : visitsRes.data || [];

        const mappedVisits = visitsData.map((v) => ({
          id: v.id,
          client: v.client?.name || v.client_name || '-',
          date: v.visit_date || v.date || '',
          source: v.source || 'أخرى',
          status: v.status || 'arrived',
          triedDresses: [],
          bookedDresses: []
        }));
        setVisits(mappedVisits);

        // 2. Fetch Bookings
        const bookingsRes = await apiClient.get('/bookings');
        const bookingsList = Array.isArray(bookingsRes) ? bookingsRes : bookingsRes.data || [];

        // 3. Fetch Fittings
        const fittingsRes = await apiClient.get('/fittings');
        const fittingsList = Array.isArray(fittingsRes) ? fittingsRes : fittingsRes.data || [];

        const total = mappedVisits.length;
        const bookingsCount = bookingsList.length;
        const rate = total > 0 ? Math.round(bookingsCount / total * 100) : 0;

        setTotalVisits(total);
        setTotalBookings(bookingsCount);
        setConversionRate(rate);

        // 4. Compile marketing channel statistics
        const channelMap = {};
        mappedVisits.forEach((v) => {
          const srcKey = v.source.toLowerCase();
          const srcLabel = channelSourceLabels[srcKey] || v.source;

          if (!channelMap[srcLabel]) {
            channelMap[srcLabel] = { visits: 0, bookings: 0 };
          }
          channelMap[srcLabel].visits += 1;
        });

        // Add bookings to channel map
        bookingsList.forEach((b) => {
          const clientSource = b.client?.source || 'أخرى';
          const srcKey = clientSource.toLowerCase();
          const srcLabel = channelSourceLabels[srcKey] || clientSource;

          if (!channelMap[srcLabel]) {
            channelMap[srcLabel] = { visits: 0, bookings: 0 };
          }
          channelMap[srcLabel].bookings += 1;
        });
        setSourceStats(channelMap);

        // 5. Compile dress try-on and booking statistics
        const dressMap = {};

        // Process try-ons from fittings
        fittingsList.forEach((f) => {
          const dressName = f.booking?.dress?.name;
          if (dressName) {
            if (!dressMap[dressName]) {
              dressMap[dressName] = { tried: 0, booked: 0 };
            }
            dressMap[dressName].tried += 1;
          }
        });

        // Process bookings
        bookingsList.forEach((b) => {
          const dressName = b.dress?.name;
          if (dressName) {
            if (!dressMap[dressName]) {
              dressMap[dressName] = { tried: 0, booked: 0 };
            }
            dressMap[dressName].booked += 1;
            if (dressMap[dressName].tried < dressMap[dressName].booked) {
              dressMap[dressName].tried = dressMap[dressName].booked;
            }
          }
        });
        setDressStats(dressMap);

        // 6. Load actual expenses
        let totalExpSum = 0;
        try {
          const expRes = await apiClient.get('/expenses');
          const expList = Array.isArray(expRes) ? expRes : expRes.data || [];
          expList.forEach((e) => {
            totalExpSum += parseFloat(e.amount || 0);
          });
        } catch (e) {
          console.error('Failed to load expenses for reports:', e);
        }
        setTotalExpenses(totalExpSum);

        // 7. Load employee performance stats
        try {
          const employeesRes = await apiClient.get('/employees');
          const employeesList = Array.isArray(employeesRes) ? employeesRes : employeesRes.data || [];

          // Map fittings by sales_associate name and tailor_id
          const empMap =


          {};

          employeesList.forEach((emp) => {
            empMap[emp.id] = {
              name: emp.name || '-',
              position: emp.position || 'موظف',
              totalFittings: 0,
              completedFittings: 0,
              totalBookings: bookingsList.length
            };
          });

          // Count fittings per employee via tailor_id
          fittingsList.forEach((f) => {
            const tailorId = f.tailor_id;
            if (tailorId && empMap[tailorId]) {
              empMap[tailorId].totalFittings += 1;
              if (f.status === 'completed') empMap[tailorId].completedFittings += 1;
            }
          });

          const empStats = employeesList.
          filter((emp) => empMap[emp.id] && empMap[emp.id].totalFittings > 0).
          map((emp) => {
            const d = empMap[emp.id];
            const rate = d.totalFittings > 0 ? Math.round(d.completedFittings / d.totalFittings * 100) : 0;
            return { id: emp.id, name: d.name, position: d.position, totalFittings: d.totalFittings, completedFittings: d.completedFittings, totalBookings: d.totalBookings, successRate: rate };
          }).
          sort((a, b) => b.completedFittings - a.completedFittings);

          setEmployeeStats(empStats);
        } catch (e) {
          console.error('Failed to load employee stats:', e);
        }
      } catch (err) {
        console.error('Failed to load report metrics:', err);
      }
    };

    loadReportData();
  }, []);

  // Standard reports data
  const mainReports = [
  {
    title: 'إجمالي الزيارات',
    subtitle: 'حجم حركة الإقبال بالمعرض',
    value: `${totalVisits} زيارة`,
    change: 'نشط',
    changeColorClass: 'text-indigo-600',
    icon: <Users size={16} className="text-indigo-600" />,
    bars: [30, 45, 60, 40, 75, 80, totalVisits * 5]
  },
  {
    title: 'معدل تحويل الزيارات',
    subtitle: 'نسبة الزيارات التي تحولت لحجز مؤكد',
    value: `${conversionRate}%`,
    change: '+5%',
    changeColorClass: 'text-emerald-600',
    icon: <TrendingUp size={16} className="text-emerald-600" />,
    bars: [40, 55, 60, 50, 70, 65, conversionRate]
  },
  {
    title: 'إجمالي الحجوزات المباشرة',
    subtitle: 'حجوزات تمت عبر الزيارات',
    value: `${totalBookings} حجوزات`,
    change: 'مستقر',
    changeColorClass: 'text-slate-600',
    icon: <ShoppingBag size={16} className="text-indigo-600" />,
    bars: [20, 30, 45, 35, 50, 45, totalBookings * 10]
  },
  {
    title: 'المصروفات التشغيلية والتسويق',
    subtitle: 'مقارنة بالشهر السابق',
    value: `${totalExpenses.toLocaleString()} ج.م`,
    change: 'مستمر',
    changeColorClass: 'text-rose-600',
    icon: <Calendar size={16} className="text-rose-600" />,
    bars: [50, 60, 45, 55, 40, 35, totalExpenses > 0 ? Math.min(100, Math.round(totalExpenses / 1000)) : 10]
  }];


  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in text-right" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
          <span>تقارير الإحصائيات والتحليلات التسويقية</span>
          <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-violet-50 text-violet-600 rounded-full border border-violet-100">تحليل تلقائي</span>
        </h1>
        <p className="text-xs text-slate-400 font-bold mt-1">
          رؤى تسويقية مستخرجة تلقائياً من سجلات الزيارات لقياس كفاءة قنوات الإعلان ونسبة إقبال تجربة وحجز الفساتين.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainReports.map((report) =>
        <div key={report.title} className="bg-white rounded-3xl p-5 border border-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:shadow-[0_12px_40px_rgba(79,70,229,0.04)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                  {report.icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-xs">{report.title}</h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">{report.subtitle}</p>
                </div>
              </div>
              <span className={`text-[10px] font-extrabold ${report.changeColorClass}`}>{report.change}</span>
            </div>
            <div className="text-xl font-extrabold text-slate-800 mb-4">{report.value}</div>
            <div className="flex items-end gap-2 h-16">
              {report.bars.map((bar, i) =>
            <div
              key={i}
              className="flex-1 rounded-t-lg transition-all duration-500"
              style={{
                height: `${Math.min(100, Math.max(10, bar))}%`,
                backgroundColor: i === report.bars.length - 1 ? '#4f46e5' : '#eef2ff'
              }} />

            )}
            </div>
          </div>
        )}
      </div>

      {/* Two Column Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Marketing Channels Performance */}
        <div className="bg-white rounded-3xl p-6 border border-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Share2 size={16} className="text-indigo-600" />
              <span>أداء قنوات التسويق والمصادر</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400">حسب إجمالي الزيارات والحجوزات</span>
          </div>

          <div className="space-y-4">
            {Object.keys(sourceStats).length === 0 ?
            <p className="text-xs text-slate-400 text-center py-8">لا توجد بيانات كافية لاستخراج القنوات.</p> :

            Object.entries(sourceStats).map(([source, stats]) => {
              const percentage = totalVisits > 0 ? Math.round(stats.visits / totalVisits * 100) : 0;
              const channelConvRate = stats.visits > 0 ? Math.round(stats.bookings / stats.visits * 100) : 0;
              return (
                <div key={source} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span>{source}</span>
                      </div>
                      <div className="flex gap-4 text-slate-400 text-[10px]">
                        <span>{stats.visits} زيارات ({percentage}%)</span>
                        <span className="text-emerald-600">معدل التحويل: {channelConvRate}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100/50">
                      <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }} />
                    
                    </div>
                  </div>);

            })
            }
          </div>
        </div>

        {/* Dress Try-on and Booking Insights */}
        <div className="bg-white rounded-3xl p-6 border border-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600" />
              <span>إحصائيات تجربة وحجز الفساتين</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400">تتبع اهتمام وتفضيل العرائس</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-xs font-extrabold text-slate-400">الفستان</th>
                  <th className="pb-3 text-xs font-extrabold text-slate-400 text-center">مرات التجربة</th>
                  <th className="pb-3 text-xs font-extrabold text-slate-400 text-center">مرات الحجز</th>
                  <th className="pb-3 text-xs font-extrabold text-slate-400 text-left">معدل النجاح</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(dressStats).length === 0 ?
                <tr>
                    <td colSpan={4} className="py-8 text-xs text-slate-400 text-center">لا توجد تفاصيل فساتين مسجلة بعد.</td>
                  </tr> :

                Object.entries(dressStats).
                sort((a, b) => b[1].booked - a[1].booked || b[1].tried - a[1].tried).
                map(([dress, stats]) => {
                  const successRate = stats.tried > 0 ? Math.round(stats.booked / stats.tried * 100) : 0;
                  return (
                    <tr key={dress} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all">
                          <td className="py-3 text-xs font-bold text-slate-800">{dress}</td>
                          <td className="py-3 text-xs text-slate-500 font-semibold text-center">{stats.tried}</td>
                          <td className="py-3 text-xs text-indigo-600 font-extrabold text-center">{stats.booked}</td>
                          <td className="py-3 text-left">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                        successRate >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`
                        }>
                              {successRate}% حجز
                            </span>
                          </td>
                        </tr>);

                })
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Employee Performance Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <UserCheck size={16} className="text-indigo-600" />
            <span>أداء موظفي المبيعات والخياطة</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-400">حسب البروفات المنجزة</span>
        </div>

        {employeeStats.length === 0 ?
        <p className="text-xs text-slate-400 text-center py-8">
            لا توجد بيانات أداء بعد — يجب ربط الموظفين بالبروفات أولاً.
          </p> :

        <div className="space-y-4">
            {employeeStats.map((emp, idx) =>
          <div key={emp.id} className="flex items-center gap-4 p-4 bg-slate-50/60 rounded-2xl border border-slate-100/80">
                {/* Rank Badge */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 ${
            idx === 0 ? 'bg-amber-100 text-amber-600' :
            idx === 1 ? 'bg-slate-200 text-slate-600' :
            idx === 2 ? 'bg-orange-100 text-orange-600' :
            'bg-indigo-50 text-indigo-500'}`
            }>
                  {idx === 0 ? <Award size={16} /> : `${idx + 1}`}
                </div>

                {/* Name & Role */}
                <div className="flex-shrink-0 w-32">
                  <p className="text-xs font-extrabold text-slate-800">{emp.name}</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">{emp.position}</p>
                </div>

                {/* Stats */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500">
                      {emp.completedFittings} / {emp.totalFittings} بروفة مكتملة
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                emp.successRate >= 80 ? 'text-emerald-600 bg-emerald-50' :
                emp.successRate >= 50 ? 'text-indigo-600 bg-indigo-50' :
                'text-slate-500 bg-slate-100'}`
                }>
                      {emp.successRate}% نجاح
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                  className={`h-full rounded-full transition-all duration-700 ${
                  emp.successRate >= 80 ? 'bg-emerald-500' :
                  emp.successRate >= 50 ? 'bg-indigo-500' : 'bg-slate-400'}`
                  }
                  style={{ width: `${emp.successRate}%` }} />
                
                  </div>
                </div>

                {/* Completion badge */}
                <div className="flex-shrink-0 text-center">
                  <p className="text-lg font-extrabold text-indigo-600">{emp.completedFittings}</p>
                  <p className="text-[9px] font-bold text-slate-400">مكتملة</p>
                </div>
              </div>
          )}
          </div>
        }
      </div>
    </div>);

}