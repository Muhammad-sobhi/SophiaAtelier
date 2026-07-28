import { Sparkles } from 'lucide-react';import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";

export function WelcomeCard() {
  const now = new Date();
  const hour = now.getHours();
  let greeting = 'صباح الخير';
  if (hour >= 12 && hour < 17) greeting = 'مساء الخير';else
  if (hour >= 17) greeting = 'مساء النور';

  const dateStr = now.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (/*#__PURE__*/
    _jsxDEV("div", { className: "bg-gradient-to-l from-[#b8975c] to-[#d4b97a] rounded-2xl p-6 text-white animate-fade-in shadow-lg shadow-[#b8975c]/20", children: /*#__PURE__*/
      _jsxDEV("div", { className: "flex items-center justify-between", children: [/*#__PURE__*/
        _jsxDEV("div", { children: [/*#__PURE__*/
          _jsxDEV("h2", { className: "text-2xl font-bold mb-1", children: [greeting, " 👋"] }, void 0, true), /*#__PURE__*/
          _jsxDEV("p", { className: "text-white/80 text-sm", children: dateStr }, void 0, false), /*#__PURE__*/
          _jsxDEV("p", { className: "text-white/70 text-sm mt-2", children: "لديك 3 زيارات اليوم و 5 مهام معلقة" }, void 0, false)] }, void 0, true
        ), /*#__PURE__*/
        _jsxDEV("div", { className: "w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm", children: /*#__PURE__*/
          _jsxDEV(Sparkles, { size: 32, className: "text-white" }, void 0, false) }, void 0, false
        )] }, void 0, true
      ) }, void 0, false
    ));

}