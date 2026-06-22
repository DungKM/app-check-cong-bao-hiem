import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import QuyTacClient from './quy-tac-client';

export default async function QuyTacPage() {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  if (session.user?.role !== 'admin') {
    return (
      <main className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <h1 className="text-lg font-semibold text-gray-900">Truy cập bị từ chối</h1>
          <p className="mt-1 text-sm text-gray-500">Chỉ admin mới có quyền truy cập trang này.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <QuyTacClient />
    </main>
  );
}
