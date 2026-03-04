import { useEffect, useRef } from 'react';
import { useMotionValue, useInView, useTransform, motion, animate } from 'framer-motion';

export function NumberTicker({
  value,
  direction = 'up',
  delay = 0,
  decimalPlaces = 0,
  className = '',
  duration = 1.4,
}) {
  const ref = useRef(null);
  const motionValue = useMotionValue(direction === 'down' ? value : 0);
  const isInView = useInView(ref, { once: true, margin: '0px' });

  useEffect(() => {
    if (!isInView) return;
    const target = direction === 'down' ? 0 : value;
    const timer = setTimeout(() => {
      const controls = animate(motionValue, target, {
        duration,
        ease: [0.16, 1, 0.3, 1], // fast-out ease — reaches ~95% quickly
      });
      return controls.stop;
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [isInView, value, direction, delay, duration, motionValue]);

  const displayValue = useTransform(motionValue, (latest) => {
    return Intl.NumberFormat('en-IN', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(latest.toFixed(decimalPlaces)));
  });

  return (
    <motion.span className={className} ref={ref}>
      {displayValue}
    </motion.span>
  );
}
