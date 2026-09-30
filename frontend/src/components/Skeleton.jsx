/**
 * Skeleton loaders
 * ----------------
 * Placeholder shapes shown while real data is loading, so the layout does
 * not jump when the data arrives. Driven ONLY by each page's real `loading`
 * state — never by timers.
 *
 * Adapted from Motion's "Skeleton Shimmer" example:
 *   - kept:    the Bone primitive (gradient sliding via backgroundPosition)
 *   - dropped: View Transitions wipe (Chrome-only/experimental), dark-theme
 *              colours, demo profile card, fake timer + Reload button
 *   - added:   prefers-reduced-motion → static bones, table/dashboard layouts
 *
 * The shimmer loops only while the skeleton is mounted (i.e. while loading),
 * replacing the spinner, which also looped. It is the only looping motion
 * in the app.
 */

import { motion, useReducedMotion } from 'motion/react';

const BONE_BASE = '#e9edf2';
const BONE_HIGHLIGHT = '#f6f8fa';
const SHIMMER_GRADIENT = `linear-gradient(90deg, ${BONE_BASE} 25%, ${BONE_HIGHLIGHT} 50%, ${BONE_BASE} 75%)`;
const SHIMMER_DURATION = 1.5;

/** A single shimmering shape. width/height accept numbers (px) or CSS strings. */
export function Bone({ width = '100%', height = 14, radius = 6, style }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      animate={reduceMotion ? undefined : { backgroundPosition: ['-200% 0', '200% 0'] }}
      transition={{ duration: SHIMMER_DURATION, ease: 'easeInOut', repeat: Infinity }}
      style={{
        width,
        height,
        borderRadius: radius,
        background: reduceMotion ? BONE_BASE : SHIMMER_GRADIENT,
        backgroundSize: '200% 100%',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/**
 * Table-shaped skeleton. Drop it where the <table> would render.
 * `columns` should match the real table so column widths feel right.
 */
export function TableSkeleton({ rows = 6, columns = 5 }) {
  // Vary bone widths per column so it doesn't look like a grid of bricks
  const widths = ['70%', '85%', '55%', '45%', '60%', '50%', '40%', '65%'];
  return (
    <div className="table-wrapper" role="status" aria-label="Loading">
      <table>
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, c) => (
              <th key={c}><Bone width="50%" height={10} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c}><Bone width={widths[(r + c) % widths.length]} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Mirrors the Dashboard: 7 KPI cards + wide table card + narrow side column. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard">
      <div className="stats-grid">
        {Array.from({ length: 7 }).map((_, i) => (
          <div className="stat-card" key={i}>
            <Bone width={44} height={44} radius={10} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <Bone width="45%" height={22} />
              <Bone width="70%" height={11} />
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header"><Bone width={180} height={14} /></div>
          <TableSkeleton rows={5} columns={5} />
        </div>
        <div>
          <div className="card">
            <div className="card-header"><Bone width={130} height={14} /></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Bone height={40} radius={8} />
              <Bone height={40} radius={8} />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><Bone width={110} height={14} /></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Bone height={34} radius={6} />
              <Bone height={34} radius={6} />
              <Bone height={34} radius={6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mirrors Reports: alerts table + two chart cards + summary table. */
export function ReportsSkeleton() {
  return (
    <div role="status" aria-label="Loading reports">
      <div className="card">
        <div className="card-header"><Bone width={150} height={14} /></div>
        <TableSkeleton rows={4} columns={6} />
      </div>
      <div className="charts-grid">
        {[0, 1].map((i) => (
          <div className="chart-container" key={i}>
            <Bone width={200} height={14} style={{ marginBottom: 16 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Bone width="80%" height={22} radius={4} />
              <Bone width="55%" height={22} radius={4} />
              <Bone width="65%" height={22} radius={4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
