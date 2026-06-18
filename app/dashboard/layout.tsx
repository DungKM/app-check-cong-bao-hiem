import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import SidebarNav from '@/components/sidebar-nav';
import Chatbot from '@/components/chatbot';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="flex h-screen bg-[#eef2f8]">
      <SidebarNav
        role={session.user?.role || 'user'}
        name={session.user?.name || ''}
        email={session.user?.email || ''}
      />
      <div className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </div>
      <Chatbot />
    </div>
  );
}
