import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import { useStore } from '../../context/StoreContext';
import { fetchPublicReviews } from '../../lib/api';
import styles from './Reviews.module.css';

export default function Reviews() {
  const { t, lang } = useStore();
  const [reviews, setReviews] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const sectionRef = useScrollAnimation();

  useEffect(() => {
    fetchPublicReviews().then((res) => {
      setReviews(res || []);
      setLoading(false);
    });
  }, []);

  const goTo = (index) => {
    if (reviews.length === 0) return;
    if (index < 0) setCurrent(reviews.length - 1);
    else if (index >= reviews.length) setCurrent(0);
    else setCurrent(index);
  };

  const review = reviews[current];

  return (
    <section className={`section-padding ${styles.section}`} ref={sectionRef}>
      <div className={`container ${styles.inner}`} data-animate="fade-up">
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.eyebrow}>{t.reviews.eyebrow}</span>
          <h2 className={styles.heading}>{t.reviews.title}</h2>
        </div>

        {/* Review Card */}
        {loading ? (
          <div style={{ padding: '40px text-center', color: '#999' }}>...</div>
        ) : !review ? (
          <div style={{ padding: '40px text-center', color: '#999' }}>—</div>
        ) : (
          <div className={styles.reviewWrap}>
            <button
              className={`${styles.arrow} ${styles.leftArrow}`}
              onClick={() => goTo(current - 1)}
              aria-label="Previous review"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />
            </button>

            <div className={styles.card} key={review.id}>
              <div className={styles.quoteIcon}>
                <Quote size={32} strokeWidth={1} />
              </div>

              <div className={styles.stars}>
                {Array.from({ length: review.rating || 5 }).map((_, i) => (
                  <Star key={i} size={16} fill="var(--color-accent)" color="var(--color-accent)" strokeWidth={0} />
                ))}
              </div>

              <p className={styles.text}>{review.review_text}</p>

              <div className={styles.divider} />

              <div className={styles.author}>
                <div className={styles.avatar}>
                  {review.client_name ? review.client_name.split(' ').map(n => n[0]).join('') : 'B'}
                </div>
                <div className={styles.authorInfo}>
                  <span className={styles.name}>{review.client_name}</span>
                </div>
              </div>
            </div>

            <button
              className={`${styles.arrow} ${styles.rightArrow}`}
              onClick={() => goTo(current + 1)}
              aria-label="Next review"
            >
              <ChevronRight size={20} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Dots */}
        {reviews.length > 1 && (
          <div className={styles.dots}>
            {reviews.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === current ? styles.activeDot : ''}`}
                onClick={() => setCurrent(i)}
                aria-label={`Go to review ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
