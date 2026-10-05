import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { apiClient, getStorageUrl } from '@/lib/api-client';
import { cleanDate, todayStr } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { UnifiedStageModal } from '@/components/bride-journey/UnifiedStageModal';
import { ReturnDressModal } from '@/components/bride-journey/ReturnDressModal';
import { CancelBookingModal } from '@/components/bride-journey/CancelBookingModal';
import { BrideJourneyPopup } from '@/components/bride-journey/BrideJourneyPopup';
import { getVisitDresses } from '@/components/bride-journey/visitStatus';
import { buildVisitConfirmationUrl } from '@/lib/whatsapp';
import { createShopWorld } from '@/components/shop-game/shopWorld';
import {
  gamePlace, gameActions, journeyEvent, latestBooking, fittingTime, daysBetween,
  LEVEL_UPS, XP_PER_LEVEL, XP_PER_ACTION,
} from '@/lib/shop-game';
import '@/components/shop-game/shop-game.css';

const ZONES = {
  queue: { t: 'طابور الزيارات', where: 'قدام المحل', c: '#86c3ea' },
  cabinet: { t: 'المفتاح في الدولاب', where: 'دولاب المفاتيح', c: '#b79be8' },
  fitting: { t: 'غرفة البروفة', where: 'البروفة', c: '#c79bd8' },
  vitrine: { t: 'في الفاترينة', where: 'الفاترينة', c: '#f6c6cf' },
  home: { t: 'الفستان معاها', where: 'في البيت', c: '#59cf9c' },
  returnDoor: { t: 'باب الإرجاع', where: 'باب الإرجاع', c: '#f39a4c' },
};
const JOURNEY = [['visit', 'زيارة'], ['booking', 'حجز'], ['fitting', 'بروفة'], ['picked_up', 'استلام'], ['returned', 'إرجاع']];
const JOURNEY_INDEX = { queue: 0, cabinet: 1, fitting: 2, vitrine: 3, home: 4, returnDoor: 4 };
const DOCK = [['shop', 'المحل كله'], ['cabinet', 'الدولاب'], ['vitrine', 'الفاترينة'], ['fitting', 'البروفة'], ['cashier', 'الكاشير'], ['returns', 'الإرجاع'], ['street', 'الشارع']];
const ZONE_VIEW = { cabinet: 'cabinet', vitrine: 'vitrine', fitting: 'fitting', cashier: 'cashier', returns: 'returns' };
const XP_KEY = 'sophia_shop_game_xp';

const SKINS = ['#f3cfb0', '#e6b38e', '#cf9672', '#f6dac4', '#b07a58', '#e9bf9c'];
const HAIRS = ['#2b1a14', '#4a2c1c', '#7a4a2a', '#16100e', '#a8713a', '#5b3423'];
const OUTFITS = ['#7fb8d8', '#c79bd8', '#f2a65a', '#71c4a0', '#e57f9a', '#6c8fd6', '#d9b84f', '#e0706a', '#8d7fd9'];
const DRESS_LOOKS = [
  { color: '#f7f0e4', trim: '#d9b56a', style: 'aline' }, { color: '#f2f6fc', trim: '#9fbde0', style: 'ball' },
  { color: '#fbede8', trim: '#e2ac98', style: 'mermaid' }, { color: '#fffaf0', trim: '#efd187', style: 'aline' },
  { color: '#f0dcc0', trim: '#c79d5f', style: 'ball' }, { color: '#f8d9de', trim: '#e1909f', style: 'ball' },
  { color: '#ffffff', trim: '#e9b949', style: 'mermaid' }, { color: '#f3e8d8', trim: '#b39a7b', style: 'boho' },
];
const at = (list, n) => list[Math.abs(Number(n) || 0) % list.length];
const brideLook = (id) => ({ skin: at(SKINS, id * 7), hair: at(HAIRS, id * 5 + 1), outfit: at(OUTFITS, id * 3 + 2), bun: id % 2 === 0 });
const dm = (d) => { const c = cleanDate(d); if (!c) return '—'; const [, m, day] = c.split('-'); return `${Number(day)}/${Number(m)}`; };
const rel = (n) => (n === null || n === undefined ? '' : n === 0 ? 'النهارده' : n === 1 ? 'بكرة' : n === -1 ? 'امبارح' : n > 1 ? `بعد ${n} يوم` : `من ${-n} يوم`);
const money = (n) => `${Math.round(Number(n) || 0).toLocaleString('en-US')} ج.م`;

function normalize(c) {
  return {
    ...c,
    current_stage: c.current_stage || c.stage || 'visit',
    wedding_date: (c.wedding_date || c.bookings?.[0]?.event_date) ? String(c.wedding_date || c.bookings?.[0]?.event_date).substring(0, 10) : '',
    latest_visit_date: (c.latest_visit_date || c.visits?.[0]?.visit_date) ? String(c.latest_visit_date || c.visits?.[0]?.visit_date).substring(0, 10) : '',
    latest_dress_name: c.latest_dress_name || c.bookings?.[0]?.dress?.name || '',
    pickup_scheduled_on: c.bookings?.[0]?.pickup_scheduled_on || c.pickup_scheduled_on || '',
    return_scheduled_on: c.bookings?.[0]?.return_scheduled_on || c.return_scheduled_on || '',
  };
}

function mainDress(b) {
  const booking = latestBooking(b);
  return booking?.dress || getVisitDresses(b)[0] || null;
}
function dressImage(dress) {
  const path = dress?.image_path || dress?.images?.find((i) => i.is_primary)?.image_path || dress?.images?.[0]?.image_path;
  return path ? getStorageUrl(path) : null;
}
function moneyOf(b) {
  const booking = latestBooking(b);
  if (!booking) return null;
  const revs = booking.revenues || [];
  const rent = revs.filter((r) => r.type === 'deposit' || r.type === 'balance');
  const paid = rent.length ? rent.reduce((s, r) => s + parseFloat(r.amount || 0), 0) : parseFloat(booking.deposit_amount || 0);
  const total = parseFloat(booking.total_amount || 0);
  const insurance = revs.filter((r) => r.type === 'insurance').reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  return { total, paid, remaining: Math.max(0, total - paid), insurance };
}

/** Data the 3D world needs for one bride */
function toEntry(b, p) {
  const z = p.zone;
  const booking = latestBooking(b);
  const delivered = booking?.status === 'picked_up' || booking?.status === 'out';
  const dress = mainDress(b);
  const fitDate = p.fitting ? dm(p.fitting.fitting_date) : '';
  const entry = {
    id: b.id,
    name: b.name || 'عروسة',
    look: brideLook(b.id),
    dress: at(DRESS_LOOKS, dress?.id ?? b.id),
    actor: ['queue', 'fitting', 'home', 'returnDoor'].includes(z) ? z : null,
    key: b.current_stage === 'booking' && (z === 'cabinet' || z === 'fitting'),
    mannequin: b.current_stage === 'picked_up' && !delivered && (z === 'vitrine' || z === 'fitting'),
    order: 0,
    keyTag: {
      line2: `الفرح ${dm(p.dates.wedding)}`,
      line3: p.fitting ? `بروفة ${fitDate} ${fittingTime(p.fitting)}`.trim() : 'محتاجة ميعاد بروفة',
      color: p.fitting ? '#b79be8' : '#f39a4c',
      ink: p.fitting ? '#6b4bb8' : '#b4600f',
    },
    vitTag: { line2: `استلام ${dm(p.dates.pickup)}${p.pickupIn !== undefined && p.pickupIn <= 0 ? ' · النهارده' : ''}`, hot: p.pickupIn !== undefined && p.pickupIn <= 0 },
    chip: { badge: '', sub: '', color: ZONES[z]?.c },
  };
  if (z === 'queue') {
    entry.order = (p.visitIn ?? 99) * 1000 + b.id;
    entry.chip = { badge: p.visitStatus === 'pending' ? '!' : '✓', sub: p.visitStatus === 'pending' ? 'تحتاج تأكيد' : p.whatsApp ? 'ابعتي الواتساب' : `زيارة ${rel(p.visitIn)}`, color: p.visitStatus === 'pending' ? '#f39a4c' : ZONES.queue.c };
  } else if (z === 'fitting') {
    entry.order = (p.fittingIn ?? 0) * 1000 + b.id;
    entry.chip = { badge: '✂', sub: p.fittingIn < 0 ? `بروفة متأخرة ${-p.fittingIn} يوم` : `بروفة ${fittingTime(p.fitting) || 'النهارده'}`, color: ZONES.fitting.c, late: p.fittingIn < 0 };
  } else if (z === 'home') {
    entry.order = (p.returnIn ?? 0) * 1000 + b.id;
    entry.chip = { badge: String(p.returnIn ?? ''), sub: p.returnIn === 1 ? 'ترجع بكرة' : 'يوم وترجع', color: ZONES.home.c };
  } else if (z === 'returnDoor') {
    entry.order = (p.returnIn ?? 0) * 1000 + b.id;
    entry.chip = { badge: p.returnIn < 0 ? '!' : '↩', sub: p.returnIn < 0 ? `متأخرة ${-p.returnIn} يوم` : 'ترجع النهارده', color: ZONES.returnDoor.c, late: p.returnIn < 0 };
  } else if (z === 'vitrine') {
    entry.order = (p.pickupIn ?? 0) * 1000 + b.id;
  } else if (z === 'cabinet') {
    entry.order = Number(cleanDate(p.dates.wedding).replace(/-/g, '')) || b.id;
  }
  return entry;
}

function readXp() { try { return Number(localStorage.getItem(XP_KEY)) || 0; } catch { return 0; } }
function writeXp(v) { try { localStorage.setItem(XP_KEY, String(v)); } catch { /* XP is a per-browser nicety */ } }

export default function ShopGamePage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const chipsRef = useRef(null);
  const floatRef = useRef(null);
  const worldRef = useRef(null);
  const placesRef = useRef(new Map());
  const entriesRef = useRef(new Map());

  const [brides, setBridesState] = useState([]);
  const bridesRef = useRef([]);
  const setBrides = (list) => { bridesRef.current = list; setBridesState(list); };
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [zone, setZone] = useState(null);
  const [view, setView] = useState('shop');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [xp, setXp] = useState(readXp);
  const [muted, setMuted] = useState(false);
  const [levelUps, setLevelUps] = useState([]);
  const today = todayStr();

  const places = useMemo(() => {
    const m = new Map();
    brides.forEach((b) => m.set(b.id, gamePlace(b, today)));
    return m;
  }, [brides, today]);

  const buildEntries = useCallback((list) => {
    const out = [];
    const map = new Map();
    list.forEach((b) => {
      const p = gamePlace(b, today);
      if (!p.zone) return;
      const e = toEntry(b, p);
      out.push(e); map.set(b.id, e);
    });
    return { out, map };
  }, [today]);

  const syncWorld = useCallback((list, events = {}) => {
    const { out, map } = buildEntries(list);
    entriesRef.current = map;
    placesRef.current = new Map(list.map((b) => [b.id, gamePlace(b, today)]));
    return worldRef.current?.sync(out, events) || Promise.resolve();
  }, [buildEntries, today]);

  // World lifetime
  useEffect(() => {
    let world = null;
    let cancelled = false;
    const fonts = ['40px "Lalezar"', '600 40px "IBM Plex Sans Arabic"', '40px "Parisienne"'];
    const ready = Promise.race([
      Promise.all(fonts.map((f) => document.fonts?.load(f).catch(() => null))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    ready.then(() => {
      if (cancelled || !canvasRef.current) return;
      world = createShopWorld({
        canvas: canvasRef.current,
        chipLayer: chipsRef.current,
        floatLayer: floatRef.current,
        onPick: (id) => { setZone(null); setSelectedId(id); },
        onZone: (z) => { setSelectedId(null); setZone(z); },
      });
      worldRef.current = world;
      if (bridesRef.current.length) syncWorld(bridesRef.current);
    });
    return () => { cancelled = true; world?.dispose(); worldRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await apiClient.get('/clients?per_page=1000');
      const list = (Array.isArray(res) ? res : res.data || []).map(normalize);
      setBrides(list);
      syncWorld(list);
    } catch (e) {
      console.error(e);
      setLoadError('تعذر تحميل العرايس. تأكد من الاتصال وجرّب تاني.');
    } finally {
      setLoading(false);
    }
  }, [syncWorld]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { worldRef.current?.select(selectedId); }, [selectedId]);
  useEffect(() => { worldRef.current?.setMuted(muted); }, [muted]);

  const selected = brides.find((b) => b.id === selectedId) || null;
  const selPlace = selected ? places.get(selected.id) : null;

  const gainXp = (n) => setXp((v) => { const nv = v + n; writeXp(nv); return nv; });

  // A bride changed on the server: refresh her, animate the move, reward the player
  const afterChange = useCallback(async (id, freshFromPopup) => {
    let fresh = freshFromPopup;
    if (fresh === undefined) {
      try {
        const res = await apiClient.get(`/clients/${id}`);
        fresh = res?.data || res;
      } catch (e) {
        console.error(e);
        fresh = null;
      }
    }
    const before = placesRef.current.get(id);
    const oldEntry = entriesRef.current.get(id);
    const current = bridesRef.current;
    const list = fresh && fresh.id
      ? current.some((b) => b.id === id) ? current.map((b) => (b.id === id ? normalize(fresh) : b)) : [...current, normalize(fresh)]
      : current.filter((b) => b.id !== id);
    const after = fresh && fresh.id ? gamePlace(normalize(fresh), today) : { zone: null };
    const ev = journeyEvent(before, after);
    setBrides(list);
    worldRef.current?.reward(id, `+${XP_PER_ACTION} XP`);
    const played = syncWorld(list, ev && ev.type !== 'moved' ? { [id]: { type: ev.type, entry: oldEntry } } : {});
    const lv = ev && LEVEL_UPS[ev.type];
    gainXp(XP_PER_ACTION + (lv?.xp || 0));
    if (lv) {
      const name = fresh?.name || oldEntry?.name || '';
      // Level-up card after the animation, but never later than 12s
      Promise.race([played, new Promise((r) => setTimeout(r, 12000))]).then(() => {
        worldRef.current?.celebrate(id);
        setLevelUps((q) => [...q, { ...lv, name, id: `${id}-${Date.now()}` }]);
      });
    }
    return list;
  }, [syncWorld, today]);

  const runAction = async (b, a) => {
    if (busy) return;
    const e = entriesRef.current.get(b.id);
    switch (a.open) {
      case 'visit':
      case 'booking':
      case 'fitting':
        setModal({ type: 'stage', stage: a.open, isEdit: Boolean(a.isEdit), bride: b });
        break;
      case 'picked_up':
        if (a.walk && e?.mannequin) {
          setBusy(true);
          try { await worldRef.current?.walkToCashier(e); } finally { setBusy(false); }
          setModal({ type: 'stage', stage: 'picked_up', bride: b, walked: true });
        } else setModal({ type: 'stage', stage: 'picked_up', bride: b });
        break;
      case 'return': setModal({ type: 'return', bride: b }); break;
      case 'cancel': setModal({ type: 'cancel', bride: b }); break;
      case 'details': setModal({ type: 'details', bride: b }); break;
      case 'measure': navigate('/dashboard/fittings'); break;
      case 'whatsapp': {
        // Same flow as the journey popup: open WhatsApp, then record that the details were sent
        const visit = places.get(b.id)?.visit;
        const url = await buildVisitConfirmationUrl(b, visit);
        if (!url) { toast.error('لا يوجد رقم هاتف صالح للعروس'); return; }
        if (!window.open(url, '_blank')) { toast.warning('المتصفح منع فتح واتساب، جرّب تاني'); return; }
        setBusy(true);
        try {
          await apiClient.post(`/visits/${visit.id}/confirmation-sent`, {});
          await afterChange(b.id);
        } catch (err) {
          console.error(err);
          toast.error('تعذر تسجيل إرسال الواتساب');
        } finally {
          setBusy(false);
        }
        break;
      }
      case 'quick': {
        if (a.confirm && !(await confirmDialog(a.confirm))) return;
        setBusy(true);
        try {
          await apiClient.put(`/clients/${b.id}/stage-action`, { action: a.action, ...(a.payload || {}) });
          await afterChange(b.id);
          toast.success('تم تنفيذ الإجراء بنجاح ✨');
        } catch (err) {
          console.error(err);
          toast.error(err?.message || 'حدث خطأ أثناء تنفيذ الإجراء');
        } finally {
          setBusy(false);
        }
        break;
      }
      default: break;
    }
  };

  // The stage modals call onClose() right before onSuccess(), so the walk is only undone
  // when no onSuccess follows in the same task
  const pendingRelease = useRef(null);
  const closeModal = () => {
    if (modal?.walked) {
      const id = modal.bride.id;
      pendingRelease.current = id;
      setTimeout(() => { if (pendingRelease.current === id) { pendingRelease.current = null; worldRef.current?.release(id); } }, 0);
    }
    setModal(null);
  };
  const onModalSuccess = async () => {
    const id = modal.bride.id;
    pendingRelease.current = null;
    setModal(null);
    setBusy(true);
    try { await afterChange(id); } finally { setBusy(false); }
  };

  const pickZone = (z) => { setSelectedId(null); setZone(z); };
  const goView = (v) => {
    setView(v); setSelectedId(null);
    setZone(ZONE_VIEW[v] || null);
    worldRef.current?.view(v);
  };
  useEffect(() => { if (zone && ZONE_VIEW[zone]) { setView(zone); worldRef.current?.view(ZONE_VIEW[zone]); } }, [zone]);

  // ---------- derived lists ----------
  const counts = useMemo(() => {
    const c = { queue: 0, cabinet: 0, fitting: 0, vitrine: 0, home: 0, returnDoor: 0, fittingsOpen: 0 };
    places.forEach((p) => { if (p.zone) c[p.zone] += 1; if (p.fitting && p.zone) c.fittingsOpen += 1; });
    return c;
  }, [places]);

  const tasks = useMemo(() => {
    const T = [];
    brides.forEach((b) => {
      const p = places.get(b.id); if (!p?.zone) return;
      if (p.zone === 'queue' && p.visitStatus === 'pending') T.push({ b, k: 'تأكيد', c: '#f39a4c', s: `زيارة ${dm(p.visit?.visit_date)}`, r: 1 });
      else if (p.zone === 'queue' && p.whatsApp) T.push({ b, k: 'واتساب', c: '#a3d977', s: 'ابعتي تأكيد الزيارة', r: 2 });
      else if (p.zone === 'queue' && p.visitIn === 0) T.push({ b, k: 'زيارة', c: '#86c3ea', s: 'جاية النهارده', r: 3 });
      if (p.zone === 'fitting') T.push({ b, k: 'بروفة', c: '#c79bd8', s: p.fittingIn < 0 ? `متأخرة ${-p.fittingIn} يوم` : fittingTime(p.fitting) || 'النهارده', late: p.fittingIn < 0, r: 0 });
      if (p.zone === 'vitrine' && p.pickupIn <= 0) T.push({ b, k: 'استلام', c: '#f6c6cf', s: p.pickupIn < 0 ? `متأخر ${-p.pickupIn} يوم` : 'النهارده', late: p.pickupIn < 0, r: 0 });
      if (p.zone === 'returnDoor') T.push({ b, k: 'إرجاع', c: '#f39a4c', s: p.returnIn < 0 ? `متأخرة ${-p.returnIn} يوم` : 'النهارده', late: p.returnIn < 0, r: 0 });
      if (p.zone === 'home' && p.returnIn === 1) T.push({ b, k: 'تذكير', c: '#59cf9c', s: 'ترجع بكرة', r: 4 });
    });
    return T.sort((x, y) => x.r - y.r || (y.late ? 1 : 0) - (x.late ? 1 : 0));
  }, [brides, places]);

  const zoneList = useMemo(() => {
    if (!zone) return null;
    const whereBride = (fn) => brides.filter((b) => fn(places.get(b.id), entriesRef.current.get(b.id)));
    const byOrder = (list) => list.sort((a, b) => (entriesRef.current.get(a.id)?.order ?? 0) - (entriesRef.current.get(b.id)?.order ?? 0));
    switch (zone) {
      case 'cabinet': return { t: 'دولاب المفاتيح', s: 'كل مفتاح = حجز، مترتبين بميعاد الفرح.', list: byOrder(whereBride((p, e) => e?.key)), kind: 'key' };
      case 'vitrine': return { t: 'الفاترينة', s: 'فساتين في فترة الاستلام ولسه ما اتسلمتش.', list: byOrder(whereBride((p, e) => e?.mannequin)), kind: 'dress' };
      case 'fitting': return { t: 'البروفات', s: 'كل البروفات المفتوحة. اللي ميعادها جه بتستنى قدام الغرفة.', list: brides.filter((b) => places.get(b.id)?.fitting && places.get(b.id)?.zone).sort((a, b) => String(places.get(a.id).fitting.fitting_date).localeCompare(String(places.get(b.id).fitting.fitting_date))), kind: 'fitting' };
      case 'cashier': return { t: 'الكاشير', s: 'استلامات ميعادها جه أو فات.', list: byOrder(whereBride((p) => p?.zone === 'vitrine' && p.pickupIn <= 0)), kind: 'dress' };
      case 'returns': return { t: 'الإرجاع', s: 'اللي عند الباب واللي لسه الفستان معاها.', list: byOrder(whereBride((p) => p?.zone === 'returnDoor')).concat(byOrder(whereBride((p) => p?.zone === 'home'))), kind: 'return' };
      default: return null;
    }
  }, [zone, brides, places]);

  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const inLevel = xp % XP_PER_LEVEL;
  const actions = selected && selPlace ? gameActions(selected, selPlace) : [];
  const firstPrimary = actions.findIndex((a) => a.primary);

  const select = (id) => { setZone(null); setSelectedId(id); };

  const page = (
    <div className="sg-root" dir="rtl">
      <canvas ref={canvasRef} className="sg-canvas" aria-label="محل صوفيا دريسز ثلاثي الأبعاد" />
      <div ref={chipsRef} className="sg-layer" />
      <div ref={floatRef} className="sg-layer" />

      <header className="sg-hud">
        <div className="sg-panel sg-brand">
          <span className="sg-logo" dir="ltr">Sophia Dresses</span>
          <div className="sg-day">
            <b>{new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</b>
            <small>{brides.length ? `${counts.queue + counts.cabinet + counts.fitting + counts.vitrine + counts.home + counts.returnDoor} عروسة في المحل` : ' '}</small>
          </div>
          <button type="button" className="sg-btn" onClick={load} disabled={loading} title="تحديث البيانات">{loading ? '...' : 'تحديث'}</button>
          <button type="button" className="sg-btn sg-gold" onClick={() => navigate('/dashboard')}>رجوع للوحة التحكم</button>
        </div>

        <div className="sg-panel sg-stagebar">
          {!selected ? (
            <span className="sg-hint">{loading ? 'بنحمّل العرايس...' : 'اضغط على عروسة أو مفتاح أو فستان علشان تشوف خطواتها'}</span>
          ) : (
            <>
              <div className="sg-who">
                <Avatar b={selected} />
                <div><b>{selected.name}</b><small>{ZONES[selPlace?.zone]?.t || 'خارج المحل'} · {ZONES[selPlace?.zone]?.where || ''}</small></div>
              </div>
              {(selPlace?.zone === 'home' || selPlace?.zone === 'returnDoor') && (
                <div className={`sg-cd ${selPlace.returnIn < 0 ? 'late' : ''}`}><b>{Math.abs(selPlace.returnIn ?? 0)}</b><span>{selPlace.returnIn < 0 ? 'يوم تأخير' : selPlace.returnIn === 0 ? 'ترجع النهارده' : 'يوم وترجع'}</span></div>
              )}
              <div className="sg-steps">
                {actions.map((a, i) => (
                  <button
                    type="button"
                    key={a.key}
                    disabled={busy}
                    className={`sg-step ${i === firstPrimary ? 'now' : ''} ${a.danger ? 'danger' : ''} ${a.open === 'details' ? 'ghost' : ''}`}
                    onClick={() => runAction(selected, a)}
                  >
                    {i === firstPrimary && <i>★</i>}{a.label}
                  </button>
                ))}
              </div>
              <button type="button" className="sg-btn sg-icon" onClick={() => setSelectedId(null)} aria-label="إلغاء الاختيار">✕</button>
            </>
          )}
        </div>

        <div className="sg-panel sg-level">
          <div className="sg-lvbadge" style={{ '--p': `${(inLevel / XP_PER_LEVEL) * 100}%` }}><b>{level}</b></div>
          <div className="sg-meta">
            <b>مستوى المحل</b>
            <small dir="ltr">{inLevel} / {XP_PER_LEVEL} XP</small>
          </div>
          <button type="button" className="sg-btn sg-icon" onClick={() => setMuted((m) => !m)} aria-pressed={muted} aria-label="الصوت" style={{ opacity: muted ? 0.4 : 1 }}>♪</button>
        </div>
      </header>

      <section className="sg-panel sg-today" aria-label="مهام النهارده">
        <h3>مهام النهارده <small>{tasks.length} مهمة</small></h3>
        {tasks.length === 0 && <div className="sg-empty">مفيش مهام مستعجلة النهارده.</div>}
        <div className="sg-scroll">
          {tasks.map((t) => (
            <button type="button" key={`${t.b.id}-${t.k}`} className={`sg-task ${t.late ? 'late' : ''}`} onClick={() => select(t.b.id)}>
              <span className="k" style={{ '--c': t.c }}>{t.k}</span><b>{t.b.name}</b><small>{t.s}</small>
            </button>
          ))}
        </div>
      </section>

      <aside className={`sg-panel sg-side ${!selected && !zoneList ? 'idle' : ''}`}>
        <div className="sg-scroll">
          {selected ? (
            <BrideCard b={selected} p={selPlace} onDetails={() => setModal({ type: 'details', bride: selected })} />
          ) : zoneList ? (
            <>
              <div className="sg-sh"><div><h2>{zoneList.t}</h2><small>{zoneList.s}</small></div><button type="button" className="sg-btn sg-icon" onClick={() => goView('shop')} aria-label="قفل">✕</button></div>
              {zoneList.list.length === 0 && <div className="sg-empty">مفيش حاجة هنا دلوقتي.</div>}
              <div className={zoneList.kind === 'key' ? 'sg-keygrid' : 'sg-list'}>
                {zoneList.list.map((b) => <ZoneItem key={b.id} b={b} p={places.get(b.id)} kind={zoneList.kind} onClick={() => select(b.id)} />)}
              </div>
            </>
          ) : (
            <>
              <div className="sg-sh"><div><h2>المحل النهارده</h2><small>كل عروسة ماشية في رحلتها جوه المحل</small></div></div>
              <div className="sg-list">
                {[['queue', 'queue'], ['cabinet', 'cabinet'], ['fitting', 'fitting'], ['vitrine', 'vitrine'], ['home', 'returns'], ['returnDoor', 'returns']].map(([z, target]) => (
                  <button type="button" key={z} className="sg-item" onClick={() => (z === 'queue' ? goView('shop') : pickZone(target))}>
                    <span className="sg-cnt" style={{ '--c': ZONES[z].c }}>{z === 'fitting' ? counts.fittingsOpen : counts[z]}</span>
                    <div className="t"><b>{ZONES[z].t}</b><small>{z === 'fitting' ? `${counts.fitting} بروفة ميعادها جه` : ZONES[z].where}</small></div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>

      <nav className="sg-panel sg-dock" aria-label="الكاميرا">
        {DOCK.map(([v, l]) => <button type="button" key={v} className={`sg-btn ${view === v ? 'on' : ''}`} onClick={() => goView(v)}>{l}</button>)}
      </nav>

      {loadError && (
        <div className="sg-panel sg-error"><b>{loadError}</b><button type="button" className="sg-btn sg-gold" onClick={load}>جرّب تاني</button></div>
      )}

      {levelUps[0] && <LevelUp item={levelUps[0]} level={level} inLevel={inLevel} onDone={() => setLevelUps((q) => q.slice(1))} />}

      {modal?.type === 'stage' && (
        <UnifiedStageModal
          isOpen
          onClose={closeModal}
          bride={modal.bride}
          stage={modal.stage}
          isEdit={modal.isEdit}
          onSuccess={onModalSuccess}
        />
      )}
      {modal?.type === 'return' && (
        <ReturnDressModal isOpen onClose={closeModal} bride={modal.bride} onSuccess={onModalSuccess} />
      )}
      {modal?.type === 'cancel' && (
        <CancelBookingModal isOpen onClose={closeModal} bride={modal.bride} onSuccess={onModalSuccess} />
      )}
      {modal?.type === 'details' && (
        <BrideJourneyPopup
          bride={modal.bride}
          onClose={() => setModal(null)}
          onUpdate={async (fresh) => {
            const list = await afterChange(modal.bride.id, fresh || undefined);
            const updated = list.find((b) => b.id === modal.bride.id);
            if (updated) setModal((m) => (m?.type === 'details' ? { ...m, bride: updated } : m));
            else setModal(null);
          }}
        />
      )}
    </div>
  );

  return createPortal(page, document.body);
}

function Avatar({ b }) {
  const l = brideLook(b.id);
  return <span className="sg-ava" style={{ '--skin': l.skin, '--hair': l.hair, '--outfit': l.outfit }} />;
}

function BrideCard({ b, p, onDetails }) {
  const z = p?.zone;
  const dress = mainDress(b);
  const img = dressImage(dress);
  const m = moneyOf(b);
  const idx = JOURNEY_INDEX[z] ?? -1;
  return (
    <>
      <div className="sg-sh">
        <Avatar b={b} />
        <div><h2>{b.name}</h2><span className="sg-pill" style={{ '--c': ZONES[z]?.c || '#e9b949' }}>{ZONES[z]?.t || 'خارج المحل'}</span></div>
      </div>
      <ol className="sg-journey">
        {JOURNEY.map(([id, label], i) => <li key={id} className={i < idx ? 'ok' : i === idx ? 'cur' : ''}>{label}</li>)}
      </ol>
      {dress ? (
        <div className="sg-dressrow">
          {img ? <img alt="" src={img} /> : <span className="sg-noimg" />}
          <div><b>{dress.name || dress.code || 'فستان'}</b><small>{dress.code || ''}</small></div>
        </div>
      ) : <div className="sg-empty">لسه مفيش فستان.</div>}
      <dl className="sg-facts">
        {p?.dates?.wedding && <><dt>الفرح</dt><dd>{dm(p.dates.wedding)} <small>({rel(daysBetween(todayStr(), p.dates.wedding))})</small></dd></>}
        {b.phone && <><dt>الموبايل</dt><dd dir="ltr" style={{ textAlign: 'right' }}>{b.phone}</dd></>}
        {z === 'queue' && p.visit && <><dt>الزيارة</dt><dd>{dm(p.visit.visit_date)} ({rel(p.visitIn)})</dd></>}
        {p?.fitting && <><dt>البروفة</dt><dd>{dm(p.fitting.fitting_date)} {fittingTime(p.fitting)} ({rel(p.fittingIn)})</dd></>}
        {(z === 'vitrine' || z === 'cabinet' || z === 'fitting') && p.dates.pickup && <><dt>الاستلام</dt><dd>{dm(p.dates.pickup)}</dd></>}
        {(z === 'home' || z === 'returnDoor') && <><dt>الإرجاع</dt><dd>{dm(p.dates.ret)} ({rel(p.returnIn)})</dd></>}
      </dl>
      {m && m.total > 0 && (
        <div className="sg-money">
          <div className="row"><span>المدفوع <b>{money(m.paid)}</b></span><span>من {money(m.total)}</span></div>
          <div className="bar"><i style={{ width: `${Math.min(100, (m.paid / m.total) * 100)}%` }} /></div>
          <div className="row"><span>الباقي <b>{money(m.remaining)}</b></span><span>التأمين <b>{m.insurance ? money(m.insurance) : '—'}</b></span></div>
        </div>
      )}
      <button type="button" className="sg-btn" onClick={onDetails}>كل التفاصيل والمدفوعات</button>
    </>
  );
}

function ZoneItem({ b, p, kind, onClick }) {
  if (kind === 'key') {
    const c = p?.fitting ? '#b79be8' : '#f39a4c';
    return (
      <button type="button" onClick={onClick} className="sg-ktag-btn">
        <div className="sg-ktag" style={{ '--c': c }}><span className="band" /><b>{b.name}</b><small>الفرح {dm(p?.dates?.wedding)}<br />{p?.fitting ? `بروفة ${dm(p.fitting.fitting_date)}` : 'محتاجة ميعاد بروفة'}</small></div>
      </button>
    );
  }
  const dress = mainDress(b);
  const img = kind === 'dress' ? dressImage(dress) : null;
  let sub = '';
  let pill = null;
  if (kind === 'dress') { sub = `${dress?.name || ''} · استلام ${dm(p?.dates?.pickup)}`; pill = { t: rel(p?.pickupIn), c: p?.pickupIn <= 0 ? '#e0577c' : '#b79be8' }; }
  if (kind === 'fitting') { sub = `${dm(p?.fitting?.fitting_date)} ${fittingTime(p?.fitting)}`; pill = { t: rel(p?.fittingIn), c: p?.fittingIn < 0 ? '#e5484d' : '#c79bd8' }; }
  if (kind === 'return') { sub = p?.zone === 'returnDoor' ? 'عند باب الإرجاع' : `ترجع ${dm(p?.dates?.ret)}`; pill = { t: p?.returnIn < 0 ? `متأخرة ${-p.returnIn}` : rel(p?.returnIn), c: p?.returnIn < 0 ? '#e5484d' : p?.zone === 'returnDoor' ? '#f39a4c' : '#59cf9c' }; }
  return (
    <button type="button" className="sg-item" onClick={onClick}>
      {img ? <img alt="" src={img} /> : <Avatar b={b} />}
      <div className="t"><b>{b.name}</b><small>{sub}</small></div>
      {pill && <span className="sg-pill" style={{ '--c': pill.c }}>{pill.t}</span>}
    </button>
  );
}

function LevelUp({ item, level, inLevel, onDone }) {
  const [fill, setFill] = useState(Math.max(0, inLevel - item.xp));
  useEffect(() => {
    const r = requestAnimationFrame(() => setFill(inLevel));
    const t = setTimeout(onDone, 3600);
    return () => { cancelAnimationFrame(r); clearTimeout(t); };
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="sg-lvl" onClick={onDone} role="presentation">
      <div className="sg-rays" />
      <div className="sg-lvcard" role="dialog" aria-label={item.title}>
        <div className="sg-ribbon">خلصت مرحلة</div>
        <div className="sg-stars"><span /><span /><span /></div>
        <div className="sg-lvtitle">{item.title}</div>
        <div className="sg-lvname">{item.name} · {item.sub}</div>
        <div className="sg-lvxp">
          <b dir="ltr">+{item.xp + XP_PER_ACTION} XP</b>
          <div className="bar"><i style={{ width: `${(fill / XP_PER_LEVEL) * 100}%` }} /></div>
          <small>مستوى المحل {level} · {inLevel}/{XP_PER_LEVEL}</small>
        </div>
        {inLevel < item.xp + XP_PER_ACTION && level > 1 && <div className="sg-shopup">المحل طلع مستوى {level}!</div>}
        <button type="button" className="sg-btn sg-gold">كمّل</button>
      </div>
    </div>
  );
}
