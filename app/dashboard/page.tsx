import { getSession } from '@/lib/session';
import clientPromise from '@/lib/mongodb';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, AlertTriangle, Sparkles, Users,
  ArrowRight, Clock, TrendingUp,
} from 'lucide-react';
import { ActivityChart, WarningsChart } from '@/components/dashboard-charts';
import type { ActivityPoint, WarnPoint } from '@/components/dashboard-charts';

function dayLabel(d: Date) {
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  const isAdmin = session.user?.role === 'admin';
  const email   = session.user?.email ?? '';

  let totalHoSo = 0, totalWarn = 0, totalAI = 0, totalUsers = 0;
  let activityData: ActivityPoint[] = [];
  let warnData:     WarnPoint[]     = [];
  let recent:       any[]           = [];

  try {
    const client = await clientPromise;
    const db     = client.db();

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days: { date: Date; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      days.push({ date: d, label: dayLabel(d) });
    }
    const weekAgo = days[0].date;

    const allDocs = await db.collection('analyses')
      .find({ userEmail: email })
      .project({ autoWarnings: 1, aiWarnings: 1, autoResults: 1, createdAt: 1 })
      .toArray();

    totalHoSo = allDocs.length;
    totalWarn = allDocs.reduce((s, d) => s + (d.autoWarnings || 0) + (d.aiWarnings || 0), 0);
    totalAI   = allDocs.filter(d => d.aiWarnings != null).length;
    if (isAdmin) totalUsers = await db.collection('users').countDocuments();

    const countByDate: Record<string, number> = {};
    for (const d of allDocs) {
      if (!d.createdAt) continue;
      const dt = new Date(d.createdAt); dt.setHours(0, 0, 0, 0);
      if (dt < weekAgo) continue;
      const key = dt.toISOString();
      countByDate[key] = (countByDate[key] || 0) + 1;
    }
    activityData = days.map(({ date, label }) => ({
      label, count: countByDate[date.toISOString()] || 0,
    }));

    const iconCount: Record<string, number> = {};
    for (const d of allDocs)
      for (const r of d.autoResults || [])
        iconCount[r.icon] = (iconCount[r.icon] || 0) + 1;

    warnData = [
      { label: 'Cao',        count: iconCount['🔴'] || 0, color: '#ef4444' },
      { label: 'Trung bình', count: iconCount['🟠'] || 0, color: '#f97316' },
      { label: 'Thấp',       count: iconCount['🟡'] || 0, color: '#eab308' },
      { label: 'Thiếu TT',   count: iconCount['⚪'] || 0, color: '#9ca3af' },
    ];

    recent = await db.collection('analyses')
      .find({ userEmail: email })
      .sort({ createdAt: -1 }).limit(6)
      .project({ fileName: 1, info: 1, autoWarnings: 1, aiWarnings: 1, createdAt: 1 })
      .toArray();
  } catch { /* empty state */ }

  const warnRate = totalHoSo > 0 ? Math.round((totalWarn / totalHoSo) * 10) / 10 : 0;
  const aiRate   = totalHoSo > 0 ? Math.round((totalAI  / totalHoSo) * 100)      : 0;

  const stats = [
    {
      label: 'Hồ sơ đã phân tích',
      value: totalHoSo,
      icon: FileText,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      tag: 'tổng cộng',
      tagColor: 'text-slate-500 bg-slate-100',
      link: '/dashboard/port-check',
    },
    {
      label: 'Cảnh báo tìm thấy',
      value: totalWarn,
      icon: AlertTriangle,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-500',
      tag: warnRate > 0 ? `${warnRate}/hồ sơ` : 'chưa có',
      tagColor: totalWarn > 0 ? 'text-orange-600 bg-orange-100' : 'text-slate-400 bg-slate-100',
      link: '/dashboard/port-check',
    },
    {
      label: 'Phân tích AI',
      value: totalAI,
      icon: Sparkles,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      tag: aiRate > 0 ? `${aiRate}%` : 'chưa dùng',
      tagColor: totalAI > 0 ? 'text-purple-600 bg-purple-100' : 'text-slate-400 bg-slate-100',
      link: '/dashboard/port-check',
    },
    ...(isAdmin ? [{
      label: 'Người dùng',
      value: totalUsers,
      icon: Users,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      tag: 'tài khoản',
      tagColor: 'text-emerald-600 bg-emerald-100',
      link: '/dashboard/user-management',
    }] : []),
  ];

  const today = new Date();
  const dateStr = today.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = today.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-full bg-[#eef2f8]">

      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-200/80 px-8 py-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Hệ thống BHYT</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-gray-900">
              Tổng quan giám định
            </h1>
            <p className="mt-0.5 text-sm text-gray-400">
              Kiểm tra & đối chiếu hồ sơ · cập nhật {dateStr} lúc {timeStr}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-500">
            <Clock className="h-4 w-4 text-gray-400" />
            {dateStr}
          </div>
        </div>
      </div>

      <div className="space-y-6 p-8">

        {/* ── Stat cards ── */}
        <div className={`grid gap-4 ${stats.length === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.label} href={s.link}
                className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:shadow-md">
                {/* Tag top-right */}
                <div className="flex items-start justify-between gap-2">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}>
                    <Icon className={`h-5 w-5 ${s.iconColor}`} />
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${s.tagColor}`}>
                    {s.tag}
                  </span>
                </div>
                {/* Value */}
                <div className="mt-4">
                  <p className="text-[2.2rem] font-black leading-none tracking-tight text-gray-900 tabular-nums">
                    {s.value.toLocaleString('vi-VN')}
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-gray-500">{s.label}</p>
                </div>
                {/* Bottom accent */}
                <div className={`absolute inset-x-0 bottom-0 h-[3px] ${
                  s.iconBg.replace('bg-', 'bg-').replace('-100', '-500')
                } opacity-0 transition group-hover:opacity-100`} />
              </Link>
            );
          })}
        </div>

        {/* ── Charts ── */}
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06]">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-1.5">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="font-bold text-gray-800">Số lượt phân tích theo ngày</h2>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500">
                7 ngày gần nhất
              </span>
            </div>
            <ActivityChart data={activityData} />
          </div>
          <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06]">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-lg bg-orange-50 p-1.5">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <h2 className="font-bold text-gray-800">Phân loại cảnh báo</h2>
            </div>
            <WarningsChart data={warnData} />
          </div>
        </div>

        {/* ── Recent analyses + Quick actions ── */}
        <div className="grid gap-5 lg:grid-cols-3">

          {/* Recent table */}
          <div className="lg:col-span-2 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.06]">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-gray-100 p-1.5">
                  <Clock className="h-4 w-4 text-gray-500" />
                </div>
                <h2 className="font-bold text-gray-800">Hồ sơ phân tích gần đây</h2>
              </div>
              <Link href="/dashboard/port-check"
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition">
                Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <FileText className="h-12 w-12 text-gray-200" />
                <p className="text-sm text-gray-400">Chưa có hồ sơ nào được phân tích.</p>
                <Link href="/dashboard/port-check"
                  className="mt-1 flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                  Phân tích ngay <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80">
                  <tr>
                    {['Tên file', 'Mã bệnh', 'Cảnh báo', 'AI', 'Thời gian'].map(h => (
                      <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recent.map((r: any) => (
                    <tr key={r._id?.toString()} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                          <span className="max-w-[140px] truncate font-semibold text-gray-800">{r.fileName || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{r.info?.ma_benh || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          (r.autoWarnings || 0) > 0 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {r.autoWarnings ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {r.aiWarnings != null ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                            <Sparkles className="h-2.5 w-2.5" /> {r.aiWarnings}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-[11px] text-gray-400">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick actions / info panel */}
          <div className="space-y-4">
            <Link href="/dashboard/port-check"
              className="group flex items-start gap-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-5 shadow-md shadow-blue-500/20 transition hover:shadow-blue-500/30 hover:-translate-y-0.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-inner">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">Kiểm tra hồ sơ mới</p>
                <p className="mt-0.5 text-sm text-blue-200">Tải XML · kiểm tra tự động + AI</p>
              </div>
              <ArrowRight className="h-5 w-5 text-white/60 transition group-hover:translate-x-0.5" />
            </Link>

            {isAdmin && (
              <Link href="/dashboard/user-management"
                className="group flex items-start gap-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 shadow-md shadow-emerald-500/20 transition hover:shadow-emerald-500/30 hover:-translate-y-0.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-inner">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">Quản lý tài khoản</p>
                  <p className="mt-0.5 text-sm text-emerald-100">Tạo & phân quyền người dùng</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white/60 transition group-hover:translate-x-0.5" />
              </Link>
            )}

            {/* Tip card */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-bold text-blue-800">AI kiểm tra & cảnh báo</p>
              </div>
              <ul className="space-y-2 text-xs text-blue-700">
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                  Đối chiếu bảng MAU_CHUAN 200+ quy tắc
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                  Phát hiện thuốc kê trước kết quả CLS
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                  Cảnh báo trùng dịch vụ cùng ngày
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
