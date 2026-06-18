'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, FileSearch, Users, LogOut,
  ShieldCheck, Sparkles, ChevronRight,
} from 'lucide-react';

type Props = { role: string; name: string; email: string };

const SECTIONS = [
  {
    title: 'ĐIỀU HÀNH',
    items: [
      { href: '/dashboard',            label: 'Tổng quan',       icon: LayoutDashboard },
      { href: '/dashboard/port-check', label: 'Kiểm tra hồ sơ', icon: FileSearch },
    ],
  },
];

const ADMIN_SECTION = {
  title: 'QUẢN TRỊ',
  items: [
    { href: '/dashboard/user-management', label: 'Người dùng', icon: Users },
  ],
};

export default function SidebarNav({ role, name, email }: Props) {
  const pathname = usePathname();
  const isAdmin  = role === 'admin';

  const sections = isAdmin ? [...SECTIONS, ADMIN_SECTION] : SECTIONS;

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col"
      style={{ background: 'linear-gradient(180deg,#0d1b2e 0%,#0f2240 100%)' }}>

      {/* ── Brand ── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-900/40">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-black text-white tracking-tight">BHYT Giám Định</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400/80">Chống xuất toán</p>
        </div>
      </div>

      {/* ── Nav sections ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map(section => (
          <div key={section.title}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link key={href} href={href}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      active
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                        : 'text-slate-400 hover:bg-white/8 hover:text-white'
                    }`}>
                    <Icon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                      active ? 'text-white' : 'text-slate-500'
                    }`} />
                    <span className="flex-1">{label}</span>
                    {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Trợ lý AI ── */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/60">
            <Sparkles className="h-4 w-4 text-blue-200" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Trợ lý AI</p>
            <p className="text-[10px] text-blue-400">hỏi đáp · phân tích</p>
          </div>
          <span className="rounded-full bg-blue-600/50 px-2 py-0.5 text-[10px] font-semibold text-blue-200">
            bật
          </span>
        </div>
      </div>

      {/* ── User ── */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-white/5 transition-colors">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white shadow">
            {(name || email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{name || email}</p>
            <p className="text-[10px] text-slate-500">
              Quyền: {isAdmin ? 'Quản trị viên' : 'Người dùng'}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            title="Đăng xuất"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-red-500/20 hover:text-red-400 transition-colors">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
