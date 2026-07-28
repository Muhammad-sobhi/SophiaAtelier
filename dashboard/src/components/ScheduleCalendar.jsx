import { ChevronLeft, ChevronRight } from 'lucide-react';import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";

export function ScheduleCalendar() {
  const days = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const dates = [22, 23, 24, 25, 26];

  return (/*#__PURE__*/
    _jsxDEV("div", { className: "bg-white rounded-3xl p-5 border border-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.015)]", children: [/*#__PURE__*/
      _jsxDEV("div", { className: "flex items-center justify-between mb-5", children: [/*#__PURE__*/
        _jsxDEV("div", { className: "flex items-center gap-1.5", children: [/*#__PURE__*/
          _jsxDEV("h3", { className: "text-xs font-extrabold text-slate-800", children: "جدول المواعيد" }, void 0, false), /*#__PURE__*/
          _jsxDEV("div", { className: "flex items-center gap-1 mr-1", children: [/*#__PURE__*/
            _jsxDEV("button", { className: "p-0.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-slate-700 cursor-pointer", children: /*#__PURE__*/
              _jsxDEV(ChevronRight, { size: 14 }, void 0, false) }, void 0, false
            ), /*#__PURE__*/
            _jsxDEV("button", { className: "p-0.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-slate-700 cursor-pointer", children: /*#__PURE__*/
              _jsxDEV(ChevronLeft, { size: 14 }, void 0, false) }, void 0, false
            )] }, void 0, true
          )] }, void 0, true
        ), /*#__PURE__*/

        _jsxDEV("button", { className: "flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-indigo-600 rounded-xl text-[10px] font-bold transition-all cursor-pointer", children: [/*#__PURE__*/
          _jsxDEV(CalendarIcon, { size: 12, className: "text-slate-400" }, void 0, false), /*#__PURE__*/
          _jsxDEV("span", { children: "مايو" }, void 0, false)] }, void 0, true
        )] }, void 0, true
      ), /*#__PURE__*/

      _jsxDEV("div", { className: "grid grid-cols-5 gap-2", children:
        days.map((day, index) => {
          const isActive = index === 2; // Wednesday 24
          return (/*#__PURE__*/
            _jsxDEV("div", { className: "text-center", children: [/*#__PURE__*/
              _jsxDEV("p", { className: "text-[10px] text-slate-400 font-semibold mb-2", children: day }, void 0, false), /*#__PURE__*/
              _jsxDEV("button", {
                className: `w-full py-2.5 rounded-2xl font-bold text-xs transition-all duration-300 cursor-pointer ${
                isActive ?
                'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-105' :
                'bg-slate-50/50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`, children:


                dates[index] }, void 0, false
              )] }, index, true
            ));

        }) }, void 0, false
      )] }, void 0, true
    ));

}