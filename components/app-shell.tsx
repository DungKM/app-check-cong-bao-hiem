import Link from 'next/link';
import { Shield } from 'lucide-react';
import ClientNav from './client-nav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 ring-1 ring-sky-500/30">
              <Shield className="h-4 w-4 text-sky-400" />
            </div>
            <span className="text-sm font-semibold">Check Cổng BH</span>
          </Link>
          <ClientNav />
        </div>
      </header>
      <div className="flex grow flex-col">{children}</div>
    </div>
  );
}
