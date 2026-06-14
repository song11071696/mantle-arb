'use client';

import React from 'react';

interface ChartDataPoint {
  time: string;
  value: number;
  label?: string;
}

interface MiniChartProps {
  data: ChartDataPoint[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  title?: string;
}

export function MiniChart({ data, height = 200, color = '#0ea5e9', showGrid = true, title }: MiniChartProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  const padding = 40;
  const chartWidth = 100;
  const chartHeight = height - padding * 2;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((d.value - min) / range) * chartHeight + padding;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${chartWidth},${height}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {title && <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>}
      <svg viewBox={`0 0 ${chartWidth} ${height}`} className="w-full" style={{ height }}>
        {showGrid && (
          <g className="text-slate-200" stroke="currentColor" strokeWidth="0.5">
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = padding + pct * chartHeight;
              return <line key={pct} x1="0" y1={y} x2={chartWidth} y2={y} />;
            })}
          </g>
        )}
        <defs>
          <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={areaPoints}
          fill={`url(#gradient-${color.replace('#', '')})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * chartWidth;
          const y = chartHeight - ((d.value - min) / range) * chartHeight + padding;
          return i === data.length - 1 ? (
            <circle key={i} cx={x} cy={y} r="3" fill={color} />
          ) : null;
        })}
      </svg>
      <div className="flex justify-between mt-2 text-xs text-slate-400">
        <span>{data[0]?.time}</span>
        <span>{data[data.length - 1]?.time}</span>
      </div>
    </div>
  );
}
