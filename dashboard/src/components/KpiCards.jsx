import { Users, Heart, Gem, ClipboardList } from 'lucide-react';import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";

const kpis = [
{ label: 'زوار اليوم', value: 12, icon: Users, color: '#b8975c', bgColor: '#b8975c/10' },
{ label: 'حجوزات اليوم', value: 5, icon: Heart, color: '#dc6b8a', bgColor: '#dc6b8a/10' },
{ label: 'فساتين خارج', value: 8, icon: Gem, color: '#6b8adc', bgColor: '#6b8adc/10' },
{ label: 'مهام معلقة', value: 5, icon: ClipboardList, color: '#dc8a6b', bgColor: '#dc8a6b/10' }];


export function KpiCards() {
  return (/*#__PURE__*/
    _jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children:
      kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (/*#__PURE__*/
          _jsxDEV("div", {

            className: "bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d4] hover:shadow-md transition-shadow animate-fade-in",
            style: { animationDelay: `${index * 0.1}s` }, children: [/*#__PURE__*/

            _jsxDEV("div", { className: "flex items-center justify-between mb-3", children: [/*#__PURE__*/
              _jsxDEV("div", {
                className: "w-10 h-10 rounded-lg flex items-center justify-center",
                style: { backgroundColor: kpi.bgColor }, children: /*#__PURE__*/

                _jsxDEV(Icon, { size: 20, style: { color: kpi.color } }, void 0, false) }, void 0, false
              ), /*#__PURE__*/
              _jsxDEV("div", { className: "w-12 h-1 rounded-full", style: { backgroundColor: kpi.color } }, void 0, false)] }, void 0, true
            ), /*#__PURE__*/
            _jsxDEV("div", { className: "text-3xl font-bold text-[#3a3a3a]", children: kpi.value }, void 0, false), /*#__PURE__*/
            _jsxDEV("div", { className: "text-sm text-[#8a8a8a] mt-1", children: kpi.label }, void 0, false)] }, kpi.label, true
          ));

      }) }, void 0, false
    ));

}