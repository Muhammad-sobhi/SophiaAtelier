import React, { useState, useEffect, useRef } from 'react';
import { User, ChevronDown, Check, Plus, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export function SalesCombobox({
  value = '',
  onChange,
  label = 'مسؤول المبيعات (السيلز)',
  placeholder = 'اختر من القائمة أو اكتب اسماً يدوياً...',
  disabled = false,
  required = false,
  className = '',
}) {
  const [employees, setEmployees] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const containerRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    let isMounted = true;
    apiClient.get('/employees')
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        setEmployees(list);
      })
      .catch((err) => {
        console.warn('Could not load employees for sales combobox:', err);
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newVal = e.target.value;
    setInputValue(newVal);
    onChange?.(newVal);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelectOption = (name) => {
    setInputValue(name);
    onChange?.(name);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setInputValue('');
    onChange?.('');
  };

  // Filtered list based on current input
  const filteredEmployees = employees.filter((emp) => {
    if (!inputValue.trim()) return true;
    const q = inputValue.toLowerCase().trim();
    return (
      (emp.name || '').toLowerCase().includes(q) ||
      (emp.role || emp.position || '').toLowerCase().includes(q)
    );
  });

  const isCustomValue = inputValue.trim() && !employees.some(e => e.name?.trim() === inputValue.trim());

  return (
    <div className={`space-y-1 text-right relative ${className}`} dir="rtl" ref={containerRef}>
      {label && (
        <label className="text-[11px] font-extrabold text-slate-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <User size={13} className="text-indigo-500" />
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </span>
          <span className="text-[9.5px] font-bold text-slate-400">
            (اختر أو اكتب يدوياً)
          </span>
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="w-full pr-8 pl-8 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
        />

        <User size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />

        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
              title="مسح"
            >
              <X size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="p-0.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 left-0 bg-white rounded-2xl border border-slate-200 shadow-xl z-[999] py-1.5 max-h-56 overflow-y-auto scrollbar-thin animate-in fade-in zoom-in-95 duration-100">
          {/* Custom option prompt if user typed something not in list */}
          {isCustomValue && (
            <div
              onClick={() => handleSelectOption(inputValue.trim())}
              className="px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center justify-between cursor-pointer border-b border-slate-100"
            >
              <span className="flex items-center gap-2 truncate">
                <Plus size={13} />
                <span>إضافة كاسم يدوي: <b>"{inputValue.trim()}"</b></span>
              </span>
              <span className="text-[10px] bg-indigo-100/80 px-1.5 py-0.5 rounded text-indigo-700">يدوي</span>
            </div>
          )}

          {/* Employee list */}
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp) => {
              const isSelected = inputValue.trim() === emp.name?.trim();
              return (
                <div
                  key={emp.id}
                  onClick={() => handleSelectOption(emp.name)}
                  className={`px-3 py-2 text-xs font-semibold hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50/70 text-indigo-700 font-extrabold' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600">
                      {(emp.name || '?')[0]}
                    </div>
                    <div>
                      <span className="block font-bold">{emp.name}</span>
                      <span className="block text-[9.5px] text-slate-400 font-normal">
                        {emp.role || emp.position || 'موظف'}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-indigo-600" />}
                </div>
              );
            })
          ) : (
            !isCustomValue && (
              <div className="px-3 py-4 text-center text-xs text-slate-400 font-bold">
                لا يوجد موظفين مسجلين
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default SalesCombobox;
