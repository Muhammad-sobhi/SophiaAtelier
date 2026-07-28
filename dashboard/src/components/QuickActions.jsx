import { UserPlus, CalendarPlus, Gem, ClipboardPlus } from 'lucide-react';import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";

const actions = [
{ label: 'إضافة عميلة', icon: UserPlus, color: '#b8975c' },
{ label: 'تسجيل زيارة', icon: CalendarPlus, color: '#6b8adc' },
{ label: 'حجز فستان', icon: Gem, color: '#dc6b8a' },
{ label: 'إضافة مهمة', icon: ClipboardPlus, color: '#dc8a6b' }];


export function QuickActions() {
  return (/*#__PURE__*/
    _jsxDEV("div", { className: "bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d4] animate-fade-in", style: { animationDelay: '0.4s' }, children: [/*#__PURE__*/
      _jsxDEV("h3", { className: "text-lg font-bold text-[#3a3a3a] mb-4", children: "إجراءات سريعة" }, void 0, false), /*#__PURE__*/
      _jsxDEV("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3", children:
        actions.map((action) => {
          const Icon = action.icon;
          return (/*#__PURE__*/
            _jsxDEV("button", {

              className: "flex flex-col items-center gap-2 p-4 rounded-xl border border-[#e8e0d4] hover:border-[#b8975c] hover:bg-[#faf8f3] transition-all duration-200 group cursor-pointer", children: [/*#__PURE__*/

              _jsxDEV("div", {
                className: "w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
                style: { backgroundColor: `${action.color}15` }, children: /*#__PURE__*/

                _jsxDEV(Icon, { size: 22, style: { color: action.color } }, void 0, false) }, void 0, false
              ), /*#__PURE__*/
              _jsxDEV("span", { className: "text-sm font-medium text-[#3a3a3a]", children: action.label }, void 0, false)] }, action.label, true
            ));

        }) }, void 0, false
      )] }, void 0, true
    ));

}