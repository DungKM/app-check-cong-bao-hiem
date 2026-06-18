'use client';

import { useState, useEffect } from 'react';
import { FileText, AlertTriangle, Sparkles, ChevronDown, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';

type CanBao = { icon: string; loai: string; ct: string; cc: string; nhom_kq: string };
type Analysis = {
  _id: string;
  fileName: string;
  info: Record<string, string>;
  counts: { thuoc: number; dvkt: number; cls: number };
  autoWarnings: number;
  aiWarnings: number | null;
  autoResults: CanBao[];
  aiResults: CanBao[] | null;
  createdAt: string;
};

const CARD: Record<string, string> = {
  '🔴': 'border-red-200 bg-red-50',
  '🟠': 'border-orange-200 bg-orange-50',
  '🟡': 'border-yellow-200 bg-yellow-50',
  '🤖': 'border-purple-200 bg-purple-50',
  '⚪': 'border-gray-200 bg-gray-50',
};

function fmtDate(s: string | undefined) {
  if (!s || s.length < 8) return '—';
  return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
}

export default function AnalysesHistory() {
  const [list,     setList]     = useState<Analysis[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/analyses?limit=50');
      if (!res.ok) throw new Error('Lỗi tải dữ liệu');
      setList(await res.json());
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-400">
      <Loader2 className="h-5 w-5 animate-spin" /> Đang tải...
    </div>
  );

  if (err) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">{err}</div>
  );

  if (!list.length) return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <FileText className="h-12 w-12 text-gray-200" />
      <p className="text-sm text-gray-400">Chưa có hồ sơ nào được lưu.</p>
      <p className="text-xs text-gray-300">Kiểm tra hồ sơ ở tab <b>Phân tích mới</b> để bắt đầu.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{list.length} hồ sơ đã phân tích</p>
        <button onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
          <RefreshCw className="h-3.5 w-3.5" /> Làm mới
        </button>
      </div>

      {/* List */}
      {list.map((a) => {
        const isOpen = expanded === a._id;
        const totalW = (a.autoWarnings || 0) + (a.aiWarnings || 0);
        return (
          <div key={a._id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Row header */}
            <button className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/80 transition"
              onClick={() => setExpanded(isOpen ? null : a._id)}>
              {/* Icon */}
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                totalW > 0 ? 'bg-orange-100' : 'bg-emerald-100'
              }`}>
                <FileText className={`h-5 w-5 ${totalW > 0 ? 'text-orange-600' : 'text-emerald-600'}`} />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">{a.fileName || 'Không tên'}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                  <span>Loại KCB: <b className="text-gray-600">{a.info?.ma_loai_kcb || '—'}</b></span>
                  <span>Mã bệnh: <b className="text-gray-600">{a.info?.ma_benh || '—'}</b></span>
                  <span>Vào: {fmtDate(a.info?.ngay_vao)}</span>
                  <span>Thuốc: {a.counts?.thuoc ?? '—'} · DVKT: {a.counts?.dvkt ?? '—'} · CLS: {a.counts?.cls ?? '—'}</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex shrink-0 items-center gap-2">
                {(a.autoWarnings || 0) > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
                    <AlertTriangle className="h-3 w-3" /> {a.autoWarnings}
                  </span>
                )}
                {a.aiWarnings != null && (
                  <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                    <Sparkles className="h-3 w-3" /> {a.aiWarnings}
                  </span>
                )}
                {totalW === 0 && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    ✓ Sạch
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {a.createdAt ? new Date(a.createdAt).toLocaleDateString('vi-VN') : '—'}
                </span>
                {isOpen
                  ? <ChevronDown className="h-4 w-4 text-gray-400" />
                  : <ChevronRight className="h-4 w-4 text-gray-400" />}
              </div>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                {/* Chẩn đoán */}
                {a.info?.chan_doan && (
                  <p className="text-sm italic text-gray-500">
                    <span className="not-italic font-medium text-gray-600">Chẩn đoán:</span> {a.info.chan_doan}
                  </p>
                )}

                {/* Auto results */}
                {(a.autoResults?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lớp A — Tự động ({a.autoResults.length})</p>
                    {a.autoResults.map((r, i) => (
                      <div key={i} className={`rounded-xl border p-3 ${CARD[r.icon] || 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-start gap-2">
                          <span className="text-sm">{r.icon}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{r.loai}</p>
                            <p className="mt-0.5 text-xs text-gray-700">{r.ct}</p>
                            {r.cc && <p className="mt-0.5 text-xs text-gray-400"><b>Căn cứ:</b> {r.cc}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI results */}
                {(a.aiResults?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-500">Lớp B — AI Gemini ({a.aiResults!.length})</p>
                    {a.aiResults!.map((r, i) => (
                      <div key={i} className={`rounded-xl border p-3 ${CARD[r.icon] || 'border-purple-200 bg-purple-50'}`}>
                        <div className="flex items-start gap-2">
                          <span className="text-sm">{r.icon}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{r.loai}</p>
                            <p className="mt-0.5 text-xs text-gray-700">{r.ct}</p>
                            {r.cc && <p className="mt-0.5 text-xs text-gray-400"><b>Căn cứ:</b> {r.cc}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {totalW === 0 && (
                  <p className="text-center text-sm text-emerald-600 py-2">✓ Không phát hiện cảnh báo</p>
                )}

                <p className="text-right text-xs text-gray-300">
                  Phân tích lúc {a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN') : '—'}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
