import React, { useState } from 'react';
import { Users, Sparkles, Heart, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { SalesEmployeesReport } from '@/components/reports/SalesEmployeesReport';
import { DressesReport } from '@/components/reports/DressesReport';
import { BridesLifecycleReport } from '@/components/reports/BridesLifecycleReport';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'dresses' | 'brides'
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    {
      id: 'sales',
      label: 'موظفي المبيعات والعمليات',
      description: 'أداء الفريق في مراحل الزيارة والحجز والبروفات والاستلام والترجيع',
      icon: Users,
      badge: 'مبيعات'
    },
    {
      id: 'dresses',
      label: 'تقارير الفساتين',
      description: 'الأعلى والراكد وإيرادات وتكرار كل فستان في الأتيليه',
      icon: Sparkles,
      badge: 'الفساتين'
    },
    {
      id: 'brides',
      label: 'تقارير العرائس',
      description: 'تتبع المراحل من الزيارة الأولية حتى الاسترداد ومصادر الإعلانات',
      icon: Heart,
      badge: 'العرائس'
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in text-right font-sans" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                مركز التقارير والتحليلات الشاملة
                <span className="px-2.5 py-0.5 text-xs font-black bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                  لوحة تحكم إدارية
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-bold mt-1">
                تقارير دورية متخصصة لمتابعة المبيعات، الفساتين، ودورة حياة العرائس
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all active:scale-95"
            title="تحديث البيانات"
          >
            <RefreshCw size={14} className="text-slate-400" />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-right p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                isActive
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-transparent shadow-xl shadow-indigo-600/25 ring-2 ring-indigo-600/20'
                  : 'bg-white text-slate-700 border-slate-100 hover:border-indigo-100 hover:bg-slate-50/70 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                  }`}
                >
                  <Icon size={18} />
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.badge}
                </span>
              </div>
              <h3 className={`text-sm font-black mb-1 ${isActive ? 'text-white' : 'text-slate-800'}`}>
                {tab.label}
              </h3>
              <p className={`text-[11px] leading-relaxed line-clamp-2 ${isActive ? 'text-indigo-100 font-medium' : 'text-slate-400 font-bold'}`}>
                {tab.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content - Completely separated components */}
      <div key={`${activeTab}-${refreshKey}`} className="transition-all duration-300">
        {activeTab === 'sales' && <SalesEmployeesReport />}
        {activeTab === 'dresses' && <DressesReport />}
        {activeTab === 'brides' && <BridesLifecycleReport />}
      </div>
    </div>
  );
}