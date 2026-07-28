import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";const daysAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const events = { 1: [2, 3], 3: [1], 4: [1, 2], 5: [3] };

export function CalendarWidget() {
  const now = new Date();
  const today = now.getDate();
  const month = now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  const startDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (/*#__PURE__*/
    _jsxDEV("div", { className: "bg-white rounded-xl shadow-sm border border-[#e8e0d4] p-5 animate-fade-in", style: { animationDelay: '0.6s' }, children: [/*#__PURE__*/
      _jsxDEV("div", { className: "flex items-center justify-between mb-4", children: [/*#__PURE__*/
        _jsxDEV("h3", { className: "text-lg font-bold text-[#3a3a3a]", children: "التقويم" }, void 0, false), /*#__PURE__*/
        _jsxDEV("span", { className: "text-sm text-[#8a8a8a]", children: month }, void 0, false)] }, void 0, true
      ), /*#__PURE__*/

      _jsxDEV("div", { className: "grid grid-cols-7 gap-1 mb-2", children:
        daysAr.map((d) => /*#__PURE__*/
        _jsxDEV("div", { className: "text-center text-xs font-semibold text-[#8a8a8a] py-1", children: d }, d, false)
        ) }, void 0, false
      ), /*#__PURE__*/

      _jsxDEV("div", { className: "grid grid-cols-7 gap-1", children:
        cells.map((day, i) => {
          if (day === null) return /*#__PURE__*/_jsxDEV("div", {}, `empty-${i}`, false);
          const isToday = day === today;
          const hasEvent = events[day];
          return (/*#__PURE__*/
            _jsxDEV("div", {

              className: `relative text-center py-1.5 text-sm rounded-lg cursor-pointer transition-colors ${
              isToday ?
              'bg-[#b8975c] text-white font-bold' :
              'text-[#3a3a3a] hover:bg-[#f5f0e8]'}`, children: [


              day,
              hasEvent && !isToday && /*#__PURE__*/
              _jsxDEV("div", { className: "absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5", children:
                hasEvent.map((e) => /*#__PURE__*/
                _jsxDEV("div", { className: "w-1 h-1 rounded-full bg-[#b8975c]" }, e, false)
                ) }, void 0, false
              )] }, day, true

            ));

        }) }, void 0, false
      )] }, void 0, true
    ));

}