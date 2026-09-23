import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Users, Calendar, LayoutGrid } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import BridesTab from '@/components/dashboard-home/BridesTab';
import DressesTab from '@/components/dashboard-home/DressesTab';
import CalendarTab from '@/components/dashboard-home/CalendarTab';
import { BrideJourneyPopup } from '@/components/bride-journey/BrideJourneyPopup';

const STAGES = [
  { id: 'all', label: 'كافة المراحل', dotColor: null },
  { id: 'visit', label: 'زيارة', dotColor: 'bg-amber-400' },
  { id: 'booking', label: 'حجز', dotColor: 'bg-emerald-500' },
  { id: 'fitting', label: 'بروفة', dotColor: 'bg-violet-500' },
  { id: 'picked_up', label: 'استلام', dotColor: 'bg-blue-500' },
  { id: 'returned', label: 'مرتجع', dotColor: 'bg-rose-500' },
];

const STAGE_MAP = {
  visit: { label: 'زيارة أولى', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  booking: { label: 'حجز مؤكد', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  fitting: { label: 'بروفة قياس', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200', dotColor: 'bg-violet-500' },
  picked_up: { label: 'تم الاستلام', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', dotColor: 'bg-blue-500' },
  returned: { label: 'تم الإرجاع', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', dotColor: 'bg-slate-400' },
};

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab from URL or state: 'brides' | 'dresses' | 'calendar'
  const currentTabParam = searchParams.get('tab') || 'brides';
  const [activeTab, setActiveTab] = useState(currentTabParam);

  // Sync state with URL parameter
  useEffect(() => {
    if (currentTabParam && ['brides', 'dresses', 'calendar'].includes(currentTabParam)) {
      setActiveTab(currentTabParam);
    }
  }, [currentTabParam]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tabId);
    setSearchParams(nextParams);
  };

  // Data Collections
  const [brides, setBrides] = useState([]);
  const [dresses, setDresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Brides Tab State
  const [stageFilter, setStageFilter] = useState(searchParams.get('stage') || 'all');
  const [brideSearch, setBrideSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [dateBasis, setDateBasis] = useState('all');

  // Dresses Tab State
  const [selectedDressId, setSelectedDressId] = useState(null);
  const [dressSearch, setDressSearch] = useState('');

  // Calendar Tab State
  const [calDate, setCalDate] = useState(new Date());

  // Active Bride Modal (Full Info in current stage)
  const [activeBrideForModal, setActiveBrideForModal] = useState(null);

  const fetchBrides = async () => {
    try {
      const res = await apiClient.get('/clients?per_page=1000');
      const list = Array.isArray(res) ? res : res.data || [];
      const mapped = list.map((c) => ({
        ...c,
        current_stage: c.current_stage || c.stage || 'visit',
        wedding_date: (c.wedding_date || c.bookings?.[0]?.event_date) ? String(c.wedding_date || c.bookings?.[0]?.event_date).substring(0, 10) : '',
        latest_visit_date: (c.latest_visit_date || c.visits?.[0]?.visit_date) ? String(c.latest_visit_date || c.visits?.[0]?.visit_date).substring(0, 10) : '',
        latest_dress_name: c.latest_dress_name || c.bookings?.[0]?.dress?.name || '',
        pickup_scheduled_on: c.bookings?.[0]?.pickup_scheduled_on || c.pickup_scheduled_on || '',
        return_scheduled_on: c.bookings?.[0]?.return_scheduled_on || c.return_scheduled_on || '',
      }));
      setBrides(mapped);

      // Check if URL has bride_id query parameter
      const targetBrideId = searchParams.get('bride_id');
      if (targetBrideId) {
        const found = mapped.find(b => b.id === Number(targetBrideId));
        if (found) setActiveBrideForModal(found);
      }
      return mapped;
    } catch (e) {
      console.error('Failed to load brides in dashboard:', e);
      return [];
    }
  };

  const fetchDresses = async () => {
    try {
      const res = await apiClient.get('/dresses?per_page=1000');
      const list = Array.isArray(res) ? res : res.data || [];
      setDresses(list);
      if (list.length > 0 && !selectedDressId) {
        setSelectedDressId(list[0].id);
      }
      return list;
    } catch (e) {
      console.error('Failed to load dresses in dashboard:', e);
      return [];
    }
  };

  const refreshAllData = async () => {
    const [freshBrides] = await Promise.all([fetchBrides(), fetchDresses()]);
    return freshBrides;
  };

  useEffect(() => {
    setLoading(true);
    refreshAllData().finally(() => setLoading(false));
  }, []);

  const openBrideModal = (bride) => {
    setActiveBrideForModal(bride);
  };

  const closeBrideModal = () => {
    setActiveBrideForModal(null);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 text-right animate-fade-in" dir="rtl">
      
      {/* Brand & Concept Header (Aligining with design-prototype.html) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
            <span>صوفيا أتيليه</span>
            <span className="text-amber-500 text-sm">✦</span>
          </h1>
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            Sophia Atelier Dashboard
          </span>
        </div>

        {/* 3 Main Luxury Tabs (Concept v3) */}
        <div className="inline-flex p-1 bg-slate-100/90 border border-slate-200/80 rounded-2xl shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleTabChange('brides')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'brides'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Users size={15} className={activeTab === 'brides' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>العرائس</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
              activeTab === 'brides' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/60 text-slate-600'
            }`}>
              {brides.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('dresses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'dresses'
                ? 'bg-white text-rose-700 shadow-sm border border-slate-200/50 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <LayoutGrid size={15} className={activeTab === 'dresses' ? 'text-rose-600' : 'text-slate-400'} />
            <span>الفساتين</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
              activeTab === 'dresses' ? 'bg-rose-50 text-rose-700' : 'bg-slate-200/60 text-slate-600'
            }`}>
              {dresses.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-white text-violet-700 shadow-sm border border-slate-200/50 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Calendar size={15} className={activeTab === 'calendar' ? 'text-violet-600' : 'text-slate-400'} />
            <span>التقويم</span>
          </button>
        </div>
      </div>

      {/* Main Views Container */}
      <div className="min-h-[500px]">
        {/* VIEW 1: BRIDES TAB */}
        {activeTab === 'brides' && (
          <BridesTab
            brides={brides}
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
            brideSearch={brideSearch}
            setBrideSearch={setBrideSearch}
            monthFilter={monthFilter}
            setMonthFilter={setMonthFilter}
            dateBasis={dateBasis}
            setDateBasis={setDateBasis}
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            openBrideModal={openBrideModal}
            STAGES={STAGES}
            STAGE_MAP={STAGE_MAP}
          />
        )}

        {/* VIEW 2: DRESSES TAB */}
        {activeTab === 'dresses' && (
          <DressesTab
            dresses={dresses}
            selectedDressId={selectedDressId}
            setSelectedDressId={setSelectedDressId}
            dressSearch={dressSearch}
            setDressSearch={setDressSearch}
            brides={brides}
            openBrideModal={openBrideModal}
          />
        )}

        {/* VIEW 3: CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <CalendarTab
            calDate={calDate}
            setCalDate={setCalDate}
            brides={brides}
            dresses={dresses}
            openBrideModal={openBrideModal}
          />
        )}
      </div>

      {/* Full Bride Journey & Current Stage Details Modal */}
      {activeBrideForModal && (
        <BrideJourneyPopup
          bride={activeBrideForModal}
          onClose={closeBrideModal}
          onUpdate={async (freshBride) => {
            if (freshBride && freshBride.id === activeBrideForModal.id) {
              setActiveBrideForModal(freshBride);
            }
            const freshBrides = await refreshAllData();
            if (activeBrideForModal && Array.isArray(freshBrides)) {
              const updated = freshBrides.find(b => b.id === activeBrideForModal.id);
              if (updated) {
                setActiveBrideForModal(updated);
              }
            }
          }}
        />
      )}

    </div>
  );
}