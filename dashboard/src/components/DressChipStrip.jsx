import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { DressLifecycleCard } from './DressLifecycleCard';
import { Plus, ChevronLeft, ChevronRight, Gem, Sparkles } from 'lucide-react';import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";

export function DressChipStrip({ onAddDress, compact = false }) {
  const [dresses, setDresses] = useState([]);
  const [selectedDressId, setSelectedDressId] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const fetchDresses = async () => {
    try {
      const data = await apiClient.get('/dashboard/dresses-summary');
      const list = Array.isArray(data) ? data : data.data || [];
      setDresses(list);
      if (list.length > 0) {
        setSelectedDressId(list[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch dresses summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDresses();
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const selectedDress = dresses.find((d) => d.id === selectedDressId);

  const stageColors = {
    'ready': 'bg-emerald-50 border-emerald-200 text-emerald-700',
    'booked': 'bg-blue-50 border-blue-200 text-blue-700',
    'dry_clean': 'bg-purple-50 border-purple-200 text-purple-700'
  };

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  return (/*#__PURE__*/
    _jsxDEV("div", {
      className: "space-y-3", children: [/*#__PURE__*/

      _jsxDEV("div", {
        className: "flex items-center justify-between", children: [/*#__PURE__*/
        _jsxDEV("div", {
          className: "flex items-center gap-2", children: [/*#__PURE__*/
          _jsxDEV("div", {
            className: "w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center", children: /*#__PURE__*/
            _jsxDEV(Gem, { size: 14, className: "text-violet-600" }, void 0, false)
          }, void 0, false
          ), /*#__PURE__*/
          _jsxDEV("h3", { className: "text-xs font-extrabold text-slate-800", children: "الفساتين" }, void 0, false), /*#__PURE__*/
          _jsxDEV("span", { className: "text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full", children: dresses.length }, void 0, false)]
        }, void 0, true
        ), /*#__PURE__*/
        _jsxDEV("div", {
          className: "flex items-center gap-1.5", children: [/*#__PURE__*/
          _jsxDEV("button", {
            onClick: () => scroll('right'), className: "w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all cursor-pointer", children: /*#__PURE__*/
            _jsxDEV(ChevronRight, { size: 12 }, void 0, false)
          }, void 0, false
          ), /*#__PURE__*/
          _jsxDEV("button", {
            onClick: () => scroll('left'), className: "w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all cursor-pointer", children: /*#__PURE__*/
            _jsxDEV(ChevronLeft, { size: 12 }, void 0, false)
          }, void 0, false
          ),
          onAddDress && /*#__PURE__*/
          _jsxDEV("button", {
            onClick: onAddDress,
            className: "flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm", children: [/*#__PURE__*/

            _jsxDEV(Plus, { size: 12 }, void 0, false), /*#__PURE__*/
            _jsxDEV("span", { children: "إضافة فستان" }, void 0, false)]
          }, void 0, true
          )]
        }, void 0, true

        )]
      }, void 0, true
      ), /*#__PURE__*/


      _jsxDEV("div", {
        className: "relative", children: /*#__PURE__*/
        _jsxDEV("div", {
          ref: scrollRef,
          className: "flex gap-2 overflow-x-auto scrollbar-none pb-1 scroll-smooth",
          style: { scrollbarWidth: 'none' }, children:

          loading ? /*#__PURE__*/
          _jsxDEV("div", {
            className: "flex gap-2", children:
            [1, 2, 3, 4].map((i) => /*#__PURE__*/
            _jsxDEV("div", { className: "w-32 h-12 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" }, i, false)
            )
          }, void 0, false
          ) :
          dresses.length === 0 ? /*#__PURE__*/
          _jsxDEV("div", { className: "text-[10px] text-slate-400 font-bold py-2", children: "لا توجد فساتين مسجلة بعد" }, void 0, false) :

          dresses.map((dress) => {
            const isSelected = selectedDressId === dress.id;
            const stageColor = stageColors[dress.current_stage] || 'bg-slate-50 border-slate-200 text-slate-600';

            const imgUrl = dress.image_path ?
            `${apiBaseUrl.replace('/api', '')}/storage/${dress.image_path}` :
            null;

            return (/*#__PURE__*/
              _jsxDEV("button", {

                onClick: () => setSelectedDressId(isSelected ? null : dress.id),
                className: `flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[10px] font-extrabold transition-all duration-300 cursor-pointer ${isSelected ?
                'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200 scale-105' :
                `${stageColor} hover:shadow-sm hover:scale-[1.02]`}`, children: [/*#__PURE__*/



                _jsxDEV("div", {
                  className: `w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border ${isSelected ? 'border-white/30' : 'border-slate-200'}`, children:

                  imgUrl ? /*#__PURE__*/
                  _jsxDEV("img", { src: imgUrl, alt: dress.name, className: "w-full h-full object-cover" }, void 0, false) : /*#__PURE__*/

                  _jsxDEV("div", {
                    className: `w-full h-full flex items-center justify-center ${isSelected ? 'bg-white/10' : 'bg-slate-50'}`, children: /*#__PURE__*/
                    _jsxDEV(Sparkles, { size: 12, className: isSelected ? 'text-white/60' : 'text-slate-300' }, void 0, false)
                  }, void 0, false
                  )
                }, void 0, false

                ), /*#__PURE__*/
                _jsxDEV("span", { className: "whitespace-nowrap", children: dress.name }, void 0, false)]
              }, dress.id, true
              ));

          })
        }, void 0, false

        )
      }, void 0, false
      ),


      selectedDress && /*#__PURE__*/
      _jsxDEV("div", {
        className: "transition-all duration-500 animate-fade-in", children: /*#__PURE__*/
        _jsxDEV(DressLifecycleCard, {
          dress: selectedDress,
          onStageUpdate: fetchDresses,
          apiBaseUrl: apiBaseUrl
        }, void 0, false
        )
      }, void 0, false
      )]
    }, void 0, true

    ));

}