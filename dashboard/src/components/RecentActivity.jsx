import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";const activities = [
{ client: 'سارة أحمد', activity: 'زيارة استشارية', status: 'completed', time: '10:30 ص' },
{ client: 'نورة محمد', activity: 'حجز فستان', status: 'pending', time: '11:00 ص' },
{ client: 'فاطمة العلي', activity: 'بروفة', status: 'completed', time: '11:30 ص' },
{ client: 'خديجة حسن', activity: 'زيارة متابعة', status: 'overdue', time: '12:00 م' },
{ client: 'مريم خالد', activity: 'تعديل فستان', status: 'pending', time: '12:30 م' }];


const statusConfig = {
  completed: { label: 'مكتمل', bg: '#dcf5e7', text: '#1a7a4c' },
  pending: { label: 'قيد الانتظار', bg: '#fef3cd', text: '#856404' },
  overdue: { label: 'متأخر', bg: '#fdd', text: '#a71d2a' }
};

export function RecentActivity() {
  return (/*#__PURE__*/
    _jsxDEV("div", { className: "bg-white rounded-xl shadow-sm border border-[#e8e0d4] animate-fade-in", style: { animationDelay: '0.5s' }, children: [/*#__PURE__*/
      _jsxDEV("div", { className: "p-5 border-b border-[#e8e0d4]", children: /*#__PURE__*/
        _jsxDEV("h3", { className: "text-lg font-bold text-[#3a3a3a]", children: "أحدث النشاطات" }, void 0, false) }, void 0, false
      ), /*#__PURE__*/
      _jsxDEV("div", { className: "overflow-x-auto", children: /*#__PURE__*/
        _jsxDEV("table", { className: "w-full", children: [/*#__PURE__*/
          _jsxDEV("thead", { children: /*#__PURE__*/
            _jsxDEV("tr", { className: "border-b border-[#e8e0d4]", children: [/*#__PURE__*/
              _jsxDEV("th", { className: "text-right px-5 py-3 text-sm font-semibold text-[#8a8a8a]", children: "العميل" }, void 0, false), /*#__PURE__*/
              _jsxDEV("th", { className: "text-right px-5 py-3 text-sm font-semibold text-[#8a8a8a]", children: "النشاط" }, void 0, false), /*#__PURE__*/
              _jsxDEV("th", { className: "text-right px-5 py-3 text-sm font-semibold text-[#8a8a8a]", children: "الحالة" }, void 0, false), /*#__PURE__*/
              _jsxDEV("th", { className: "text-right px-5 py-3 text-sm font-semibold text-[#8a8a8a]", children: "الوقت" }, void 0, false)] }, void 0, true
            ) }, void 0, false
          ), /*#__PURE__*/
          _jsxDEV("tbody", { children:
            activities.map((item, index) => {
              const status = statusConfig[item.status];
              return (/*#__PURE__*/
                _jsxDEV("tr", { className: "border-b border-[#f5f0e8] last:border-0 hover:bg-[#faf8f3] transition-colors", children: [/*#__PURE__*/
                  _jsxDEV("td", { className: "px-5 py-3 text-sm font-medium text-[#3a3a3a]", children: item.client }, void 0, false), /*#__PURE__*/
                  _jsxDEV("td", { className: "px-5 py-3 text-sm text-[#8a8a8a]", children: item.activity }, void 0, false), /*#__PURE__*/
                  _jsxDEV("td", { className: "px-5 py-3", children: /*#__PURE__*/
                    _jsxDEV("span", {
                      className: "inline-block px-3 py-1 rounded-full text-xs font-medium",
                      style: { backgroundColor: status.bg, color: status.text }, children:

                      status.label }, void 0, false
                    ) }, void 0, false
                  ), /*#__PURE__*/
                  _jsxDEV("td", { className: "px-5 py-3 text-sm text-[#8a8a8a]", children: item.time }, void 0, false)] }, index, true
                ));

            }) }, void 0, false
          )] }, void 0, true
        ) }, void 0, false
      )] }, void 0, true
    ));

}