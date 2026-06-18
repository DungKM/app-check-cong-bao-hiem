'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { LogOut, LayoutDashboard, User, ShieldCheck } from 'lucide-react';

export default function ClientNav() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-800" />;
  }

  if (session) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        <div className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5">
          <User className="h-3.5 w-3.5 text-slate-400" />
          <span className="max-w-[120px] truncate text-sm text-slate-200">
            {session.user?.name || session.user?.email}
          </span>
          {(session.user as any)?.role === 'admin' && (
            <span className="flex items-center gap-1 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </span>
          )}
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
          title="Đăng xuất"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/auth/login"
        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
      >
        Đăng nhập
      </Link>
    </div>
  );
}
