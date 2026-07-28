import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { BrideJourneyCard } from './BrideJourneyCard';
import { ChevronLeft, ChevronRight, Users, Plus, ArrowRight } from 'lucide-react';import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";

const mockAvatars = [
'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80',
'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80',
'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=120&auto=format&fit=crop&q=80'];


export function BrideChipStrip({ onAddBride, compact = false }) {
  const [brides, setBrides] = useState([]);
  const [selectedBrideId, setSelectedBrideId] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const fetchBrides = async () => {
    try {
      const data = await apiClient.get('/dashboard/brides-summary');
      const list = Array.isArray(data) ? data : data.data || [];
      setBrides(list);
      if (list.length > 0) {
        setSelectedBrideId(list[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch brides summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrides();
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const selectedBride = brides.find((b) => b.id === selectedBrideId);

  return (/*#__PURE__*/
    _jsxDEV("div", {
      className: "space-y-4 font-sans text-left", dir: "ltr", children: [/*#__PURE__*/

      _jsxDEV("div", {
        className: "flex items-center justify-between border-b border-slate-100 pb-3", children: [/*#__PURE__*/
        _jsxDEV("div", {
          className: "flex items-center gap-2", children: [/*#__PURE__*/
          _jsxDEV(Users, { size: 16, className: "text-blue-600" }, void 0, false), /*#__PURE__*/
          _jsxDEV("h3", { className: "text-sm font-black text-slate-800 uppercase tracking-wider", children: "Bride Journey Manager" }, void 0, false), /*#__PURE__*/
          _jsxDEV("span", { className: "text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full", children: [brides.length, " Total"] }, void 0, true)]
        }, void 0, true
        ), /*#__PURE__*/

        _jsxDEV("div", {
          className: "flex items-center gap-2", children: [/*#__PURE__*/
          _jsxDEV("button", {
            onClick: () => scroll('left'), className: "w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all cursor-pointer", children: /*#__PURE__*/
            _jsxDEV(ChevronLeft, { size: 14 }, void 0, false)
          }, void 0, false
          ), /*#__PURE__*/
          _jsxDEV("button", {
            onClick: () => scroll('right'), className: "w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all cursor-pointer", children: /*#__PURE__*/
            _jsxDEV(ChevronRight, { size: 14 }, void 0, false)
          }, void 0, false
          ),
          onAddBride && /*#__PURE__*/
          _jsxDEV("button", {
            onClick: onAddBride,
            className: "flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm", children: [/*#__PURE__*/

            _jsxDEV(Plus, { size: 12 }, void 0, false), /*#__PURE__*/
            _jsxDEV("span", { children: "Add Bride" }, void 0, false)]
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
          className: "flex items-center gap-3 overflow-x-auto scrollbar-none pb-2 scroll-smooth",
          style: { scrollbarWidth: 'none' }, children:

          loading ? /*#__PURE__*/
          _jsxDEV("div", {
            className: "flex gap-4", children:
            [1, 2, 3, 4, 5].map((i) => /*#__PURE__*/
            _jsxDEV("div", { className: "w-20 h-24 rounded-2xl bg-slate-100 animate-pulse flex-shrink-0" }, i, false)
            )
          }, void 0, false
          ) :

          brides.map((bride, idx) => {
            const isSelected = selectedBrideId === bride.id;
            const avatar = bride.image_path ?
            `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${bride.image_path}` :
            mockAvatars[idx % mockAvatars.length];

            return (/*#__PURE__*/
              _jsxDEV("div", {
                className: "flex items-center flex-shrink-0", children: [/*#__PURE__*/
                _jsxDEV("button", {
                  onClick: () => setSelectedBrideId(bride.id),
                  className: `flex flex-col items-center p-2.5 rounded-2xl border transition-all duration-300 cursor-pointer w-24 ${isSelected ?
                  'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105' :
                  'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'}`, children: [/*#__PURE__*/


                  _jsxDEV("div", {
                    className: "w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 mb-2", children: /*#__PURE__*/
                    _jsxDEV("img", { src: avatar, alt: bride.name, className: "w-full h-full object-cover" }, void 0, false)
                  }, void 0, false
                  ), /*#__PURE__*/
                  _jsxDEV("span", { className: "text-[10px] font-black text-center truncate w-full", children: bride.name }, void 0, false)]
                }, void 0, true
                ),

                idx < brides.length - 1 && /*#__PURE__*/
                _jsxDEV(ArrowRight, { size: 14, className: "text-slate-300 mx-1 flex-shrink-0" }, void 0, false)]
              }, bride.id, true

              ));

          })
        }, void 0, false

        )
      }, void 0, false
      ),


      selectedBride && /*#__PURE__*/
      _jsxDEV("div", {
        className: "transition-all duration-500 animate-fade-in pt-2", children: /*#__PURE__*/
        _jsxDEV(BrideJourneyCard, {
          bride: selectedBride,
          onStageUpdate: fetchBrides,
          avatar: selectedBride.image_path ?
          `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${selectedBride.image_path}` :
          mockAvatars[brides.indexOf(selectedBride) % mockAvatars.length]
        }, void 0, false
        )
      }, void 0, false
      )]
    }, void 0, true

    ));

}