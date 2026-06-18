'use client';

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

export type ActivityPoint = { label: string; count: number };
export type WarnPoint    = { label: string; count: number; color: string };

function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex h-44 items-center justify-center text-sm text-gray-400">{msg}</div>
  );
}

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  if (!data.length) return <Empty msg="Chưa có dữ liệu" />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
          formatter={(v) => [`${v}`, 'Hồ sơ']}
        />
        <Area
          type="monotone" dataKey="count"
          stroke="#2563eb" strokeWidth={2.5}
          fill="url(#blueGrad)" dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function WarningsChart({ data }: { data: WarnPoint[] }) {
  if (!data.length || data.every(d => d.count === 0)) return <Empty msg="Chưa có cảnh báo" />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
          formatter={(v) => [`${v}`, 'Cảnh báo']}
        />
        <Bar dataKey="count" radius={[5, 5, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
