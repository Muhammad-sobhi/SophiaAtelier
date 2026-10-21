'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Muted looping preview video that downloads only once it nears the viewport,
 * and plays only while visible (offscreen cards, carousels and closed drawers stay idle).
 */
export default function LazyVideo({ src, ...props }) {
  const ref = useRef(null);
  const visible = useRef(false);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const loadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          loadObserver.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    const playObserver = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      if (entry.isIntersecting) el.play().catch(() => {});
      else el.pause();
    });

    loadObserver.observe(el);
    playObserver.observe(el);
    return () => {
      loadObserver.disconnect();
      playObserver.disconnect();
    };
  }, []);

  // The src is attached after the observers fire, and a card's carousel can swap it; start it while on screen
  useEffect(() => {
    if (near && visible.current) ref.current?.play().catch(() => {});
  }, [near, src]);

  return (
    <video
      ref={ref}
      src={near ? src : undefined}
      muted
      loop
      playsInline
      preload="none"
      {...props}
    />
  );
}
