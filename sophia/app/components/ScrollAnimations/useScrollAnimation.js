'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom hook: attaches an IntersectionObserver to animate child elements
 * that carry the [data-animate] attribute.
 */
export function useScrollAnimation({ threshold = 0.15, rootMargin = '0px' } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    const observeTargets = () => {
      const targets = el.querySelectorAll('[data-animate]');
      targets.forEach((t) => {
        if (!t.classList.contains('is-visible')) {
          observer.observe(t);
        }
      });
    };

    observeTargets();

    const mutationObserver = new MutationObserver(() => {
      observeTargets();
    });

    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [threshold, rootMargin]);

  return ref;
}

/**
 * TextReveal — word-by-word heading reveal
 */
export function TextReveal({ text, Tag = 'h2', className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const words = el.querySelectorAll('.text-reveal-word');
          words.forEach((w, i) => {
            setTimeout(() => w.classList.add('is-visible'), i * 120);
          });
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const words = text.split(' ');

  return (
    <Tag ref={ref} className={className}>
      {words.map((word, i) => (
        <span key={i} className="text-reveal-word" style={{ marginRight: '0.3em' }}>
          {word}
        </span>
      ))}
    </Tag>
  );
}
