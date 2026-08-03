import React, { useState, useEffect } from 'react';
import {




  Search,
  Gem,

  X,
  CreditCard
} from
  'lucide-react';
import { apiClient, getStorageUrl } from '@/lib/api-client';
import { BrideJourneyCard } from '@/components/BrideJourneyCard';
import { DressLifecycleCard } from '@/components/DressLifecycleCard';












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
      setPickupPaymentAmount(remaining > 0 ? remaining.toString() : '0');
      setPickupInsuranceAmount(booking?.insurance_amount?.toString() || '0');
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
        <div key="stat-brides" className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>إجمالي العرائس: <strong className="text-slate-800">{totalBrides}</strong></span>
        </div>
        <div key="stat-bookings" className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>الحجوزات النشطة: <strong className="text-slate-800">{activeBookingsCount}</strong></span>
        </div>
        <div key="stat-fittings" className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span>مواعيد القياس: <strong className="text-slate-800">{fittingsCount}</strong></span>
        </div>
        {isAdmin && (
          <div key="stat-revenue" className="flex items-center gap-2">
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

      {/* 4. Dress Journey Section (Slim Cubes Selector + Scrollbar + Natural Height Dress Card) */}
      <div className="grid grid-cols-12 gap-4 flex-shrink-0">
        {/* Dress Cubes Selector (Horizontal on Mobile, Vertical on Desktop with scrollbar) */}
        <div className="col-span-12 sm:col-span-3 lg:col-span-2 bg-white border border-slate-150 rounded-2xl p-2.5 shadow-xs flex flex-col items-center max-h-[420px] sm:max-h-[480px]">
          <div className="w-full flex items-center justify-between mb-2 flex-shrink-0">
            <span className="text-[10px] font-black text-slate-500">الفساتين ({filteredDresses.length})</span>
          </div>
          {/* Live Search Input Box */}
          <div className="w-full relative mb-2 flex-shrink-0">
            <input
              type="text"
              placeholder="اسم / كود الفستان..."
              value={dressSearch}
              onChange={(e) => setDressSearch(e.target.value)}
              className="w-full pr-7 pl-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-700 placeholder:text-slate-400"
            />
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          </div>
          <div className="w-full flex flex-row sm:flex-col overflow-x-auto sm:overflow-x-hidden sm:overflow-y-auto items-center justify-start gap-2.5 p-1 scrollbar-thin select-none flex-grow min-h-0">
            {filteredDresses.map((d) => {
              const isActive = selectedDressId === d.id;
              const imageUrl = getStorageUrl(d.image_path || d.images?.[0]?.image_path);
              const stageColors = {
                'ready': 'border-emerald-500 bg-emerald-50',
                'booked': 'border-blue-500 bg-blue-50',
                'dry_clean': 'border-purple-500 bg-purple-50',
              };
              const stageClass = stageColors[d.current_stage] || 'border-slate-200 bg-slate-50';

              return (
                <div key={d.id} className="relative group flex-shrink-0">
                  {/* Rounded Square Cube */}
                  <button
                    onClick={() => setSelectedDressId(d.id)}
                    title={d.name}
                    className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${isActive
                        ? 'border-violet-600 ring-4 ring-violet-600/20 scale-110 shadow-md'
                        : `${stageClass} hover:scale-105 opacity-85 hover:opacity-100`
                      }`}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt={d.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                        <Gem size={14} />
                      </div>
                    )}
                  </button>

                  {/* Tooltip on Hover */}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2.5 hidden sm:group-hover:flex items-center z-[100] pointer-events-none drop-shadow-md">
                    <div className="bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap flex items-center gap-1.5">
                      <span>{d.name}</span>
                      <span className="text-[9px] opacity-75">({d.current_stage === 'ready' ? 'جاهز' : d.current_stage === 'booked' ? 'محجوز' : 'دراي كلين'})</span>
                    </div>
                    <div className="w-2 h-2 bg-slate-900 rotate-45 -mr-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expanded Wide Dress Lifecycle Card with natural height */}
        <div className="col-span-12 sm:col-span-9 lg:col-span-10">
          {selectedDress ? (
            <DressLifecycleCard
              dress={selectedDress}
              onStageUpdate={() => { fetchDresses(); fetchBrides(); }}
            />
          ) : (
            <div className="h-[300px] border border-dashed rounded-2xl bg-white flex items-center justify-center p-6 text-slate-300 font-bold text-xs">
              حدد فستان لعرض حالته
            </div>
          )}
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
            // 1. Record Pickup Payment
            if (recordPickupPayment && parseFloat(pickupPaymentAmount) > 0 && booking) {
              await apiClient.post('/revenues', {
                booking_id: booking.id,
                type: 'balance',
                amount: parseFloat(pickupPaymentAmount),
                payment_method: pickupPaymentMethod,
                payment_date: new Date().toISOString().split('T')[0],
                notes: 'دفعة استلام الفستان النهائية',
                receipt_image: pickupReceipt
              });
            }

            // 2. Record Insurance Deposit (if entered)
            if (parseFloat(pickupInsuranceAmount) > 0 && booking) {
              await apiClient.post('/revenues', {
                booking_id: booking.id,
                type: 'other',
                amount: parseFloat(pickupInsuranceAmount),
                payment_method: pickupPaymentMethod,
                payment_date: new Date().toISOString().split('T')[0],
                notes: 'تأمين الفستان المسترد',
                receipt_image: pickupReceipt
              });
            }

            // 3. Mark stage picked_up
            await apiClient.put(`/clients/${selectedBrideForPickup.id}/stage-action`, {
              action: 'mark_picked_up',
              insurance_amount: parseFloat(pickupInsuranceAmount)
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
            <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h3 className="text-sm font-extrabold text-slate-800">تسليم الفستان للعروس</h3>
                <button onClick={() => { setIsPickupModalOpen(false); setSelectedBrideForPickup(null); }} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePickupConfirm} className="flex flex-col flex-grow min-h-0 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
                  {/* Client and Dress info */}
                  <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 space-y-1">
                    <h4 className="text-xs font-black text-indigo-700">بيانات العروس والفستان</h4>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-700 mt-2">
                      <div>العروس: <span className="font-extrabold">{selectedBrideForPickup.name}</span></div>
                      <div>الهاتف: <span className="font-mono">{selectedBrideForPickup.phone}</span></div>
                      <div className="col-span-2 border-t border-slate-150 pt-2 mt-1">
                        الفستان الأساسي: <span className="font-extrabold">{dress?.name || '—'} (مقاس: {dress?.size || '—'})</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-black text-slate-700">ملخص الحساب المالي للفستان</h4>
                    <div className="grid grid-cols-3 gap-2 text-[9px] font-extrabold text-slate-500">
                      <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                        <div className="text-slate-400 mb-0.5">الإجمالي</div>
                        <div className="text-slate-800 font-black text-xs">{parseFloat(booking?.total_amount || 0).toLocaleString()} ج.م</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                        <div className="text-slate-400 mb-0.5">المدفوع سابقاً</div>
                        <div className="text-emerald-600 font-black text-xs">{totalPaid.toLocaleString()} ج.م</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                        <div className="text-slate-400 mb-0.5">المتبقي</div>
                        <div className="text-rose-600 font-black text-xs">{remaining.toLocaleString()} ج.م</div>
                      </div>
                    </div>

                    {/* Payment Inputs */}
                    {remaining > 0 &&
                      <div className="pt-2 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={recordPickupPayment}
                            onChange={(e) => setRecordPickupPayment(e.target.checked)}
                            className="w-3.5 h-3.5 text-indigo-650 border-slate-350 rounded-sm" />

                          <span className="text-[10px] font-bold text-slate-700">تسجيل سداد المبلغ المتبقي الآن</span>
                        </label>
                        {recordPickupPayment &&
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-extrabold text-slate-500">مبلغ السداد</label>
                              <input
                                type="number"
                                value={pickupPaymentAmount}
                                onChange={(e) => setPickupPaymentAmount(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 mt-0.5" />

                            </div>
                            <div>
                              <label className="text-[9px] font-extrabold text-slate-500">طريقة الدفع</label>
                              <select
                                value={pickupPaymentMethod}
                                onChange={(e) => setPickupPaymentMethod(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 mt-0.5">

                                <option value="cash">نقداً (Cash)</option>
                                <option value="card">فيزا / كارت (Card)</option>
                                <option value="instapay">إنستا باي (InstaPay)</option>
                              </select>
                            </div>
                          </div>
                        }
                      </div>
                    }

                    {/* Insurance Input */}
                    <div className="pt-1 border-t border-slate-150 mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-extrabold text-slate-500">مبلغ التأمين المستلم</label>
                        <input
                          type="number"
                          value={pickupInsuranceAmount}
                          onChange={(e) => setPickupInsuranceAmount(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 mt-0.5" />

                      </div>
                      <div className="flex items-end text-[8px] text-slate-400 font-bold pb-2 leading-tight">
                        * هذا المبلغ تأمين مسترد يتم إرجاعه للعميلة عند إرجاع الفستان سليم.
                      </div>
                    </div>
                    {/* Upload Receipt */}
                    <div className="pt-2 border-t border-slate-150 mt-2 space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-500 block text-right">إرفاق إيصال الدفع (اختياري)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setPickupReceipt(reader.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                          id="dashboard-pickup-receipt-file-input" />

                        <label
                          htmlFor="dashboard-pickup-receipt-file-input"
                          className="flex-grow px-3 py-1.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-indigo-650 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-center gap-1 transition-all">

                          <CreditCard size={12} className="inline mr-1" />
                          <span>{pickupReceipt ? 'تغيير الإيصال المرفق' : 'رفع إيصال'}</span>
                        </label>
                        {pickupReceipt &&
                          <button
                            type="button"
                            onClick={() => setPickupReceipt(null)}
                            className="p-1.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-xl hover:bg-rose-100/60 transition-all cursor-pointer text-xs">

                            <X size={12} />
                          </button>
                        }
                      </div>
                      {pickupReceipt &&
                        <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[80px] flex items-center justify-center bg-slate-50 mt-1">
                          <img src={pickupReceipt} alt="معاينة الإيصال" className="w-full h-full object-contain max-h-[75px]" />
                        </div>
                      }
                    </div>
                  </div>

                  {/* Accessories Checklist */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-700">قائمة إكسسوارات الفستان (تأكيد التسليم للعروس)</h4>
                    {accessoriesList.length > 0 ?
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {accessoriesList.map((acc, idx) => {
                          const key = `${acc.name}_${idx}`;
                          return (
                            <label key={idx} className="flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-all border border-slate-100">
                              <input
                                type="checkbox"
                                checked={!!checkedAccessories[key]}
                                onChange={(e) => setCheckedAccessories({ ...checkedAccessories, [key]: e.target.checked })}
                                className="w-3.5 h-3.5 text-indigo-650 border-slate-250 rounded-sm focus:ring-indigo-500" />

                              <span className="text-[10px] font-bold text-slate-700">
                                {acc.name} <span className="text-slate-400 font-normal">({acc.dressName})</span>
                              </span>
                            </label>);

                        })}
                      </div> :

                      <div className="text-center py-4 text-slate-400 text-xs font-bold bg-slate-50 border border-slate-100 rounded-2xl">
                        لا يوجد إكسسوارات مسجلة لهذا الفستان في النظام.
                      </div>
                    }
                  </div>
                </div>

                {/* Fixed Footer */}
                <div className="flex items-center gap-3 p-5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                  <button type="submit" className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95">
                    تأكيد تسليم الفستان والملحقات
                  </button>
                  <button type="button" onClick={() => { setIsPickupModalOpen(false); setSelectedBrideForPickup(null); }} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>);

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
          ...(dress3?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress3.name }))];


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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
            <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h3 className="text-sm font-extrabold text-slate-800">تسجيل استلام وإرجاع الفستان</h3>
                <button onClick={() => { setIsReturnModalOpen(false); setSelectedBrideForReturn(null); }} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleReturnConfirm} className="flex flex-col flex-grow min-h-0 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
                  {/* Client and Dress info */}
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 space-y-1">
                    <h4 className="text-xs font-black text-emerald-700">بيانات العروس والفستان المرتجع</h4>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-700 mt-2">
                      <div>العروس: <span className="font-extrabold">{selectedBrideForReturn.name}</span></div>
                      <div>الهاتف: <span className="font-mono">{selectedBrideForReturn.phone}</span></div>
                      <div className="col-span-2 border-t border-slate-150 pt-2 mt-1">
                        الفستان الأساسي: <span className="font-extrabold">{dress?.name || '—'} (مقاس: {dress?.size || '—'})</span>
                      </div>
                    </div>
                  </div>

                  {/* Return Checklist */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-rose-650 flex items-center gap-1.5">
                      <span>⚠️ يرجى جرد قائمة الملحقات والتأكد من استلامها كاملة:</span>
                    </h4>
                    {accessoriesList.length > 0 ?
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {accessoriesList.map((acc, idx) => {
                          const key = `${acc.name}_${idx}`;
                          return (
                            <label key={idx} className="flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-all border border-slate-100">
                              <input
                                type="checkbox"
                                checked={!!returnCheckedAccessories[key]}
                                onChange={(e) => setReturnCheckedAccessories({ ...returnCheckedAccessories, [key]: e.target.checked })}
                                className="w-3.5 h-3.5 text-indigo-650 border-slate-250 rounded-sm focus:ring-indigo-500" />

                              <span className="text-[10px] font-bold text-slate-700">
                                {acc.name} <span className="text-slate-400 font-normal">({acc.dressName})</span>
                              </span>
                            </label>);

                        })}
                      </div> :

                      <div className="text-center py-4 text-slate-400 text-xs font-bold bg-slate-50 border border-slate-100 rounded-2xl">
                        لا يوجد إكسسوارات مسجلة لهذا الفستان في النظام.
                      </div>
                    }
                  </div>

                  {/* Return Condition Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-655 block">حالة الفستان والملاحظات عند الاستلام</label>
                    <textarea
                      required
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="مثال: تم الإرجاع سليم وبحالة جيدة للغسيل..."
                      className="w-full min-h-[60px] p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />

                  </div>
                </div>

                {/* Fixed Footer */}
                <div className="flex items-center gap-3 p-5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                  <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95">
                    تأكيد إرجاع الفستان وحفظ الملحقات
                  </button>
                  <button type="button" onClick={() => { setIsReturnModalOpen(false); setSelectedBrideForReturn(null); }} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>);

      })()}
    </div>);

}