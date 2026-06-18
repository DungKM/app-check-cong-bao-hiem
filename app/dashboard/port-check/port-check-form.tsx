'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Upload, FileText, AlertTriangle, CheckCircle, Search,
  ChevronDown, ChevronUp, Sparkles, Loader2,
} from 'lucide-react';

type InboxLoad = { xmlContent: string; fileName: string; inboxId: string } | null;

// ── Helpers ────────────────────────────────────────────────
function fmtDate(s: string | undefined) {
  if (!s || s.length < 8) return s || '';
  const [d, m, y] = [s.slice(6, 8), s.slice(4, 6), s.slice(0, 4)];
  const h  = s.length >= 10 ? s.slice(8, 10)  : '';
  const mi = s.length >= 12 ? s.slice(10, 12) : '';
  return h ? `${d}/${m}/${y} ${h}:${mi}` : `${d}/${m}/${y}`;
}

function parseDT(s: string | undefined): Date | null {
  if (!s || s.length < 8) return null;
  const p = s.slice(0, 12).padEnd(12, '0');
  try {
    return new Date(+p.slice(0,4), +p.slice(4,6)-1, +p.slice(6,8), +p.slice(8,10), +p.slice(10,12));
  } catch { return null; }
}

function gEl(el: Element | null | undefined, tag: string) {
  return el?.querySelector(tag)?.textContent?.trim() || '';
}

// ── XML Parser ─────────────────────────────────────────────
function parseXML(text: string) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(text, 'text/xml');
  const inn: Record<string, Document> = {};

  for (const fh of Array.from(doc.querySelectorAll('FILEHOSO'))) {
    const loai = fh.querySelector('LOAIHOSO')?.textContent?.trim();
    const nd   = fh.querySelector('NOIDUNGFILE')?.textContent?.trim();
    if (!loai || !nd) continue;
    try {
      const bin   = atob(nd.replace(/\s/g, ''));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      inn[loai] = parser.parseFromString(new TextDecoder('utf-8').decode(bytes), 'text/xml');
    } catch { /* skip */ }
  }

  let info: Record<string, string> = {};
  const th = inn['XML1']?.querySelector('TONG_HOP');
  if (th) {
    info = {
      ma_loai_kcb: gEl(th, 'MA_LOAI_KCB'),
      chan_doan:   gEl(th, 'CHAN_DOAN_RV'),
      ma_benh:     gEl(th, 'MA_BENH_CHINH'),
      ngay_vao:    gEl(th, 'NGAY_VAO'),
      ngay_ra:     gEl(th, 'NGAY_RA'),
      so_ngay:     gEl(th, 'SO_NGAY_DTRI'),
    };
  }

  const thuoc = Array.from(inn['XML2']?.querySelectorAll('CHI_TIET_THUOC') || []).map(e => ({
    ten: gEl(e,'TEN_THUOC'), ma: gEl(e,'MA_THUOC'), sl: gEl(e,'SO_LUONG'), ngay_yl: gEl(e,'NGAY_YL'),
  }));
  const dvkt = Array.from(inn['XML3']?.querySelectorAll('CHI_TIET_DVKT') || []).map(e => ({
    ten: gEl(e,'TEN_DICH_VU'), ma: gEl(e,'MA_DICH_VU'), nhom: gEl(e,'MA_NHOM'),
    sl: gEl(e,'SO_LUONG'), ngay_yl: gEl(e,'NGAY_YL'), ngay_kq: gEl(e,'NGAY_KQ'),
  })).filter(d => d.ten || d.ma);
  const cls = Array.from(inn['XML4']?.querySelectorAll('CHI_TIET_CLS') || []).map(e => ({
    ten: gEl(e,'TEN_CHI_SO'), ma_dv: gEl(e,'MA_DICH_VU'), ngay_kq: gEl(e,'NGAY_KQ'),
  }));

  return { info, thuoc, dvkt, cls };
}

// ── Lớp A: kiểm tra tự động ────────────────────────────────
type CanBao = { icon: string; loai: string; ct: string; cc: string; nhom_kq: string };

function kiemTraTuDong(
  info: Record<string, string>,
  thuoc: ReturnType<typeof parseXML>['thuoc'],
  dvkt:  ReturnType<typeof parseXML>['dvkt'],
  cls:   ReturnType<typeof parseXML>['cls'],
): CanBao[] {
  const cb: CanBao[] = [];
  const vao = (info.ngay_vao || '').slice(0, 8);
  const ra  = (info.ngay_ra  || '').slice(0, 8);

  if (vao && ra && vao === ra) {
    const kqToday = [
      ...cls.filter(x  => (x.ngay_kq  || '').slice(0,8) === vao).map(x  => parseDT(x.ngay_kq)),
      ...dvkt.filter(x => (x.ngay_kq || '').slice(0,8) === vao).map(x => parseDT(x.ngay_kq)),
    ].filter(Boolean) as Date[];

    for (const t of thuoc) {
      const yl = parseDT(t.ngay_yl);
      if (!yl || (t.ngay_yl || '').slice(0,8) !== vao) continue;
      const sau = kqToday.filter(k => k > yl);
      if (sau.length > 0) {
        const muon = new Date(Math.max(...sau.map(d => d.getTime())));
        const hm = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        cb.push({ icon:'🔴', nhom_kq:'Tự động',
          loai: 'Thuốc kê trước khi có kết quả CLS',
          ct:   `${t.ten} kê lúc ${hm(yl)}, KQ CLS cùng ngày có lúc ${hm(muon)}`,
          cc:   'BN ngoại trú chỉ định thuốc trước khi có kết quả CLS làm căn cứ' });
      }
    }
  }

  for (const d of dvkt)
    if ((parseFloat(d.sl) || 1) > 1)
      cb.push({ icon:'🟠', nhom_kq:'Tự động',
        loai: 'Dịch vụ số lượng > 1',
        ct:   `${d.ten} (mã ${d.ma}) SL = ${d.sl}`,
        cc:   'DV/XN ngoại trú thường thực hiện 1 lần/ngày — kiểm tra lý do' });

  const seen: Record<string, number> = {};
  for (const d of dvkt) {
    const k = `${d.ma}||${(d.ngay_yl || '').slice(0,8)}`;
    seen[k] = (seen[k] || 0) + 1;
  }
  for (const [k, n] of Object.entries(seen)) {
    if (n < 2) continue;
    const [ma, ng] = k.split('||');
    if (ma) cb.push({ icon:'🟠', nhom_kq:'Tự động',
      loai: 'Trùng dịch vụ cùng ngày',
      ct:   `Mã ${ma} xuất hiện ${n} lần trong ngày ${fmtDate((ng+'0000').slice(0,8))}`,
      cc:   'Dịch vụ trùng / làm đồng thời cùng ngày y lệnh' });
  }

  const kham = dvkt.filter(d => d.nhom === '13');
  if (kham.length > 1)
    cb.push({ icon:'🟠', nhom_kq:'Tự động',
      loai: 'Công khám nhiều lần',
      ct:   `Có ${kham.length} lần khám trong hồ sơ`,
      cc:   'Đợt điều trị ngoại trú thường chỉ tính 01 lần công khám' });

  dvkt.forEach((d, i) => {
    if (!d.ten || !d.ma)
      cb.push({ icon:'⚪', nhom_kq:'Tự động',
        loai: 'Thiếu thông tin DVKT',
        ct:   `Dòng ${i+1}: tên='${d.ten}' mã='${d.ma}'`,
        cc:   'Dữ liệu thiếu — không đối chiếu được' });
  });

  return cb;
}

// ── Card colors ────────────────────────────────────────────
const CARD: Record<string, string> = {
  '🔴': 'border-red-200 bg-red-50',
  '🟠': 'border-orange-200 bg-orange-50',
  '🟡': 'border-yellow-200 bg-yellow-50',
  '🔵': 'border-blue-200 bg-blue-50',
  '🤖': 'border-purple-200 bg-purple-50',
  '⚪': 'border-gray-200 bg-gray-50',
};

const AI_ICON: Record<string, string> = {
  cao:          '🔴',
  'trung binh': '🟠',
  thap:         '🟡',
};

// ── Types ──────────────────────────────────────────────────
type ParsedData = ReturnType<typeof parseXML>;
type Tab = 'dvkt' | 'thuoc' | 'cls';
type AiResult = { muc: string; loai_loi: string; ly_do: string; can_cu: string; nguy_co: string };

// ── Component ──────────────────────────────────────────────
export default function HoSoCheckForm({
  inboxLoad,
  onInboxLoadDone,
}: {
  inboxLoad?: InboxLoad;
  onInboxLoadDone?: () => void;
}) {
  const [data,       setData]       = useState<ParsedData | null>(null);
  const [fileName,   setFileName]   = useState('');
  const [parseErr,   setParseErr]   = useState('');
  const [results,    setResults]    = useState<CanBao[] | null>(null);
  const [ratings,    setRatings]    = useState<Record<number, string>>({});
  const [tab,        setTab]        = useState<Tab>('dvkt');
  const [showTable,  setShowTable]  = useState(false);
  const [inboxId,    setInboxId]    = useState<string | null>(null);

  // Gemini state
  const [aiEnabled,  setAiEnabled]  = useState(false);
  const [model,      setModel]      = useState('gemini-2.5-flash');
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiResults,  setAiResults]  = useState<CanBao[] | null>(null);
  const [aiErr,      setAiErr]      = useState('');
  const [aiMeta,     setAiMeta]     = useState('');

  // Load from inbox when prop changes
  useEffect(() => {
    if (!inboxLoad) return;
    try {
      const parsed = parseXML(inboxLoad.xmlContent);
      setData(parsed);
      setFileName(inboxLoad.fileName);
      setInboxId(inboxLoad.inboxId);
      setResults(null); setRatings({});
      setAiResults(null); setAiErr(''); setAiMeta('');
      setSavedId(null); setSaveMsg(''); setParseErr('');
    } catch {
      setParseErr('Không đọc được XML từ hộp thư.');
    }
    onInboxLoadDone?.();
  }, [inboxLoad]); // eslint-disable-line
  // Save state
  const [savedId,    setSavedId]    = useState<string | null>(null);
  const [saveMsg,    setSaveMsg]    = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setParseErr(''); setResults(null); setRatings({});
    setAiResults(null); setAiErr(''); setAiMeta('');
    setSavedId(null); setSaveMsg(''); setInboxId(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try   { setData(parseXML(e.target?.result as string)); }
      catch { setParseErr('Không đọc được file XML. Vui lòng kiểm tra định dạng.'); }
    };
    reader.readAsText(file, 'utf-8');
  };

  const saveToDb = async (autoRes: CanBao[], aiRes: CanBao[] | null, existingId?: string | null) => {
    if (!data) return;
    const payload = {
      fileName,
      info: data.info,
      counts: { thuoc: data.thuoc.length, dvkt: data.dvkt.length, cls: data.cls.length },
      autoResults: autoRes,
      aiResults:   aiRes,
      autoWarnings: autoRes.length,
      aiWarnings:  aiRes?.length ?? null,
    };
    try {
      if (existingId) {
        await fetch(`/api/analyses?id=${existingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const res  = await fetch('/api/analyses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data2 = await res.json();
        if (data2.id) setSavedId(data2.id);
      }
      setSaveMsg('✓ Đã lưu vào Database');
      // mark inbox file as checked
      if (inboxId) {
        await fetch(`/api/xml-inbox/${inboxId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ info: data?.info }),
        }).catch(() => {});
      }
    } catch { setSaveMsg('⚠ Lưu thất bại'); }
  };

  const runAutoCheck = async () => {
    if (!data) return;
    const newResults = kiemTraTuDong(data.info, data.thuoc, data.dvkt, data.cls);
    setResults(newResults);
    setRatings({});
    setAiResults(null); setAiErr(''); setAiMeta('');
    setSavedId(null); setSaveMsg('');
    await saveToDb(newResults, null, null);
  };

  const runGemini = async () => {
    if (!data) return;
    setAiLoading(true); setAiErr(''); setAiResults(null); setAiMeta('');

    try {
      const res = await fetch('/api/gemini-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, ...data }),
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        setAiErr(json.error || 'Lỗi không xác định từ server.');
      } else {
        const mapped: CanBao[] = (json.results as AiResult[]).map(a => ({
          icon:    AI_ICON[a.nguy_co?.toLowerCase()] ?? '🤖',
          nhom_kq: 'AI (Gemini)',
          loai:    a.loai_loi || 'Nguy cơ',
          ct:      `${a.muc} — ${a.ly_do}`,
          cc:      a.can_cu || '',
        }));
        setAiResults(mapped);
        setAiMeta(`Gemini bổ sung ${mapped.length} cảnh báo · ${json.rulesRelevant}/${json.rulesTotal} quy tắc liên quan`);
        await saveToDb(results || [], mapped, savedId);
      }
    } catch (e: any) {
      setAiErr(e.message || 'Lỗi kết nối.');
    } finally {
      setAiLoading(false);
    }
  };

  const allResults = [...(results || []), ...(aiResults || [])];

  // ── empty state ──────────────────────────────────────────
  if (!data) return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Upload zone */}
        <div className="lg:col-span-3">
          <div
            className="group cursor-pointer rounded-2xl border-2 border-dashed border-blue-200 bg-white p-12 text-center
              shadow-sm transition hover:border-blue-400 hover:bg-blue-50/40"
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onDragOver={(e) => e.preventDefault()}
          >
            <input ref={inputRef} type="file" accept=".xml" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 shadow-inner group-hover:bg-blue-200 transition">
              <Upload className="h-9 w-9 text-blue-600" />
            </div>
            <p className="text-lg font-bold text-gray-800">Tải file XML hồ sơ BHYT</p>
            <p className="mt-1.5 text-sm text-gray-400">Kéo thả file vào đây hoặc nhấn để chọn</p>
            <p className="mt-1 text-xs text-gray-300">Chuẩn XML theo TTLT 09/2009 · FILEHOSO + XML1–XML4</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition group-hover:bg-blue-700">
              <Upload className="h-4 w-4" /> Chọn file XML
            </div>
          </div>
          {parseErr && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {parseErr}
            </div>
          )}
        </div>

        {/* Guide panel */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Quy trình kiểm tra</p>
          {[
            { step: '01', color: 'bg-blue-600',   icon: '📂', title: 'Tải file XML', desc: 'Chọn file hồ sơ BHYT định dạng XML chuẩn bộ y tế' },
            { step: '02', color: 'bg-orange-500', icon: '🔍', title: 'Lớp A — Tự động', desc: 'Đối chiếu ngay 5 quy tắc luật (thời điểm, trùng DV, SL...)' },
            { step: '03', color: 'bg-purple-600', icon: '🤖', title: 'Lớp B — AI Gemini', desc: 'Tra bảng MAU_CHUAN, phân tích chuyên sâu theo chẩn đoán' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.color} text-sm font-black text-white shadow-sm`}>
                {s.step}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{s.icon} {s.title}</p>
                <p className="mt-0.5 text-xs text-gray-400">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Những gì được kiểm tra</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: '⏱️', color: 'border-red-100 bg-red-50',    tc: 'text-red-700',    title: 'Thời điểm kê thuốc', desc: 'Phát hiện thuốc kê trước khi có kết quả CLS cùng ngày' },
            { icon: '🔁', color: 'border-orange-100 bg-orange-50', tc: 'text-orange-700', title: 'Trùng dịch vụ',      desc: 'Dịch vụ kỹ thuật / xét nghiệm trùng lặp cùng ngày y lệnh' },
            { icon: '📊', color: 'border-yellow-100 bg-yellow-50', tc: 'text-yellow-700', title: 'Số lượng bất thường', desc: 'DV/XN ngoại trú số lượng > 1 lần / ngày cần giải trình' },
            { icon: '📋', color: 'border-blue-100 bg-blue-50',   tc: 'text-blue-700',   title: 'Quy tắc MAU_CHUAN',  desc: 'AI đối chiếu bảng chuẩn 200+ quy tắc giảm trừ BHYT' },
          ].map(f => (
            <div key={f.title} className={`rounded-2xl border ${f.color} p-4`}>
              <p className="text-2xl">{f.icon}</p>
              <p className={`mt-2 font-semibold text-sm ${f.tc}`}>{f.title}</p>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── loaded state ──────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── File header bar ── */}
      <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 shadow">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white">{fileName}</p>
            <p className="text-xs text-blue-200">Đã tải · nhấn để đổi file</p>
          </div>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition">
          Đổi file
        </button>
        <input ref={inputRef} type="file" accept=".xml" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {/* ── Mini stat cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Thuốc',         value: data.thuoc.length, color: 'bg-blue-600',    bg: 'bg-blue-50',    tc: 'text-blue-700'    },
          { label: 'Dịch vụ KT',    value: data.dvkt.length,  color: 'bg-emerald-600', bg: 'bg-emerald-50', tc: 'text-emerald-700' },
          { label: 'Cận lâm sàng',  value: data.cls.length,   color: 'bg-violet-600',  bg: 'bg-violet-50',  tc: 'text-violet-700'  },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl ${s.bg} p-4 text-center shadow-sm ring-1 ring-black/5`}>
            <p className={`text-3xl font-black ${s.tc}`}>{s.value}</p>
            <p className="mt-1 text-xs font-medium text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Thông tin hồ sơ ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Thông tin hồ sơ</p>
        <div className="grid gap-y-2 gap-x-8 text-sm sm:grid-cols-3">
          {[
            { label: 'Loại KCB',   value: data.info.ma_loai_kcb },
            { label: 'Mã bệnh',    value: data.info.ma_benh     },
            { label: 'Số ngày ĐT', value: data.info.so_ngay     },
            { label: 'Ngày vào',   value: fmtDate(data.info.ngay_vao) },
            { label: 'Ngày ra',    value: fmtDate(data.info.ngay_ra)  },
          ].map(f => (
            <div key={f.label}>
              <span className="text-gray-400">{f.label}: </span>
              <span className="font-semibold text-gray-900">{f.value || '—'}</span>
            </div>
          ))}
        </div>
        {data.info.chan_doan && (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs italic text-gray-500">{data.info.chan_doan}</p>
        )}
      </div>

      {/* ── Bảng chi tiết ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5">
          <div className="flex">
            {(['dvkt','thuoc','cls'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`border-b-2 px-5 py-3.5 text-sm font-semibold transition ${
                  tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}>
                {t==='dvkt'  ? `Dịch vụ KT (${data.dvkt.length})`
                 :t==='thuoc' ? `Thuốc (${data.thuoc.length})`
                              : `CLS (${data.cls.length})`}
              </button>
            ))}
          </div>
          <button onClick={() => setShowTable(!showTable)}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
            {showTable ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showTable ? 'Thu gọn' : 'Xem dữ liệu'}
          </button>
        </div>

        {showTable && (
          <div className="overflow-x-auto">
            {tab === 'dvkt' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50"><tr>
                  {['Tên dịch vụ','Mã DV','Nhóm','SL','Ngày y lệnh','Ngày KQ'].map(h => (
                    <th key={h} className="px-5 py-3 font-semibold text-gray-400">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {data.dvkt.map((d,i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-900">{d.ten}</td>
                      <td className="px-5 py-3 font-mono text-gray-500">{d.ma}</td>
                      <td className="px-5 py-3 text-gray-500">{d.nhom}</td>
                      <td className={`px-5 py-3 font-bold ${parseFloat(d.sl)>1?'text-orange-600':'text-gray-700'}`}>{d.sl}</td>
                      <td className="px-5 py-3 text-gray-500">{fmtDate(d.ngay_yl)}</td>
                      <td className="px-5 py-3 text-gray-500">{fmtDate(d.ngay_kq)}</td>
                    </tr>
                  ))}
                  {!data.dvkt.length && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-300">Không có dữ liệu</td></tr>}
                </tbody>
              </table>
            )}
            {tab === 'thuoc' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50"><tr>
                  {['Tên thuốc','Mã thuốc','Số lượng','Ngày y lệnh'].map(h => (
                    <th key={h} className="px-5 py-3 font-semibold text-gray-400">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {data.thuoc.map((t,i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-900">{t.ten}</td>
                      <td className="px-5 py-3 font-mono text-gray-500">{t.ma}</td>
                      <td className="px-5 py-3 text-gray-700">{t.sl}</td>
                      <td className="px-5 py-3 text-gray-500">{fmtDate(t.ngay_yl)}</td>
                    </tr>
                  ))}
                  {!data.thuoc.length && <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-300">Không có dữ liệu</td></tr>}
                </tbody>
              </table>
            )}
            {tab === 'cls' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50"><tr>
                  {['Tên chỉ số','Mã DV','Ngày KQ'].map(h => (
                    <th key={h} className="px-5 py-3 font-semibold text-gray-400">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {data.cls.map((c,i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-900">{c.ten}</td>
                      <td className="px-5 py-3 font-mono text-gray-500">{c.ma_dv}</td>
                      <td className="px-5 py-3 text-gray-500">{fmtDate(c.ngay_kq)}</td>
                    </tr>
                  ))}
                  {!data.cls.length && <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-300">Không có dữ liệu</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Action bar ── */}
      <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <button onClick={runAutoCheck}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow transition hover:bg-blue-700 hover:shadow-md">
          <Search className="h-4 w-4" /> Kiểm tra luật tự động (Lớp A)
        </button>
        {saveMsg && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle className="h-4 w-4" /> {saveMsg}
          </span>
        )}
      </div>

      {/* ── Kết quả Lớp A ── */}
      {results !== null && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-black text-white text-sm shadow-sm ${
              results.length === 0 ? 'bg-emerald-500' : 'bg-orange-500'
            }`}>A</div>
            <div>
              <p className="font-bold text-gray-800">Lớp A — Kiểm tra tự động</p>
              <p className="text-xs text-gray-400">
                {results.length === 0 ? 'Không phát hiện vi phạm' : `${results.length} cảnh báo cần xem xét`}
              </p>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <CheckCircle className="h-6 w-6 shrink-0 text-emerald-500" />
              <div>
                <p className="font-semibold text-emerald-800">Không phát hiện vi phạm tự động</p>
                <p className="text-xs text-emerald-600">Tất cả 5 quy tắc kiểm tra đều đạt</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((it, i) => (
                <ResultCard key={i} it={it} idx={i} ratings={ratings} setRatings={setRatings} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Lớp B: Gemini AI ── */}
      {results !== null && (
        <div className="overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm">
          <label className="flex cursor-pointer items-center justify-between px-5 py-4 hover:bg-purple-50/40 transition select-none">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 font-black text-white text-sm shadow-sm">B</div>
              <div>
                <p className="font-bold text-gray-800">Lớp B — Phân tích AI (Gemini)</p>
                <p className="text-xs text-gray-400">Tra bảng MAU_CHUAN · đối chiếu chuyên sâu</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {aiEnabled && (
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">Bật</span>
              )}
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={aiEnabled}
                  onChange={e => { setAiEnabled(e.target.checked); if (!e.target.checked) { setAiResults(null); setAiErr(''); setAiMeta(''); }}} />
                <div className={`h-6 w-11 rounded-full transition-colors ${aiEnabled ? 'bg-purple-600' : 'bg-gray-200'}`} />
                <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${aiEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </label>

          {aiEnabled && (
            <div className="border-t border-purple-100 bg-purple-50/30 px-5 py-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <select value={model} onChange={e => setModel(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 shadow-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20">
                  <option value="gemini-2.5-flash">gemini-2.5-flash (khuyên dùng)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                </select>
                <button onClick={runGemini} disabled={aiLoading}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-purple-700 disabled:opacity-60">
                  {aiLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang phân tích...</>
                    : <><Sparkles className="h-4 w-4" /> Phân tích với Gemini</>}
                </button>
                {aiMeta && <p className="text-xs font-medium text-purple-600">✓ {aiMeta}</p>}
              </div>

              {aiErr && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <pre className="whitespace-pre-wrap font-sans text-xs">{aiErr}</pre>
                </div>
              )}

              {aiResults !== null && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-purple-600">
                    {aiResults.length === 0 ? 'Gemini: không phát hiện thêm nguy cơ' : `Gemini bổ sung ${aiResults.length} cảnh báo`}
                  </p>
                  {aiResults.map((it, i) => (
                    <ResultCard key={`ai-${i}`} it={it}
                      idx={allResults.length - aiResults.length + i}
                      ratings={ratings} setRatings={setRatings} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {allResults.length > 0 && (
        <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-400">
          ⚠️ Công cụ hỗ trợ đối chiếu, không thay thế quyết định giám định viên.
          Lớp A kiểm tra điều kiện rõ ràng · Lớp B tra bảng quy tắc chuẩn.
        </p>
      )}
    </div>
  );
}

// ── Card cảnh báo ──────────────────────────────────────────
function ResultCard({
  it, idx, ratings, setRatings,
}: {
  it: { icon: string; loai: string; ct: string; cc: string; nhom_kq: string };
  idx: number;
  ratings: Record<number, string>;
  setRatings: React.Dispatch<React.SetStateAction<Record<number, string>>>;
}) {
  const cardCls = CARD[it.icon] || 'border-gray-200 bg-gray-50';
  return (
    <div className={`rounded-xl border p-4 ${cardCls}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base leading-none">{it.icon}</span>
            <span className="text-sm font-semibold text-gray-900">{it.loai}</span>
            <span className="rounded-full border border-gray-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              {it.nhom_kq}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-800">{it.ct}</p>
          {it.cc && (
            <p className="mt-1 text-xs text-gray-500">
              <span className="font-medium">Căn cứ:</span> {it.cc}
            </p>
          )}
        </div>
        <select
          value={ratings[idx] || ''}
          onChange={(e) => setRatings(prev => ({ ...prev, [idx]: e.target.value }))}
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 shadow-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        >
          <option value="">Đánh giá</option>
          <option value="dung">✅ Đúng</option>
          <option value="sai">❌ Sai</option>
        </select>
      </div>
    </div>
  );
}

