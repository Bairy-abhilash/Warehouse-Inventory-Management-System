/**
 * AnimatedNumber
 * --------------
 * Counts from the previous value to the new one (one-shot, ~0.8 s).
 * Only ever displays real numbers passed in from the backend.
 *
 *   <AnimatedNumber value={stats.total_products} />
 *   <AnimatedNumber value={stats.inventory_value} format={fmtCurrency} />
 *
 * Respects prefers-reduced-motion (renders the final value immediately).
 */

import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

const defaultFormat = (n) => new Intl.NumberFormat('en-IN').format(Math.round(n));

export default function AnimatedNumber({ value, format = defaultFormat, duration = 0.8 }) {
  const target = Number(value) || 0;
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? target : 0);
  const fromRef = useRef(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(target);
      fromRef.current = target;
      return undefined;
    }
    const controls = animate(fromRef.current, target, {
      duration,
      ease: [0.22, 1, 0.36, 1], // ease-out: fast start, settles gently
      onUpdate: (v) => setDisplay(v),
      onComplete: () => { fromRef.current = target; },
    });
    return () => controls.stop();
  }, [target, duration, reduceMotion]);

  return <span>{format(display)}</span>;
}
