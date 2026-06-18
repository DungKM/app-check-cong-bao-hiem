'use client';

import { useState, useEffect } from 'react';
import { FilePlus, History, Inbox } from 'lucide-react';
import HoSoCheckForm from './port-check-form';
import AnalysesHistory from './analyses-history';
import XmlInbox from './xml-inbox';
import { useSession } from 'next-auth/react';

type Tab = 'new' | 'inbox' | 'history';

type InboxLoad = { xmlContent: string; fileName: string; inboxId: string } | null;

export default function HoSoCheckPage() {
  const [tab,       setTab]       = useState<Tab>('inbox');
  const [inboxLoad, setInboxLoad] = useState<InboxLoad>(null);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t === 'history') setTab('history');
      if (t === 'inbox')   setTab('inbox');
    }
  }, []);

  const handleOpenFromInbox = (xmlContent: string, fileName: string, inboxId: string) => {
    setInboxLoad({ xmlContent, fileName, inboxId });
    setTab('new');
  };

  const handleInboxLoadDone = () => setInboxLoad(null);

  const TABS = [
    { key: 'inbox'   as Tab, label: 'Hộp thư XML',     icon: Inbox    },
    { key: 'new'     as Tab, label: 'Phân tích mới',   icon: FilePlus },
    { key: 'history' as Tab, label: 'Lịch sử',         icon: History  },
  ];

  return (
    <div className="min-h-full bg-[#eef2f8]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Kiểm tra hồ sơ</p>
          <h1 className="mt-0.5 text-2xl font-black tracking-tight text-gray-900">
            Kiểm tra hồ sơ BHYT
          </h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Phân tích XML · phát hiện nguy cơ xuất toán tự động và qua AI
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-0.5">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-t-xl px-5 py-2.5 text-sm font-semibold transition ${
                tab === key
                  ? 'bg-[#eef2f8] text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}>
              <Icon className="h-4 w-4" /> {label}
              {key === 'inbox' && (
                <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                  mới
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-8">
        {tab === 'new' && (
          <HoSoCheckForm
            inboxLoad={inboxLoad}
            onInboxLoadDone={handleInboxLoadDone}
          />
        )}
        {tab === 'inbox' && (
          <XmlInbox onOpenCheck={handleOpenFromInbox} isAdmin={isAdmin} />
        )}
        {tab === 'history' && <AnalysesHistory />}
      </div>
    </div>
  );
}
