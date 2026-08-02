'use client';

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import { useStore } from '../../context/StoreContext';
import { fetchPublicFaqs } from '../../lib/api';
import styles from './Faq.module.css';

const DEFAULT_FAQS = [
  {
    id: 1,
    question: 'How do I book an appointment?',
    question_ar: 'كيف يمكنني حجز موعد؟',
    answer: 'You can book an appointment through our website by choosing your preferred date and time. We recommend booking in advance to ensure the best experience.',
    answer_ar: 'يمكنكِ حجز موعد من خلال موقعنا الإلكتروني باختيار التاريخ والوقت المفضل لديكِ. نوصي بالحجز مسبقاً لضمان أفضل تجربة.',
  },
  {
    id: 2,
    question: 'What should I bring to my appointment?',
    question_ar: 'ماذا يجب أن أحضر معي في موعد الزيارة؟',
    answer: 'We recommend bringing non-marking nude undergarments and heel heights similar to what you plan to wear on your special day.',
    answer_ar: 'نوصي بإحضار ملابس داخلية مناسبة وحذاء ذو كعب مشابه للارتفاع الذي تخططين لارتدائه في يومكِ المميز.',
  },
  {
    id: 3,
    question: 'How long is the appointment?',
    question_ar: 'كم تستغرق مدة موعد التجربة؟',
    answer: 'Our standard fitting appointment lasts for 60 minutes, giving you ample private time with our senior bridal consultant.',
    answer_ar: 'تستغرق جلسة القياس والمعاينة حوالي 60 دقيقة، مما يمنحكِ وقتاً خاصاً وكافياً مع مستشارة العرائس لدى أتيليه صوفيا.',
  },
  {
    id: 4,
    question: 'Can I bring someone with me?',
    question_ar: 'هل يمكنني إحضار مرافقين معي؟',
    answer: 'Yes! You are welcome to bring up to 2 guests to share this memorable experience with you.',
    answer_ar: 'نعم بالتأكيد! يسعدنا استقبال ما يصل إلى مرافقين اثنين لمشاركتكِ هذه اللحظات المميزة.',
  },
  {
    id: 5,
    question: 'Do you offer custom-made dresses?',
    question_ar: 'هل توفرون خدمة تصميم وتفصيل فستان خاص؟',
    answer: 'Yes, our atelier provides custom couture dress design services tailored to your specific measurements and vision.',
    answer_ar: 'نعم، يقدم أتيليه صوفيا خدمة تصميم وتفصيل الفساتين الخاصة حسب مقاساتكِ ورؤيتكِ الخاصة.',
  },
  {
    id: 6,
    question: 'What is your return or exchange policy?',
    question_ar: 'ما هي سياسة الإلغاء أو التبديل؟',
    answer: 'Our team will go over all agreement details during your appointment. Rentals and bookings are subject to atelier booking policies.',
    answer_ar: 'يقدم لكِ فريقنا كافة التفاصيل والشروط أثناء جلسة الحجز، وتخضع الحجوزات لسياسة الأتيليه المعتمدة.',
  },
  {
    id: 7,
    question: 'How far in advance should I order my dress?',
    question_ar: 'كم من الوقت قبل الزفاف يجب أن أحجز الفستان؟',
    answer: 'We recommend securing your gown 2 to 4 months prior to your wedding date to ensure perfect sizing and fitting schedules.',
    answer_ar: 'نوصي بحجز الفستان قبل 2 إلى 4 أشهر من موعد الزفاف لضمان التوقيتات المثالية لبروفات المقاس.',
  },
  {
    id: 8,
    question: 'Do you ship internationally?',
    question_ar: 'هل توفرون خدمة الشحن الخارجي؟',
    answer: 'Please contact our client relation team via WhatsApp or phone for international shipping inquiries and special logistics.',
    answer_ar: 'يرجى التواصل مع فريق خدمة العملاء عبر الواتساب أو الهاتف للاستفسار عن الشحن الدولي والتفاصيل اللوجستية.',
  },
];

export default function Faq() {
  const { t, lang } = useStore();
  const [faqs, setFaqs] = useState(DEFAULT_FAQS);
  const [openIndex, setOpenIndex] = useState(0);
  const sectionRef = useScrollAnimation();

  useEffect(() => {
    fetchPublicFaqs().then((res) => {
      if (res && res.length > 0) {
        setFaqs(res);
      }
    });
  }, []);

  const toggleItem = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  const isAr = lang === 'ar';

  return (
    <section className={`section-padding ${styles.section}`} ref={sectionRef}>
      <div className={`container ${styles.inner}`} data-animate="fade-up">
        {/* Left Side Visual Hero Box */}
        <div
          className={styles.leftBox}
          style={{ backgroundImage: `url('/images/faq.png')` }}
        >
          <div className={styles.overlay} />
          <div className={styles.leftContent}>
            <span className={styles.eyebrow}>{t.faq?.eyebrow || (isAr ? 'الأسئلة الشائعة' : 'FAQ')}</span>
            <h2 className={styles.heading}>
              {t.faq?.title || (isAr ? 'أسئلة شائعة، بإجابات واضحة' : 'Common Questions, Beautifully Answered')}
            </h2>
            <p className={styles.subtitle}>
              {t.faq?.subtitle || (isAr ? 'كل ما تحتاجين معرفته عن فساتيننا، خدماتنا، وتجربتك معنا.' : 'Everything you need to know about our gowns, services, and your experience.')}
            </p>
          </div>
        </div>

        {/* Right Side Accordion List */}
        <div className={styles.rightAccordion}>
          {faqs.map((item, idx) => {
            const isOpen = openIndex === idx;
            const numStr = String(idx + 1).padStart(2, '0') + '.';
            const qText = isAr ? (item.question_ar || item.question) : item.question;
            const aText = isAr ? (item.answer_ar || item.answer) : item.answer;

            return (
              <div
                key={item.id || idx}
                className={`${styles.accordionItem} ${isOpen ? styles.accordionItemOpen : ''}`}
              >
                <button
                  type="button"
                  className={styles.accordionHeader}
                  onClick={() => toggleItem(idx)}
                  aria-expanded={isOpen}
                >
                  <div className={styles.questionWrap}>
                    <span className={styles.num}>{numStr}</span>
                    <span className={styles.questionText}>{qText}</span>
                  </div>
                  <div className={styles.iconWrap}>
                    {isOpen ? <X size={18} strokeWidth={1.5} /> : <Plus size={18} strokeWidth={1.5} />}
                  </div>
                </button>

                {isOpen && (
                  <div className={styles.accordionBody}>
                    <p className={styles.answerText}>{aText}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
