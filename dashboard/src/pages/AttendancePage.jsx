import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Clock,
  Calendar as CalendarIcon,
  Plus,
  DollarSign,
  FileText,
  Printer,
  TrendingDown,
  Banknote,
  X
} from 'lucide-react';























































export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [employees, setEmployees] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Attendance Tab State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);

  // Leaves Tab State
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveEmployeeId, setLeaveEmployeeId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('paid_leave');
  const [leaveReason, setLeaveReason] = useState('');

  // Payroll Tab State
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [payrollList, setPayrollList] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  // Loan Modal State
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanEmployeeId, setLoanEmployeeId] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [loanReason, setLoanReason] = useState('');

  useEffect(() => {
    // Check if user is admin
    const userStr = localStorage.getItem('atelier_current_employee');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.role === 'admin' || user.permissions?.includes('*'));
      } catch (e) {}
    }

    // Load employees
    apiClient.get('/employees').then((res) => {
      const list = Array.isArray(res) ? res : res.data || [];
      setEmployees(list);
    }).catch((err) => console.error('Failed to load employees:', err));
  }, []);

  // Fetch daily attendance
  useEffect(() => {
    if (!selectedDate) return;

    apiClient.get(`/attendance?date=${selectedDate}&all=1`).then((res) => {
      const records = Array.isArray(res) ? res : res.data || [];
      const map = {};

      records.forEach((rec) => {
        map[rec.employee_id] = {
          employee_id: rec.employee_id,
          status: rec.status || 'present',
          check_in: rec.check_in ? rec.check_in.substring(11, 16) : '13:00',
          check_out: rec.check_out ? rec.check_out.substring(11, 16) : '21:00',
          worked_hours: rec.worked_hours || 8,
          notes: rec.notes || ''
        };
      });

      setAttendanceMap(map);
    }).catch((err) => console.error('Failed to load attendance:', err));
  }, [selectedDate]);

  // Fetch leaves
  useEffect(() => {
    if (activeTab === 'leaves') {
      apiClient.get('/leave-requests').then((res) => {
        setLeaveRequests(Array.isArray(res) ? res : res.data || []);
      }).catch((err) => console.error('Failed to load leave requests:', err));
    }
  }, [activeTab]);

  // Fetch payroll
  useEffect(() => {
    if (activeTab === 'payroll') {
      apiClient.get(`/payroll/summary?month=${payrollMonth}&year=${payrollYear}`).
      then((res) => {
        setPayrollList(Array.isArray(res) ? res : []);
      }).
      catch((err) => console.error('Failed to load payroll summary:', err));
    }
  }, [activeTab, payrollMonth, payrollYear]);

  const handleAttendanceChange = (empId, field, value) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {
          employee_id: empId,
          status: 'present',
          check_in: '13:00',
          check_out: '21:00',
          worked_hours: 8,
          notes: ''
        }),
        [field]: value
      }
    }));
  };

  const handleSaveAttendance = async () => {
    setIsSavingAttendance(true);
    setAttendanceSuccess(false);

    try {
      const payload = employees.map((emp) => {
        const record = attendanceMap[emp.id] || {
          employee_id: emp.id,
          status: 'present',
          check_in: '13:00',
          check_out: '21:00',
          notes: ''
        };

        return {
          employee_id: emp.id,
          status: record.status,
          check_in: `${selectedDate} ${record.check_in || '13:00'}:00`,
          check_out: `${selectedDate} ${record.check_out || '21:00'}:00`,
          notes: record.notes || ''
        };
      });

      await apiClient.post('/attendance/bulk', {
        date: selectedDate,
        attendances: payload
      });

      setAttendanceSuccess(true);
      setTimeout(() => setAttendanceSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save attendance:', err);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleCreateLeaveRequest = async (e) => {
    e.preventDefault();
    if (!leaveEmployeeId || !leaveStartDate || !leaveEndDate) return;

    try {
      await apiClient.post('/leave-requests', {
        employee_id: leaveEmployeeId,
        start_date: leaveStartDate,
        end_date: leaveEndDate,
        type: leaveType,
        reason: leaveReason
      });

      setIsLeaveModalOpen(false);
      setLeaveEmployeeId('');
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');

      // Refresh leaves
      const res = await apiClient.get('/leave-requests');
      setLeaveRequests(Array.isArray(res) ? res : res.data || []);
    } catch (err) {
      console.error('Failed to create leave request:', err);
    }
  };

  const handleUpdateLeaveStatus = async (id, status) => {
    try {
      await apiClient.put(`/leave-requests/${id}/status`, {
        status,
        approved_by: 'الإدارة'
      });

      setLeaveRequests((prev) => prev.map((req) => req.id === id ? { ...req, status } : req));
    } catch (err) {
      console.error('Failed to update leave status:', err);
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    if (!loanEmployeeId || !loanAmount) return;

    try {
      await apiClient.post('/employee-loans', {
        employee_id: loanEmployeeId,
        amount: parseFloat(loanAmount),
        date: loanDate,
        reason: loanReason,
        status: 'approved'
      });

      setIsLoanModalOpen(false);
      setLoanEmployeeId('');
      setLoanAmount('');
      setLoanReason('');

      // Refresh payroll to reflect the new loan
      const res = await apiClient.get(`/payroll/summary?month=${payrollMonth}&year=${payrollYear}`);
      setPayrollList(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to create loan:', err);
    }
  };

  const totalMonthlyPayroll = payrollList.reduce((acc, curr) => acc + curr.net_salary, 0);
  const totalDeductionsAll = payrollList.reduce((acc, curr) => acc + curr.total_deductions, 0);
  const totalLoansAll = payrollList.reduce((acc, curr) => acc + (curr.loan_deduction || 0), 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex flex-col min-h-full overflow-y-auto bg-slate-50/50 text-right" dir="rtl">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Clock className="text-indigo-600" size={22} />
            <span>الحضور، الإجازات، والرواتب</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            تسجيل الحضور اليومي، إدارة العطلات، وحساب صافي الرواتب تلقائياً على نظام ورديات 8 ساعات
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap bg-slate-200/60 p-1 rounded-2xl gap-1 w-full sm:w-auto justify-stretch sm:justify-start">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
            activeTab === 'attendance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`
            }>
            
            جدول الحضور اليومي
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
            activeTab === 'leaves' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`
            }>
            
            طلبات الإجازات والعطلات
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
            activeTab === 'payroll' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`
            }>
            
            حساب الرواتب والمستحقات
          </button>
        </div>
      </div>

      {/* Tab 1: Daily Attendance */}
      {activeTab === 'attendance' &&
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl p-4 sm:p-6 border border-slate-100/70 shadow-xs overflow-hidden">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <label className="text-xs font-extrabold text-slate-600 whitespace-nowrap">اختر تاريخ اليوم:</label>
              <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 w-full sm:w-auto" />
            
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {attendanceSuccess &&
            <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-xl border border-green-200">
                  ✓ تم حفظ الحضور اليومي بنجاح
                </span>
            }
              <button
              onClick={handleSaveAttendance}
              disabled={isSavingAttendance}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer">
              
                {isSavingAttendance ? 'جاري الحفظ...' : 'حفظ كشف الحضور'}
              </button>
            </div>
          </div>

          {/* Attendance List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            {employees.map((emp) => {
            const record = attendanceMap[emp.id] || {
              employee_id: emp.id,
              status: 'present',
              check_in: '13:00',
              check_out: '21:00',
              notes: ''
            };

            return (
              <div
                key={emp.id}
                className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-100 rounded-2xl gap-4">
                
                  <div className="flex items-center gap-3 w-full md:w-1/4">
                    <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-bold text-xs">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">{emp.name}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">{emp.position || 'موظف'}</p>
                    </div>
                  </div>

                  {/* Status Buttons */}
                  <div className="flex items-center gap-1.5 w-full md:w-auto">
                    <button
                    type="button"
                    onClick={() => handleAttendanceChange(emp.id, 'status', 'present')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${
                    record.status === 'present' ?
                    'bg-emerald-600 text-white shadow-xs' :
                    'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`
                    }>
                    
                      حاضر (8 س)
                    </button>

                    <button
                    type="button"
                    onClick={() => handleAttendanceChange(emp.id, 'status', 'late')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${
                    record.status === 'late' ?
                    'bg-amber-500 text-white shadow-xs' :
                    'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`
                    }>
                    
                      متأخر
                    </button>

                    <button
                    type="button"
                    onClick={() => handleAttendanceChange(emp.id, 'status', 'absent')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${
                    record.status === 'absent' ?
                    'bg-rose-600 text-white shadow-xs' :
                    'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`
                    }>
                    
                      غائب
                    </button>

                    <button
                    type="button"
                    onClick={() => handleAttendanceChange(emp.id, 'status', 'leave')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${
                    record.status === 'leave' ?
                    'bg-indigo-600 text-white shadow-xs' :
                    'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`
                    }>
                    
                      إجازة / عطلة
                    </button>
                  </div>

                  {/* Time Controls */}
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">الحضور:</span>
                      <input
                      type="time"
                      value={record.check_in || '13:00'}
                      onChange={(e) => handleAttendanceChange(emp.id, 'check_in', e.target.value)}
                      className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-xs font-mono" />
                    
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">الانصراف:</span>
                      <input
                      type="time"
                      value={record.check_out || '21:00'}
                      onChange={(e) => handleAttendanceChange(emp.id, 'check_out', e.target.value)}
                      className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-xs font-mono" />
                    
                    </div>
                  </div>
                </div>);

          })}
          </div>
        </div>
      }

      {/* Tab 2: Leaves & Holidays */}
      {activeTab === 'leaves' &&
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl p-6 border border-slate-100/70 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 flex-shrink-0">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">طلبات الإجازات والعطلات الرسمية</h3>
              <p className="text-[11px] text-slate-400 font-bold">تقديم طلبات الإجازات والموافقة عليها لاحتسابها في الرواتب</p>
            </div>

            <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer">
            
              <Plus size={16} />
              <span>تقديم طلب إجازة جديدة</span>
            </button>
          </div>

          {/* Leave Requests Table */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            {leaveRequests.length === 0 ?
          <div className="text-center py-16 text-slate-400 font-bold text-xs">
                لا توجد طلبات إجازة مسجلة حالياً
              </div> :

          leaveRequests.map((leave) =>
          <div
            key={leave.id}
            className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-50/70 border border-slate-100 rounded-2xl gap-4">
            
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xs">
                      {leave.employee?.name ? leave.employee.name.charAt(0) : 'E'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">{leave.employee?.name || 'موظف'}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">{leave.reason || 'إجازة'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                    <span className="bg-slate-200/60 px-3 py-1 rounded-xl text-[10px] font-bold">
                      من {leave.start_date?.split('T')[0]} إلى {leave.end_date?.split('T')[0]}
                    </span>
                    <span className="text-indigo-600 font-bold text-[10px]">
                      {leave.type === 'paid_leave' && 'إجازة مدفوعة'}
                      {leave.type === 'unpaid_leave' && 'إجازة غير مدفوعة'}
                      {leave.type === 'sick_leave' && 'إجازة مرَضية'}
                      {leave.type === 'official_holiday' && 'عطلة رسمية'}
                    </span>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-2">
                    {leave.status === 'pending' ?
              <>
                        <button
                  onClick={() => handleUpdateLeaveStatus(leave.id, 'approved')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer">
                  
                          موافقة
                        </button>
                        <button
                  onClick={() => handleUpdateLeaveStatus(leave.id, 'rejected')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer">
                  
                          رفض
                        </button>
                      </> :

              <span
                className={`px-3 py-1 rounded-xl text-[10px] font-extrabold ${
                leave.status === 'approved' ?
                'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                'bg-rose-50 text-rose-600 border border-rose-200'}`
                }>
                
                        {leave.status === 'approved' ? 'مقبول ✓' : 'مرفوض ✕'}
                      </span>
              }
                  </div>
                </div>
          )
          }
          </div>
        </div>
      }

      {/* Tab 3: Payroll Summary */}
      {activeTab === 'payroll' &&
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Payroll Controls & Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">إجمالي رواتب الشهر المستحقة</p>
                <h3 className="text-xl font-extrabold text-slate-800 mt-1">{totalMonthlyPayroll.toLocaleString()} ج.م</h3>
              </div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <DollarSign size={20} />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">إجمالي الاستقطاعات والخصومات</p>
                <h3 className="text-xl font-extrabold text-rose-600 mt-1">-{totalDeductionsAll.toLocaleString()} ج.م</h3>
                {totalLoansAll > 0 && (
                  <p className="text-[10px] text-amber-600 font-bold mt-0.5">منها سلف: {totalLoansAll.toLocaleString()} ج.م</p>
                )}
              </div>
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                <TrendingDown size={20} />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">الشهر والسنة المطلوبة</p>
                <div className="flex items-center gap-2">
                  <select
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(parseInt(e.target.value))}
                  className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl text-xs font-bold text-slate-700">
                  
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) =>
                  <option key={m} value={m}>شهر {m}</option>
                  )}
                  </select>
                  <select
                  value={payrollYear}
                  onChange={(e) => setPayrollYear(parseInt(e.target.value))}
                  className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl text-xs font-bold text-slate-700">
                  
                    {[2025, 2026, 2027].map((y) =>
                  <option key={y} value={y}>{y}</option>
                  )}
                  </select>
                </div>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CalendarIcon size={20} />
              </div>
            </div>
          </div>

          {/* Loan Button */}
          <div className="flex items-center justify-end flex-shrink-0">
            <button
              onClick={() => setIsLoanModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl transition-all text-xs font-bold shadow-md shadow-amber-500/10 cursor-pointer">
              <Banknote size={16} />
              <span>تسجيل سلفة / إقراض موظف</span>
            </button>
          </div>

          {/* Payroll List */}
          <div className="flex-1 bg-white rounded-3xl p-6 border border-slate-100/70 shadow-xs overflow-y-auto scrollbar-thin">
            <div className="space-y-3">
              {payrollList.map((pay) =>
            <div
              key={pay.employee_id}
              className="flex flex-col lg:flex-row items-center justify-between p-5 bg-slate-50/70 border border-slate-100 rounded-2xl gap-4 hover:border-indigo-200 transition-all">
              
                  <div className="flex items-center gap-3 w-full lg:w-1/4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl flex items-center justify-center font-extrabold text-sm shadow-md shadow-indigo-100">
                      {pay.employee_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">{pay.employee_name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold inline-block">
                          {pay.position}
                        </span>
                        <span className="text-[8px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                          {pay.pay_cycle === 'monthly' ? 'شهري' : pay.pay_cycle === 'weekly' ? 'أسبوعي' : `كل ${pay.pay_cycle_days} يوم`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-semibold text-slate-600 w-full lg:w-auto">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold">الراتب (الشهري):</span>
                      <span className="font-extrabold text-slate-800">{pay.base_salary.toLocaleString()} ج.م</span>
                      {pay.pay_cycle !== 'monthly' && (
                        <span className="text-[8px] text-indigo-600 font-bold block">
                          راتب الدورة ({pay.pay_cycle === 'weekly' ? '7 أيام' : `${pay.pay_cycle_days} أيام`}): {pay.cycle_salary.toLocaleString()} ج.م
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold">أيام الحضور / ساعات:</span>
                      <span className="font-extrabold text-slate-800">{pay.present_days} يوم ({pay.total_worked_hours} س)</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold">الخصومات والاستقطاعات:</span>
                      <span className="font-extrabold text-rose-600">-{pay.total_deductions.toLocaleString()} ج.م</span>
                    </div>
                    {pay.loan_deduction > 0 && (
                      <div>
                        <span className="text-[9px] text-amber-500 block font-bold">خصم سلفة:</span>
                        <span className="font-extrabold text-amber-600">-{pay.loan_deduction.toLocaleString()} ج.م</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold">الصافي المستحِق:</span>
                      <span className="font-extrabold text-emerald-600 text-sm">{pay.net_salary.toLocaleString()} ج.م</span>
                    </div>
                  </div>

                  <button
                onClick={() => setSelectedPayslip(pay)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all cursor-pointer">
                
                    <FileText size={14} />
                    <span>كشف حساب الراتب</span>
                  </button>
                </div>
            )}
            </div>
          </div>
        </div>
      }

      {/* Leave Request Modal */}
      {isLeaveModalOpen &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs text-slate-700">
          <div className="bg-white rounded-3xl p-6 shadow-xl w-full max-w-md border border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-800 mb-4 border-b border-slate-100 pb-3">
              تقديم طلب إجازة / عطلة
            </h3>

            <form onSubmit={handleCreateLeaveRequest} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-600 block mb-1">اختر الموظف</label>
                <select
                required
                value={leaveEmployeeId}
                onChange={(e) => setLeaveEmployeeId(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold">
                
                  <option value="">-- اختر الموظف --</option>
                  {employees.map((emp) =>
                <option key={emp.id} value={emp.id}>{emp.name}</option>
                )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-600 block mb-1">تاريخ البداية</label>
                  <input
                  type="date"
                  required
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold" />
                
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600 block mb-1">تاريخ النهاية</label>
                  <input
                  type="date"
                  required
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold" />
                
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-600 block mb-1">نوع الإجازة</label>
                <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold">
                
                  <option value="paid_leave">إجازة اعتيادية مدفوعة</option>
                  <option value="unpaid_leave">إجازة غير مدفوعة (خصم يوم)</option>
                  <option value="sick_leave">إجازة مرَضية</option>
                  <option value="official_holiday">عطلة رسمية للأتيليه</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-600 block mb-1">السبب / التفاصيل</label>
                <textarea
                rows={2}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold resize-none"
                placeholder="سبب تقديم الطلب..." />
              
              </div>

              <div className="flex gap-3 pt-2">
                <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer">
                
                  تقديم الطلب
                </button>
                <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Payslip Detailed Modal */}
      {selectedPayslip &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs text-slate-700">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-lg border border-slate-100 space-y-4 max-h-[85vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">كشف حساب مفصل للراتب</h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  {selectedPayslip.employee_name} — شهر {selectedPayslip.month} / {selectedPayslip.year}
                  <span className="mr-2 text-indigo-500">
                    ({selectedPayslip.pay_cycle === 'monthly' ? 'شهري' : selectedPayslip.pay_cycle === 'weekly' ? 'أسبوعي' : `كل ${selectedPayslip.pay_cycle_days} يوم`})
                  </span>
                </p>
              </div>
              <button
              onClick={() => setSelectedPayslip(null)}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1.5 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">الراتب الشهري الأساسي:</span>
                  <span className="font-extrabold text-slate-800">{selectedPayslip.base_salary.toLocaleString()} ج.م</span>
                </div>
                {selectedPayslip.pay_cycle !== 'monthly' && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-indigo-500 font-bold">مستحق الدورة ({selectedPayslip.pay_cycle === 'weekly' ? 'أسبوعي / 7 أيام' : `كل ${selectedPayslip.pay_cycle_days} أيام`}):</span>
                    <span className="font-bold text-indigo-600">{selectedPayslip.cycle_salary?.toLocaleString()} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">أجر اليوم:</span>
                  <span className="font-bold text-slate-600">{selectedPayslip.daily_rate} ج.م</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">أجر الساعة (وردية 8 ساعات):</span>
                  <span className="font-bold text-slate-600">{selectedPayslip.hourly_rate} ج.م</span>
                </div>
              </div>

              <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-2xl space-y-1.5">
                <p className="font-extrabold text-rose-700 text-[11px]">تفاصيل الخصومات والاستقطاعات:</p>
                <div className="flex justify-between text-[11px]">
                  <span>خصم غياب بدون عذر ({selectedPayslip.absent_days} يوم):</span>
                  <span className="font-bold text-rose-600">-{selectedPayslip.unexcused_absence_deduction} ج.م</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>خصم إجازة غير مدفوعة ({selectedPayslip.unpaid_leave_days} يوم):</span>
                  <span className="font-bold text-rose-600">-{selectedPayslip.unpaid_leave_deduction} ج.م</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>خصم الساعات الناقصة ({selectedPayslip.shortage_hours} ساعة):</span>
                  <span className="font-bold text-rose-600">-{selectedPayslip.shortage_deduction} ج.م</span>
                </div>
              </div>

              {/* Loan Deductions Section */}
              {selectedPayslip.loan_deduction > 0 && (
                <div className="bg-amber-50/50 border border-amber-200 p-3.5 rounded-2xl space-y-1.5">
                  <p className="font-extrabold text-amber-700 text-[11px]">خصم سلفة / إقراض:</p>
                  {selectedPayslip.loan_details?.map((loan, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span className="text-amber-600">سلفة بتاريخ {loan.date}{loan.reason ? ` (${loan.reason})` : ''}:</span>
                      <span className="font-bold text-amber-700">-{loan.amount.toLocaleString()} ج.م</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[11px] border-t border-amber-200 pt-1 mt-1">
                    <span className="font-bold text-amber-700">إجمالي خصم السلف:</span>
                    <span className="font-extrabold text-amber-700">-{selectedPayslip.loan_deduction.toLocaleString()} ج.م</span>
                  </div>
                </div>
              )}

              <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">الصافي الواجب صرفه للموظف</p>
                  <h4 className="text-lg font-extrabold text-emerald-700 mt-0.5">
                    {selectedPayslip.net_salary.toLocaleString()} ج.م
                  </h4>
                </div>
                <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer">
                  <Printer size={14} />
                  <span>طباعة الكشف</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      {/* Loan Creation Modal */}
      {isLoanModalOpen &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs text-slate-700">
          <div className="bg-white rounded-3xl p-6 shadow-xl w-full max-w-md border border-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800">تسجيل سلفة / إقراض موظف</h3>
              <button
              onClick={() => setIsLoanModalOpen(false)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-600 block mb-1">اختر الموظف</label>
                <select
                required
                value={loanEmployeeId}
                onChange={(e) => setLoanEmployeeId(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold">
                  <option value="">-- اختر الموظف --</option>
                  {employees.map((emp) =>
                <option key={emp.id} value={emp.id}>{emp.name}</option>
                )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-600 block mb-1">مبلغ السلفة (ج.م)</label>
                  <input
                  type="number"
                  required
                  min="1"
                  placeholder="مثال: 500"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600 block mb-1">تاريخ السلفة</label>
                  <input
                  type="date"
                  required
                  value={loanDate}
                  onChange={(e) => setLoanDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold" />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-600 block mb-1">السبب / الملاحظات (اختياري)</label>
                <textarea
                rows={2}
                value={loanReason}
                onChange={(e) => setLoanReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold resize-none"
                placeholder="سبب طلب السلفة..." />
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
                <p className="text-[10px] text-amber-700 font-bold">
                  ⚠️ سيتم خصم هذا المبلغ تلقائياً من الراتب القادم للموظف وتسجيله كمصروف في النظام المالي.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer">
                  تسجيل السلفة
                </button>
                <button
                type="button"
                onClick={() => setIsLoanModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);

}
