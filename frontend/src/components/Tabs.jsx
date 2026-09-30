/**
 * Tabs
 * ----
 * Segmented filter control with a sliding active indicator (shared layoutId).
 * Purely presentational: the parent owns the value and does the fetching.
 *
 *   <Tabs
 *     ariaLabel="Filter by status"
 *     value={statusFilter}
 *     onChange={setStatusFilter}
 *     items={[{ value: '', label: 'All' }, { value: 'draft', label: 'Draft' }]}
 *   />
 */

import { useId } from 'react';
import { motion } from 'motion/react';

const SPRING = { type: 'spring', bounce: 0.15, visualDuration: 0.3 };

export default function Tabs({ items, value, onChange, ariaLabel }) {
  const layoutId = useId(); // unique per Tabs instance so two on one page don't fight

  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={String(item.value)}
            type="button"
            role="tab"
            aria-selected={active}
            className={active ? 'tab active' : 'tab'}
            onClick={() => onChange(item.value)}
          >
            {active && (
              <motion.span
                layoutId={`tab-indicator-${layoutId}`}
                className="tab-indicator"
                transition={SPRING}
              />
            )}
            <span className="tab-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
