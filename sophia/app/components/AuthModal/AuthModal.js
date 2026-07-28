'use client';

import { useState, useEffect } from 'react';
import { X, Phone, Mail, MapPin, LogIn, UserPlus } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import styles from './AuthModal.module.css';

const EGYPTIAN_CITIES = [
  'Cairo',
  'Giza',
  'Alexandria',
  'Qalyubia',
  'Dakahlia',
  'Red Sea (Hurghada / El Gouna)',
  'Sharqia',
  'Gharbia',
  'Monufia',
  'Beheira',
  'Ismailia',
  'Suez',
  'Port Said',
  'Luxor',
  'Aswan',
  'Asyut',
  'Sohag',
  'Beni Suef',
  'Minya',
  'Faiyum',
  'Matrouh',
  'North Sinai',
  'South Sinai (Sharm El Sheikh)',
  'Outside Egypt (International)',
];

export default function AuthModal({ isOpen, onClose }) {
  const { brideUser, loginBride, registerBride, t, lang } = useStore();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Cairo');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim() || !phone.trim()) {
          setError(lang === 'ar' ? 'يرجى إدخال الاسم ورقم الهاتف' : 'Please provide your name and phone number');
          setLoading(false);
          return;
        }
        if (!city) {
          setError(lang === 'ar' ? 'يرجى اختيار المحافظة' : 'Please select your city');
          setLoading(false);
          return;
        }
        await registerBride({ name, phone, email, city });
      } else {
        if (!phone.trim() && !email.trim()) {
          setError(lang === 'ar' ? 'يرجى إدخال رقم الهاتف أو البريد' : 'Please enter your phone number or email');
          setLoading(false);
          return;
        }
        await loginBride(phone, email);
      }
      onClose();
    } catch (err) {
      setError(err.message || (lang === 'ar' ? 'فشل تسجيل الدخول، يرجى التأكد من البيانات' : 'Authentication failed. Please check your information.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className={styles.header}>
          <h2 className={styles.title}>
            {isRegister
              ? (lang === 'ar' ? 'إنشاء حساب عروس' : 'Create Bride Account')
              : (lang === 'ar' ? 'تسجيل دخول العروس' : 'Bride Login')}
          </h2>
          <p className={styles.subtitle}>
            {isRegister
              ? (lang === 'ar' ? 'سجلي بياناتكِ لمتابعة مواعيد البروفة وحالة فستانكِ' : 'Register your details to track your gown progress & appointments')
              : (lang === 'ar' ? 'أدخلي رقم هاتفكِ أو البريد المسجل لمتابعة فستانكِ' : 'Enter your registered phone or email to view your dress progress')}
          </p>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {isRegister && (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label}>{lang === 'ar' ? 'الاسم بالكامل' : 'Full Name'}</label>
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'مثال: سارة محمد' : 'e.g. Sarah Mitchell'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>{lang === 'ar' ? 'المحافظة / المدينة *' : 'City / Location *'}</label>
                <div className={styles.inputWrap}>
                  <MapPin size={16} className={styles.icon} />
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={styles.inputWithIcon}
                    style={{ appearance: 'none', background: '#faf8f5' }}
                    required
                  >
                    {EGYPTIAN_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>{t.contact.phonePlaceholder}</label>
            <div className={styles.inputWrap}>
              <Phone size={16} className={styles.icon} />
              <input
                type="tel"
                placeholder={lang === 'ar' ? 'مثال: 01554159359' : 'e.g. +201554159359'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={styles.inputWithIcon}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>{t.contact.emailPlaceholder}</label>
            <div className={styles.inputWrap}>
              <Mail size={16} className={styles.icon} />
              <input
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.inputWithIcon}
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              (lang === 'ar' ? 'جاري التحميل...' : 'Processing...')
            ) : isRegister ? (
              <>
                <UserPlus size={16} /> {lang === 'ar' ? 'إنشاء حساب ومتابعة' : 'REGISTER & TRACK'}
              </>
            ) : (
              <>
                <LogIn size={16} /> {lang === 'ar' ? 'تسجيل الدخول' : 'SIGN IN TO ACCOUNT'}
              </>
            )}
          </button>
        </form>

        <div className={styles.toggleFooter}>
          <span>{isRegister ? (lang === 'ar' ? 'لديكِ حساب بالفعل؟' : 'Already registered?') : (lang === 'ar' ? 'أول مرة معنا؟' : 'First time here?')}</span>
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
          >
            {isRegister ? (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In') : (lang === 'ar' ? 'إنشاء حساب جديد' : 'Create Account')}
          </button>
        </div>
      </div>
    </div>
  );
}
