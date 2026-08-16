import React, { useState, useEffect } from 'react';
import {
  Search,
  Gem,
  Sparkles,
  X,
  CreditCard
} from 'lucide-react';
import { apiClient, getStorageUrl } from '@/lib/api-client';
import { BrideJourneyCard } from '@/components/BrideJourneyCard';
import { DressLifecycleCard } from '@/components/DressLifecycleCard';
import { MultiPaymentMethodInput } from '@/components/MultiPaymentMethodInput';












const mockAvatars = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=120&auto=format&fit=crop&q=80'];


export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [hoveredTaskId, setHoveredTaskId] = useState(null);

  // User Info & Role
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('atelier_current_employee') : null;
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.permissions?.includes('*');

  // Compact KPIs
  const [totalBrides, setTotalBrides] = useState(0);
  const [activeBookingsCount, setActiveBookingsCount] = useState(0);
  const [fittingsCount, setFittingsCount] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  // Brides & Dresses collections
  const [brides, setBrides] = useState([]);
  const [selectedBrideId, setSelectedBrideId] = useState(null);
  const [brideSearch, setBrideSearch] = useState('');

  const [dresses, setDresses] = useState([]);
  const [selectedDressId, setSelectedDressId] = useState(null);
  const [dressSearch, setDressSearch] = useState('');

  // Modals States for Pickup/Return in Bride Journey Card
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [selectedBrideForPickup, setSelectedBrideForPickup] = useState(null);
  const [checkedAccessories, setCheckedAccessories] = useState({});
  const [pickupPaymentAmount, setPickupPaymentAmount] = useState('0');
  const [pickupInsuranceAmount, setPickupInsuranceAmount] = useState('0');
  const [pickupPaymentMethod, setPickupPaymentMethod] = useState('cash');
  const [pickupRemainingPayments, setPickupRemainingPayments] = useState([{ amount: '0', payment_method: 'cash' }]);
  const [pickupInsurancePayments, setPickupInsurancePayments] = useState([{ amount: '5000', payment_method: 'cash' }]);
  const [recordPickupPayment, setRecordPickupPayment] = useState(true);
  const [pickupReceipt, setPickupReceipt] = useState(null);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedBrideForReturn, setSelectedBrideForReturn] = useState(null);
  const [returnCheckedAccessories, setReturnCheckedAccessories] = useState({});
  const [returnNotes, setReturnNotes] = useState('تم الإرجاع بحالة جيدة');

  useEffect(() => {
    if (isPickupModalOpen && selectedBrideForPickup) {
      const booking = selectedBrideForPickup.bookings?.[0];
      const accs = [
        ...(booking?.dress?.accessories || []),
        ...(booking?.dress2?.accessories || []),
        ...(booking?.dress3?.accessories || [])];

      const initialChecked = {};
      accs.forEach((a, i) => {
        initialChecked[`${a.name || a}_${i}`] = false;
      });
      setCheckedAccessories(initialChecked);

      const totalPaid = booking?.revenues?.reduce((sum, rev) => sum + parseFloat(rev.amount), 0) || parseFloat(booking?.deposit_amount || 0);
      const remaining = parseFloat(booking?.total_amount || 0) - totalPaid;
      const remStr = remaining > 0 ? remaining.toString() : '0';
      const insStr = (booking?.insurance_amount ?? 5000).toString();
      setPickupPaymentAmount(remStr);
      setPickupRemainingPayments([{ amount: remStr, payment_method: 'cash' }]);
      setPickupInsuranceAmount(insStr);
      setPickupInsurancePayments([{ amount: insStr, payment_method: 'cash' }]);
    }
  }, [isPickupModalOpen, selectedBrideForPickup]);

  useEffect(() => {
    if (isReturnModalOpen && selectedBrideForReturn) {
      const booking = selectedBrideForReturn.bookings?.[0];
      const accs = [
        ...(booking?.dress?.accessories || []),
        ...(booking?.dress2?.accessories || []),
        ...(booking?.dress3?.accessories || [])];

      const initialChecked = {};
      accs.forEach((a, i) => {
        initialChecked[`${a.name || a}_${i}`] = false;
      });
      setReturnCheckedAccessories(initialChecked);
      setReturnNotes('تم الإرجاع بحالة جيدة وبدون تلفيات');
    }
  }, [isReturnModalOpen, selectedBrideForReturn]);

  const fetchDashboardStats = async () => {
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('atelier_current_employee') : null;
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const isAdmin = currentUser?.role === 'admin' || currentUser?.permissions?.includes('*');

      if (isAdmin) {
        const [dbStats, execStats] = await Promise.all([
          apiClient.get('/dashboard'),
          apiClient.get('/dashboard/executive')]
        );
        setTotalBrides(dbStats.total_clients || 0);
        setFittingsCount(dbStats.today_fittings || 0);
        setMonthlyRevenue(execStats.revenue_this_month || 0);
      } else {
        const dbStats = await apiClient.get('/dashboard');
        setTotalBrides(dbStats.total_clients || 0);
        setFittingsCount(dbStats.today_fittings || 0);
        setMonthlyRevenue(0);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard stats:', e);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await apiClient.get('/tasks');
      const list = res.data || [];
      setTasks(list.map((t) => ({
        id: t.id,
        title: t.title || 'مهمة عمل',
        completed: t.status === 'completed',
        bride: t.booking?.client?.name || '-',
        assignedTo: t.assigned_to || 'غير معين',
        deadline: t.due_date ? new Date(t.due_date).toLocaleDateString('ar-EG') : '--',
        priority: t.type === 'alteration' ? 'عالي' : t.type === 'cleaning' ? 'منخفض' : 'متوسط',
        details: t.description || 'متابعة وتجهيز الفستان بالأوقات المحددة.'
      })));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBrides = async () => {
    try {
      const res = await apiClient.get('/dashboard/brides-summary');
      const list = Array.isArray(res) ? res : res.data || [];
      setBrides(list);

      const searchParams = new URLSearchParams(window.location.search);
      const targetBrideId = searchParams.get('bride_id');
      if (targetBrideId && list.some(b => b.id === Number(targetBrideId))) {
        setSelectedBrideId(Number(targetBrideId));
      } else if (list.length > 0) {
        setSelectedBrideId((prev) => prev !== null ? prev : list[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDresses = async () => {
    try {
      const res = await apiClient.get('/dashboard/dresses-summary');
      const list = Array.isArray(res) ? res : res.data || [];
      setDresses(list);
      if (list.length > 0) {
        setSelectedDressId((prev) => prev !== null ? prev : list[0].id);
      }
      const bookedCount = list.filter((d) => d.current_stage === 'booked').length;
      setActiveBookingsCount(bookedCount);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchTasks();
    fetchBrides();
    fetchDresses();

    const interval = setInterval(() => {
      fetchDashboardStats();
      fetchTasks();
      fetchBrides();
      fetchDresses();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const toggleTask = async (id) => {
    const taskToToggle = tasks.find((t) => t.id === id);
    if (!taskToToggle) return;

    const nextCompleted = !taskToToggle.completed;
    const nextStatus = nextCompleted ? 'completed' : 'in_progress';

    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: nextCompleted } : t));

    try {
      await apiClient.put(`/tasks/${id}`, {
        status: nextStatus,
        title: taskToToggle.title
      });
    } catch (e) {
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: !nextCompleted } : t));
    }
  };

  const selectedBride = brides.find((b) => b.id === selectedBrideId);
  const selectedDress = dresses.find((d) => d.id === selectedDressId);

  const filteredBrides = brides.filter((b) => {
    if (!brideSearch.trim()) return true;
    const q = brideSearch.toLowerCase().trim();
    return (b.name || '').toLowerCase().includes(q) || (b.phone || '').includes(q);
  });

  // Auto-select first matched bride when search changes
  useEffect(() => {
    if (brideSearch.trim() && filteredBrides.length > 0) {
      if (!filteredBrides.some(b => b.id === selectedBrideId)) {
        setSelectedBrideId(filteredBrides[0].id);
      }
    }
  }, [brideSearch, filteredBrides]);

  const filteredDresses = dresses.filter((d) => {
    if (!dressSearch.trim()) return true;
    const q = dressSearch.toLowerCase().trim();
    const nameMatch = (d.name || '').toLowerCase().includes(q);
    const codeMatch = (d.code || '').toString().toLowerCase().includes(q);
    const designerMatch = (typeof d.designer === 'object' ? d.designer?.name : d.designer)?.toLowerCase().includes(q);
    return nameMatch || codeMatch || designerMatch;
  });

  // Auto-select first matched dress when search changes
  useEffect(() => {
    if (dressSearch.trim() && filteredDresses.length > 0) {
      if (!filteredDresses.some(d => d.id === selectedDressId)) {
        setSelectedDressId(filteredDresses[0].id);
      }
    }
  }, [dressSearch, filteredDresses]);

  const priorityColors = {
    'عالي': 'text-rose-600 bg-rose-50 border-rose-100',
    'متوسط': 'text-amber-600 bg-amber-50 border-amber-100',
    'منخفض': 'text-slate-500 bg-slate-100 border-slate-200'
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full max-h-full overflow-y-auto bg-slate-50/50 p-6 md:p-8 space-y-6 text-right" dir="rtl">

      {/* 1. Daily Statistics Bar (Top Position) */}
      <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-black text-slate-600 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>إجمالي العرائس: <strong className="text-slate-800">{totalBrides}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>الحجوزات النشطة: <strong className="text-slate-800">{activeBookingsCount}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span>مواعيد القياس: <strong className="text-slate-800">{fittingsCount}</strong></span>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>إيرادات الشهر: <strong className="text-rose-600 font-mono">{monthlyRevenue.toLocaleString()} ج.م</strong></span>
          </div>
        )}
      </div>

      {/* 2. Daily Tasks (Moved below statistics bar) */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-5 flex flex-col shadow-sm max-h-[260px] flex-shrink-0">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div>
            <h2 className="text-xs font-black text-slate-800">مهمات العمل اليومية</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">أدر مهام فساتين صوفيا اليومية</p>
          </div>
          <div className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            {tasks.filter((t) => t.completed).length} / {tasks.length} مهام منجزة
          </div>
        </div>

        <div className="flex-grow overflow-y-auto space-y-2 pr-1 scrollbar-thin select-none">
          {tasks.map((task) => (
            <div
              key={task.id}
              onMouseEnter={() => setHoveredTaskId(task.id)}
              onMouseLeave={() => setHoveredTaskId(null)}
              className={`p-2.5 rounded-xl border transition-all duration-300 flex flex-col bg-slate-50/50 ${hoveredTaskId === task.id
                  ? 'border-indigo-200 bg-indigo-50/10 shadow-sm'
                  : 'border-slate-100 hover:border-slate-200'
                }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="w-4 h-4 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer accent-indigo-600"
                  />
                  <span className={`text-[11px] font-bold transition-all ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400">{task.deadline}</span>
                </div>
              </div>

              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${hoveredTaskId === task.id
                    ? 'max-h-32 mt-2 pt-2 border-t border-slate-100/70 opacity-100'
                    : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
              >
                <div className="grid grid-cols-2 gap-2 text-right">
                  <div>
                    <span className="text-[8px] font-extrabold text-slate-400 block">العميلة</span>
                    <span className="text-[10px] font-bold text-slate-700 block">{task.bride}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-extrabold text-slate-400 block">المسؤول</span>
                    <span className="text-[10px] font-bold text-slate-700 block">{task.assignedTo}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="py-4 text-center text-slate-300 font-bold text-xs">لا يوجد مهام عمل اليوم</div>
          )}
        </div>
      </div>

      {/* 3. Bride Journey Section (Slim Avatar Selector + Natural Height Journey Card) */}
      <div className="grid grid-cols-12 gap-4 flex-shrink-0">
        {/* Bride Avatars Selector (Horizontal on Mobile, Vertical on Desktop with scrollbar) */}
        <div className="col-span-12 sm:col-span-3 lg:col-span-2 bg-white border border-slate-150 rounded-2xl p-2.5 shadow-xs flex flex-col items-center max-h-[420px] sm:max-h-[480px]">
          <div className="w-full flex items-center justify-between mb-2 flex-shrink-0">
            <span className="text-[10px] font-black text-slate-500">العرائس ({filteredBrides.length})</span>
          </div>
          {/* Live Search Input Box */}
          <div className="w-full relative mb-2 flex-shrink-0">
            <input
              type="text"
              placeholder="اسم / هاتف العروس..."
              value={brideSearch}
              onChange={(e) => setBrideSearch(e.target.value)}
              className="w-full pr-7 pl-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 placeholder:text-slate-400"
            />
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          </div>
          <div className="w-full flex flex-row sm:flex-col overflow-x-auto sm:overflow-x-hidden sm:overflow-y-auto items-center justify-start gap-2.5 p-1 scrollbar-thin select-none flex-grow min-h-0">
            {filteredBrides.map((b, idx) => {
              const isActive = selectedBrideId === b.id;
              const avatar = b.image_path
                ? `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${b.image_path}`
                : mockAvatars[idx % mockAvatars.length];
              return (
                <div key={b.id} className="relative group flex-shrink-0">
                  <button
                    onClick={() => setSelectedBrideId(b.id)}
                    title={b.name}
                    className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all duration-200 cursor-pointer ${isActive
                        ? 'border-indigo-600 ring-4 ring-indigo-600/20 scale-110 shadow-md'
                        : 'border-slate-200 hover:border-indigo-400 hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                  >
                    <img src={avatar} alt={b.name} className="w-full h-full object-cover" />
                  </button>

                  {/* Tooltip on Hover */}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2.5 hidden sm:group-hover:flex items-center z-[100] pointer-events-none drop-shadow-md">
                    <div className="bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap">
                      {b.name}
                    </div>
                    <div className="w-2 h-2 bg-slate-900 rotate-45 -mr-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expanded Wide Bride Journey Card with natural height */}
        <div className="col-span-12 sm:col-span-9 lg:col-span-10">
          {selectedBride ? (
            <BrideJourneyCard
              key={selectedBride.id}
              bride={selectedBride}
              onStageUpdate={() => { fetchBrides(); fetchDresses(); }}
              avatar={selectedBride.image_path
                ? `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${selectedBride.image_path}`
                : mockAvatars[brides.indexOf(selectedBride) % mockAvatars.length]}
              onPickupClick={(b) => { setSelectedBrideForPickup(b); setIsPickupModalOpen(true); }}
              onReturnClick={(b) => { setSelectedBrideForReturn(b); setIsReturnModalOpen(true); }}
            />
          ) : (
            <div className="h-[200px] sm:h-[300px] border border-dashed rounded-2xl bg-white flex items-center justify-center p-6 text-slate-300 font-bold text-xs">
              حدد عروس لعرض مسار حركتها
            </div>
          )}
        </div>
      </div>

      {/* 4. Dress Journey Section (Smart Selector + Compact Lifecycle Card) */}
      <div className="space-y-2.5 flex-shrink-0">
        {/* Dress Lifecycle Stage Summary KPIs */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-2.5 flex items-center justify-between text-right">
            <div>
              <span className="text-[9px] font-extrabold text-emerald-700 block">جاهز للاستخدام ✨</span>
              <span className="text-sm sm:text-base font-black text-emerald-900 font-mono">
                {dresses.filter((d) => d.current_stage === 'ready').length}
              </span>
            </div>
            <div className="w-7 h-7 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-700 font-bold text-xs">
              👗
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-2.5 flex items-center justify-between text-right">
            <div>
              <span className="text-[9px] font-extrabold text-blue-700 block">محجوز / مؤجر 🛍️</span>
              <span className="text-sm sm:text-base font-black text-blue-900 font-mono">
                {dresses.filter((d) => d.current_stage === 'booked').length}
              </span>
            </div>
            <div className="w-7 h-7 rounded-xl bg-blue-100/80 flex items-center justify-center text-blue-700 font-bold text-xs">
              💍
            </div>
          </div>

          <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-2.5 flex items-center justify-between text-right">
            <div>
              <span className="text-[9px] font-extrabold text-purple-700 block">دراي كلين وصيانة 🧼</span>
              <span className="text-sm sm:text-base font-black text-purple-900 font-mono">
                {dresses.filter((d) => d.current_stage === 'dry_clean').length}
              </span>
            </div>
            <div className="w-7 h-7 rounded-xl bg-purple-100/80 flex items-center justify-center text-purple-700 font-bold text-xs">
              ✨
            </div>
          </div>
        </div>

        {/* Main Grid: Selector + Stage Card */}
        <div className="grid grid-cols-12 gap-3 sm:gap-4 items-start">
          {/* Dress Selector List (Compact with details) */}
          <div className="col-span-12 sm:col-span-4 lg:col-span-3 bg-white border border-slate-150 rounded-3xl p-3 shadow-xs flex flex-col max-h-[360px]">
            <div className="w-full flex items-center justify-between mb-2 flex-shrink-0">
              <span className="text-[10px] font-black text-slate-700">قائمة الفساتين ({filteredDresses.length})</span>
            </div>
            {/* Live Search Input Box */}
            <div className="w-full relative mb-2 flex-shrink-0">
              <input
                type="text"
                placeholder="بحث بالاسم أو الكود..."
                value={dressSearch}
                onChange={(e) => setDressSearch(e.target.value)}
                className="w-full pr-7 pl-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-700 placeholder:text-slate-400"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
            </div>

            {/* Scrollable Dress Cards List */}
            <div className="w-full flex flex-col gap-1.5 overflow-y-auto pr-0.5 p-0.5 scrollbar-thin select-none flex-grow min-h-0">
              {filteredDresses.length === 0 ? (
                <div className="text-[10px] text-slate-400 font-bold text-center py-4">
                  لا توجد فساتين مطابقة
                </div>
              ) : (
                filteredDresses.map((d) => {
                  const isActive = selectedDressId === d.id;
                  const imageUrl = getStorageUrl(d.image_path || d.images?.[0]?.image_path);
                  const stageBadge = {
                    'ready': { label: 'جاهز', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    'booked': { label: 'محجوز', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                    'dry_clean': { label: 'دراي كلين', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                  }[d.current_stage] || { label: '—', color: 'bg-slate-50 text-slate-500 border-slate-200' };

                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDressId(d.id)}
                      className={`w-full flex items-center gap-2 p-1.5 rounded-xl border text-right transition-all cursor-pointer ${
                        isActive
                          ? 'bg-violet-50/90 border-violet-500 shadow-2xs ring-1 ring-violet-500/30'
                          : 'bg-white border-slate-150 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-8 h-10 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-50">
                        {imageUrl ? (
                          <img src={imageUrl} alt={d.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Sparkles size={11} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9.5px] font-black text-slate-800 truncate block leading-tight">{d.name}</span>
                        {d.code && (
                          <span className="text-[7.5px] font-mono text-slate-400 font-bold block mt-0.5">#{d.code}</span>
                        )}
                      </div>
                      <span className={`text-[7px] font-extrabold px-1.5 py-0.2 rounded border ${stageBadge.color} flex-shrink-0`}>
                        {stageBadge.label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Expanded Wide Dress Lifecycle Card */}
          <div className="col-span-12 sm:col-span-8 lg:col-span-9">
            {selectedDress ? (
              <DressLifecycleCard
                key={selectedDress.id}
                dress={selectedDress}
                onStageUpdate={() => { fetchDresses(); fetchBrides(); }}
              />
            ) : (
              <div className="h-[200px] border border-dashed rounded-3xl bg-white flex items-center justify-center p-6 text-slate-300 font-bold text-xs">
                حدد فستان لعرض حالته ومسار حركته
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pickup stage Confirmation Modal */}
      {isPickupModalOpen && selectedBrideForPickup && (() => {
        const booking = selectedBrideForPickup.bookings?.[0];
        const dress = booking?.dress;
        const dress2 = booking?.dress2;
        const dress3 = booking?.dress3;

        const accessoriesList = [
          ...(dress?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress.name })),
          ...(dress2?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress2.name })),
          ...(dress3?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress3.name }))];


        const totalPaid = booking?.revenues?.reduce((sum, rev) => sum + parseFloat(rev.amount), 0) || parseFloat(booking?.deposit_amount || 0);
        const remaining = parseFloat(booking?.total_amount || 0) - totalPaid;

        const handlePickupConfirm = async (e) => {
          e.preventDefault();
          try {
            const validBal = recordPickupPayment ? pickupRemainingPayments.filter(p => parseFloat(p.amount) > 0) : [];
            const validIns = pickupInsurancePayments.filter(p => parseFloat(p.amount) > 0);
            const totalIns = validIns.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

            // Send to stage-action PUT which handles recording revenues and marking picked_up
            await apiClient.put(`/clients/${selectedBrideForPickup.id}/stage-action`, {
              action: 'mark_picked_up',
              insurance_amount: totalIns,
              balance_payments: validBal,
              insurance_payments: validIns,
              receipt_image: pickupReceipt
            });

            setIsPickupModalOpen(false);
            setSelectedBrideForPickup(null);
            setPickupReceipt(null);
            fetchBrides();
          } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء حفظ البيانات');
          }
        };

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg border border-slate-100 shadow-xl overflow-hidden flex flex-col max-h-[min(90vh,640px)] sm:max-h-[min(88vh,700px)] my-auto">
              <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h3 className="text-sm font-extrabold text-slate-800">تسليم الفستان للعروس</h3>
                <button onClick={() => { setIsPickupModalOpen(false); setSelectedBrideForPickup(null); }} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePickupConfirm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 min-h-0 text-right scrollbar-thin">
                  {/* Client and Dress info */}
                  <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-3 space-y-1">
                    <h4 className="text-xs font-black text-indigo-700">بيانات العروس والفستان</h4>
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-700 mt-1">
                      <div>العروس: <span className="font-extrabold">{selectedBrideForPickup.name}</span></div>
                      <div>الهاتف: <span className="font-mono">{selectedBrideForPickup.phone}</span></div>
                      <div className="col-span-2 border-t border-slate-150 pt-1.5 mt-0.5 space-y-0.5">
                        <div>الفستان 1: <span className="font-extrabold">{dress?.name || '—'} (مقاس: {dress?.size || '—'})</span></div>
                        {dress2 && <div>الفستان 2: <span className="font-extrabold text-purple-700">{dress2?.name || '—'} (مقاس: {dress2?.size || '—'})</span></div>}
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 space-y-1.5">
                    <h4 className="text-xs font-black text-slate-700">ملخص الحساب المالي للفستان</h4>
                    <div className="grid grid-cols-3 gap-2 text-[9px] font-extrabold text-slate-500">
                      <div className="bg-white p-1.5 rounded-lg border border-slate-100 text-center">
                        <div className="text-slate-400 mb-0.5">الإجمالي</div>
                        <div className="text-slate-800 font-black text-xs">{parseFloat(booking?.total_amount || 0).toLocaleString()} ج.م</div>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-100 text-center">
                        <div className="text-slate-400 mb-0.5">المدفوع سابقاً</div>
                        <div className="text-emerald-600 font-black text-xs">{totalPaid.toLocaleString()} ج.م</div>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-100 text-center">
                        <div className="text-slate-400 mb-0.5">المتبقي</div>
                        <div className="text-rose-600 font-black text-xs">{remaining.toLocaleString()} ج.م</div>
                      </div>
                    </div>

                    {/* Payment Inputs */}
                    {remaining > 0 && (
                      <div className="pt-1.5 space-y-1.5 border-t border-slate-150">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={recordPickupPayment}
                            onChange={(e) => setRecordPickupPayment(e.target.checked)}
                            className="w-3.5 h-3.5 text-indigo-650 border-slate-350 rounded-sm"
                          />
                          <span className="text-[10px] font-bold text-slate-700">تسجيل سداد المبلغ المتبقي الآن</span>
                        </label>
                        {recordPickupPayment && (
                          <MultiPaymentMethodInput
                            payments={pickupRemainingPayments}
                            onChange={(updated) => {
                              setPickupRemainingPayments(updated);
                              const total = updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                              setPickupPaymentAmount(total.toString());
                            }}
                            totalExpected={remaining}
                            label="طرق ومبالغ سداد المتبقي"
                          />
                        )}
                      </div>
                    )}

                    {/* Insurance Input */}
                    <div className="pt-2 border-t border-slate-150">
                      <MultiPaymentMethodInput
                        payments={pickupInsurancePayments}
                        onChange={(updated) => {
                          setPickupInsurancePayments(updated);
                          const total = updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                          setPickupInsuranceAmount(total.toString());
                        }}
                        totalExpected={parseFloat(pickupInsuranceAmount) || null}
                        label="طرق ومبلغ التأمين المستلم (تأمين مسترد)"
                      />
                      <p className="text-[8.5px] text-slate-400 font-bold mt-1 text-right">
                        * هذا المبلغ تأمين مسترد يتم إرجاعه للعميلة عند إرجاع الفستان سليم.
                      </p>
                    </div>
                  </div>

                  {/* Accessories Checklist */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-black text-slate-700">قائمة إكسسوارات الفستان (تأكيد التسليم للعروس)</h4>
                    {accessoriesList.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {accessoriesList.map((acc, idx) => {
                          const key = `${acc.name}_${idx}`;
                          return (
                            <label key={idx} className="flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-all border border-slate-100">
                              <input
                                type="checkbox"
                                checked={!!checkedAccessories[key]}
                                onChange={(e) => setCheckedAccessories({ ...checkedAccessories, [key]: e.target.checked })}
                                className="w-3.5 h-3.5 text-indigo-650 border-slate-250 rounded-sm focus:ring-indigo-500"
                              />
                              <span className="text-[10px] font-bold text-slate-700">
                                {acc.name} <span className="text-slate-400 font-normal">({acc.dressName})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-slate-400 text-xs font-bold bg-slate-50 border border-slate-100 rounded-2xl">
                        لا يوجد إكسسوارات مسجلة لهذا الفستان في النظام.
                      </div>
                    )}
                  </div>
                </div>

                {/* Fixed Footer */}
                <div className="flex items-center gap-2.5 p-3 sm:p-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                  <button type="submit" className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 text-center">
                    تأكيد تسليم الفستان والملحقات
                  </button>
                  <button type="button" onClick={() => { setIsPickupModalOpen(false); setSelectedBrideForPickup(null); }} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Return stage Confirmation Modal */}
      {isReturnModalOpen && selectedBrideForReturn && (() => {
        const booking = selectedBrideForReturn.bookings?.[0];
        const dress = booking?.dress;
        const dress2 = booking?.dress2;
        const dress3 = booking?.dress3;

        const accessoriesList = [
          ...(dress?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress.name })),
          ...(dress2?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress2.name })),
          ...(dress3?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress3.name }))
        ];

        const handleReturnConfirm = async (e) => {
          e.preventDefault();
          try {
            // Update booking notes with condition
            if (booking) {
              await apiClient.put(`/bookings/${booking.id}`, {
                client_id: booking.client_id,
                dress_id: booking.dress_id,
                dress_2_id: booking.dress_2_id,
                dress_3_id: booking.dress_3_id,
                booking_date: booking.booking_date,
                event_date: booking.event_date,
                status: 'returned',
                total_amount: booking.total_amount,
                deposit_amount: booking.deposit_amount,
                insurance_amount: booking.insurance_amount,
                notes: (booking.notes ? booking.notes + ' | ' : '') + `[إرجاع: ${returnNotes}]`
              });
            }

            // Call stage-action PUT
            await apiClient.put(`/clients/${selectedBrideForReturn.id}/stage-action`, { action: 'mark_returned' });

            setIsReturnModalOpen(false);
            setSelectedBrideForReturn(null);
            fetchBrides();
          } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء حفظ البيانات');
          }
        };

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg border border-slate-100 shadow-xl overflow-hidden flex flex-col max-h-[min(90vh,640px)] sm:max-h-[min(88vh,700px)] my-auto">
              <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h3 className="text-sm font-extrabold text-slate-800">تسجيل استلام وإرجاع الفستان</h3>
                <button onClick={() => { setIsReturnModalOpen(false); setSelectedBrideForReturn(null); }} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleReturnConfirm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 min-h-0 text-right scrollbar-thin">
                  {/* Client and Dress info */}
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-3 space-y-1">
                    <h4 className="text-xs font-black text-emerald-700">بيانات العروس والفستان المرتجع</h4>
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-700 mt-1">
                      <div>العروس: <span className="font-extrabold">{selectedBrideForReturn.name}</span></div>
                      <div>الهاتف: <span className="font-mono">{selectedBrideForReturn.phone}</span></div>
                      <div className="col-span-2 border-t border-slate-150 pt-1.5 mt-0.5 space-y-0.5">
                        <div>الفستان 1: <span className="font-extrabold">{dress?.name || '—'} (مقاس: {dress?.size || '—'})</span></div>
                        {dress2 && <div>الفستان 2: <span className="font-extrabold text-purple-700">{dress2?.name || '—'} (مقاس: {dress2?.size || '—'})</span></div>}
                      </div>
                    </div>
                  </div>

                  {/* Return Checklist */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-black text-rose-650 flex items-center gap-1.5">
                      <span>⚠️ يرجى جرد قائمة الملحقات والتأكد من استلامها كاملة:</span>
                    </h4>
                    {accessoriesList.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {accessoriesList.map((acc, idx) => {
                          const key = `${acc.name}_${idx}`;
                          return (
                            <label key={idx} className="flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-all border border-slate-100">
                              <input
                                type="checkbox"
                                checked={!!returnCheckedAccessories[key]}
                                onChange={(e) => setReturnCheckedAccessories({ ...returnCheckedAccessories, [key]: e.target.checked })}
                                className="w-3.5 h-3.5 text-indigo-650 border-slate-250 rounded-sm focus:ring-indigo-500"
                              />
                              <span className="text-[10px] font-bold text-slate-700">
                                {acc.name} <span className="text-slate-400 font-normal">({acc.dressName})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-slate-400 text-xs font-bold bg-slate-50 border border-slate-100 rounded-2xl">
                        لا يوجد إكسسوارات مسجلة لهذا الفستان في النظام.
                      </div>
                    )}
                  </div>

                  {/* Return Condition Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-655 block">حالة الفستان والملاحظات عند الاستلام</label>
                    <textarea
                      required
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="مثال: تم الإرجاع سليم وبحالة جيدة للغسيل..."
                      className="w-full h-12 min-h-[44px] p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    />
                  </div>
                </div>

                {/* Fixed Footer */}
                <div className="flex items-center gap-2.5 p-3 sm:p-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                  <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 text-center">
                    تأكيد إرجاع الفستان وحفظ الملحقات
                  </button>
                  <button type="button" onClick={() => { setIsReturnModalOpen(false); setSelectedBrideForReturn(null); }} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>);

}