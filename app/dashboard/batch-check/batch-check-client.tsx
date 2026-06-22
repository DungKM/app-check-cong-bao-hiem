'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Layers, Upload, Play, Download, X, Loader2,
  CheckCircle2, ChevronDown, ChevronUp,
  FileText, Sparkles, Clock, Database, Inbox,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Types ─────────────────────────────────────────────────────
type CanBao = { icon: string; loai: string; ct: string; cc: string; nhom_kq: string };

type FileEntry = {
  key:      string;   // unique key for de-dup
  fileName: string;
  file?:    File;     // uploaded file
  inboxId?: string;   // from inbox
};

type KetQua = {
  key:           string;
  fileName:      string;
  inboxId?:      string;
  ma_benh_an:    string;
  ho_ten:        string;
  chan_doan:     string;
  ma_benh:       string;
  ngay_vao:      string;
  ngay_ra:       string;
  so_ngay:       string;
  counts:        { thuoc: number; dvkt: number; cls: number };
  autoWarnings:  CanBao[];
  aiWarnings:    CanBao[] | null;
  tong_canh_bao: number;
  trang_thai:    'ok' | 'canh_bao' | 'loi';
  savedId?:      string;
  error?:        string;
};

// ── XML helpers ───────────────────────────────────────────────
function gEl(el: Element | null | undefined, tag: string) {
  return el?.querySelector(tag)?.textContent?.trim() || '';
}
function parseDT(s: string | undefined): Date | null {
  if (!s || s.length < 8) return null;
  const p = s.slice(0, 12).padEnd(12, '0');
  try { return new Date(+p.slice(0,4), +p.slice(4,6)-1, +p.slice(6,8), +p.slice(8,10), +p.slice(10,12)); }
  catch { return null; }
}
function fmtDate(s: string) {
  if (!s || s.length < 8) return s || '';
  const [d, m, y] = [s.slice(6,8), s.slice(4,6), s.slice(0,4)];
  const h = s.length >= 10 ? s.slice(8,10) : '';
  const mi = s.length >= 12 ? s.slice(10,12) : '';
  return h ? `${d}/${m}/${y} ${h}:${mi}` : `${d}/${m}/${y}`;
}

function parseXML(text: string) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(text, 'text/xml');
  const inn: Record<string, Document> = {};
  for (const fh of Array.from(doc.querySelectorAll('FILEHOSO'))) {
    const loai = fh.querySelector('LOAIHOSO')?.textContent?.trim();
    const nd   = fh.querySelector('NOIDUNGFILE')?.textContent?.trim();
    if (!loai || !nd) continue;
    try {
      const bin = atob(nd.replace(/\s/g, ''));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      inn[loai] = parser.parseFromString(new TextDecoder('utf-8').decode(bytes), 'text/xml');
    } catch { /* skip */ }
  }
  let info: Record<string, string> = {};
  const th = inn['XML1']?.querySelector('TONG_HOP');
  if (th) {
    info = {
      ma_loai_kcb: gEl(th,'MA_LOAI_KCB'), chan_doan: gEl(th,'CHAN_DOAN_RV'),
      ma_benh:     gEl(th,'MA_BENH_CHINH'), ngay_vao: gEl(th,'NGAY_VAO'),
      ngay_ra:     gEl(th,'NGAY_RA'),       so_ngay:  gEl(th,'SO_NGAY_DTRI'),
      ma_benh_an:  gEl(th,'MA_LK') || gEl(th,'MA_BN') || '',
      ho_ten:      gEl(th,'HO_TEN') || '',
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

function kiemTraTuDong(
  info: Record<string, string>,
  thuoc: ReturnType<typeof parseXML>['thuoc'],
  dvkt:  ReturnType<typeof parseXML>['dvkt'],
  cls:   ReturnType<typeof parseXML>['cls'],
): CanBao[] {
  const cb: CanBao[] = [];
  const vao = (info.ngay_vao || '').slice(0,8);
  if (vao && (info.ngay_ra || '').slice(0,8) === vao) {
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
        cb.push({ icon:'🔴', nhom_kq:'Tự động', loai:'Thuốc kê trước khi có KQ CLS',
          ct:`${t.ten} kê lúc ${hm(yl)}, KQ CLS lúc ${hm(muon)}`, cc:'BN ngoại trú chỉ định thuốc trước khi có KQ CLS' });
      }
    }
  }
  for (const d of dvkt)
    if ((parseFloat(d.sl)||1) > 1)
      cb.push({ icon:'🟠', nhom_kq:'Tự động', loai:'DVKT số lượng > 1',
        ct:`${d.ten} (${d.ma}) SL=${d.sl}`, cc:'Kiểm tra lý do thực hiện nhiều lần' });
  const seen: Record<string,number> = {};
  for (const d of dvkt) { const k=`${d.ma}||${(d.ngay_yl||'').slice(0,8)}`; seen[k]=(seen[k]||0)+1; }
  for (const [k,n] of Object.entries(seen)) {
    if (n < 2) continue;
    const [ma, ng] = k.split('||');
    if (ma) cb.push({ icon:'🟠', nhom_kq:'Tự động', loai:'Trùng DVKT cùng ngày',
      ct:`Mã ${ma} xuất hiện ${n} lần ngày ${fmtDate((ng+'0000').slice(0,8))}`, cc:'DVKT trùng / thực hiện đồng thời' });
  }
  const kham = dvkt.filter(d => d.nhom === '13');
  if (kham.length > 1)
    cb.push({ icon:'🟠', nhom_kq:'Tự động', loai:'Công khám nhiều lần',
      ct:`${kham.length} lần khám trong hồ sơ`, cc:'Ngoại trú thường chỉ 01 lần công khám' });
  return cb;
}

// ── Save to analyses API ──────────────────────────────────────
async function saveAnalysis(r: KetQua): Promise<string | null> {
  try {
    const payload = {
      fileName:     r.fileName,
      info:         { ma_loai_kcb:'', chan_doan: r.chan_doan, ma_benh: r.ma_benh,
                      ngay_vao: r.ngay_vao, ngay_ra: r.ngay_ra, so_ngay: r.so_ngay },
      counts:       r.counts,
      autoResults:  r.autoWarnings,
      aiResults:    r.aiWarnings,
      autoWarnings: r.autoWarnings.length,
      aiWarnings:   r.aiWarnings?.length ?? null,
      source:       'batch',
    };
    const res = await fetch('/api/analyses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id || null;
  } catch { return null; }
}

// ── Excel export ──────────────────────────────────────────────
function exportExcel(results: KetQua[]) {
  const wb = XLSX.utils.book_new();
  const summary = results.map(r => ({
    'Tên file':       r.fileName,
    'Mã bệnh án':     r.ma_benh_an || '—',
    'Họ tên':         r.ho_ten     || '—',
    'Chẩn đoán':      r.chan_doan,
    'Mã bệnh':        r.ma_benh,
    'Ngày vào':       fmtDate(r.ngay_vao),
    'Ngày ra':        fmtDate(r.ngay_ra),
    'Số ngày':        r.so_ngay,
    'Tổng cảnh báo':  r.tong_canh_bao,
    'CB tự động':     r.autoWarnings.length,
    'CB AI':          r.aiWarnings?.length ?? 'Chưa chạy',
    'Trạng thái':     r.trang_thai === 'loi' ? 'Lỗi' : r.tong_canh_bao > 0 ? 'Có cảnh báo' : 'Không phát hiện',
    'Đã lưu DB':      r.savedId ? 'Có' : 'Không',
    'Chi tiết vi phạm': [...r.autoWarnings, ...(r.aiWarnings||[])].map(w => w.loai).join('; '),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Tổng hợp');

  const details: Record<string,unknown>[] = [];
  for (const r of results) {
    for (const w of [...r.autoWarnings, ...(r.aiWarnings||[])]) {
      details.push({
        'Tên file':   r.fileName, 'Mã bệnh án': r.ma_benh_an || '—',
        'Nguồn':      w.nhom_kq,  'Loại lỗi':  w.loai,
        'Nội dung':   w.ct,       'Căn cứ':    w.cc, 'Mức độ': w.icon,
      });
    }
  }
  if (details.length > 0)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(details), 'Chi tiết cảnh báo');

  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  XLSX.writeFile(wb, `ket_qua_kiem_tra_hang_loat_${ts}.xlsx`);
}

// ── Component ─────────────────────────────────────────────────
export default function BatchCheckClient({ inboxIds = [] }: { inboxIds?: string[] }) {
  const [entries,   setEntries]   = useState<FileEntry[]>([]);
  const [withAI,    setWithAI]    = useState(false);
  const [saveDB,    setSaveDB]    = useState(true);
  const [running,   setRunning]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [loadErr,    setLoadErr]    = useState('');
  const [progress,   setProgress]   = useState({ done: 0, total: 0 });
  const [results,    setResults]    = useState<KetQua[]>([]);
  const [expanded,   setExpanded]   = useState<Set<number>>(new Set());
  const fileRef  = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  // Auto-load from inbox IDs on mount
  useEffect(() => {
    if (!inboxIds.length) return;
    setLoading(true);
    setLoadErr('');
    Promise.all(
      inboxIds.map(async (id) => {
        try {
          // Mock items: XML was pre-generated and stored in sessionStorage by the inbox page
          if (id.startsWith('mock')) {
            const cached = sessionStorage.getItem(`batch_xml_${id}`);
            if (cached) {
              sessionStorage.removeItem(`batch_xml_${id}`);
              return { key: id, fileName: `Demo_${id}.xml`, inboxId: id, _xmlContent: cached };
            }
            return { failed: true, id, reason: 'Dữ liệu demo không còn trong cache' };
          }

          const res = await fetch(`/api/xml-inbox/${id}`);
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { failed: true, id, reason: err.message || `HTTP ${res.status}` };
          }
          const { xmlContent, fileName } = await res.json();
          if (!xmlContent) return { failed: true, id, reason: 'Không có nội dung XML' };
          return { key: id, fileName: fileName || id, inboxId: id, _xmlContent: xmlContent };
        } catch {
          return { failed: true, id, reason: 'Lỗi kết nối' };
        }
      })
    ).then(raw => {
      const failed  = raw.filter((r: any) => r.failed) as { failed: true; id: string; reason: string }[];
      const valid   = raw.filter((r: any) => !r.failed) as (FileEntry & { _xmlContent: string })[];
      setEntries(valid);
      if (failed.length > 0) {
        setLoadErr(
          `${failed.length}/${inboxIds.length} hồ sơ không tải được: ` +
          failed.map(f => `"${f.id}" (${f.reason})`).join(', ')
        );
      }
      setLoading(false);
    });
  }, []); // eslint-disable-line

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const valid = Array.from(newFiles).filter(f => f.name.toLowerCase().endsWith('.xml'));
    setEntries(prev => {
      const existing = new Set(prev.map(e => e.key));
      const added = valid.map(f => ({ key: f.name, fileName: f.name, file: f } as FileEntry));
      const fresh = added.filter(e => !existing.has(e.key));
      return [...prev, ...fresh].slice(0, 100);
    });
  };

  const removeEntry = (i: number) => setEntries(prev => prev.filter((_, j) => j !== i));

  const run = async () => {
    if (entries.length === 0) return;
    abortRef.current = false;
    setRunning(true);
    setProgress({ done: 0, total: entries.length });
    setResults([]);
    setExpanded(new Set());

    const out: KetQua[] = [];

    for (let i = 0; i < entries.length; i++) {
      if (abortRef.current) break;
      const entry = entries[i];

      try {
        let text = (entry as any)._xmlContent as string | undefined;
        if (!text && entry.file) {
          text = await entry.file.text();
        }
        if (!text && entry.inboxId) {
          const res = await fetch(`/api/xml-inbox/${entry.inboxId}`);
          if (res.ok) { const d = await res.json(); text = d.xmlContent; }
        }
        if (!text) throw new Error('Không tải được nội dung XML');

        const { info, thuoc, dvkt, cls } = parseXML(text);
        const autoWarnings = kiemTraTuDong(info, thuoc, dvkt, cls);

        let aiWarnings: CanBao[] | null = null;
        if (withAI && !abortRef.current) {
          try {
            const res = await fetch('/api/gemini-check', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ info, thuoc, dvkt, cls }),
            });
            if (res.ok) {
              const data = await res.json();
              aiWarnings = (data.results || []).map((r: any) => ({
                icon:    r.nguy_co === 'cao' ? '🔴' : r.nguy_co === 'trung binh' ? '🟠' : '🟡',
                loai:    r.loai_loi || r.muc || '', ct: r.ly_do || '', cc: r.can_cu || '', nhom_kq:'AI',
              }));
            }
          } catch { /* AI error - non-blocking */ }
        }

        const tong = autoWarnings.length + (aiWarnings?.length || 0);
        const result: KetQua = {
          key: entry.key, fileName: entry.fileName, inboxId: entry.inboxId,
          ma_benh_an: info.ma_benh_an || '', ho_ten: info.ho_ten || '',
          chan_doan: info.chan_doan || '', ma_benh: info.ma_benh || '',
          ngay_vao: info.ngay_vao || '', ngay_ra: info.ngay_ra || '', so_ngay: info.so_ngay || '',
          counts: { thuoc: thuoc.length, dvkt: dvkt.length, cls: cls.length },
          autoWarnings, aiWarnings, tong_canh_bao: tong,
          trang_thai: tong > 0 ? 'canh_bao' : 'ok',
        };

        // Save to analyses DB
        if (saveDB) {
          const savedId = await saveAnalysis(result);
          result.savedId = savedId || undefined;
          // Mark inbox item as checked
          if (entry.inboxId) {
            fetch(`/api/xml-inbox/${entry.inboxId}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ info: { ma_benh: info.ma_benh, ma_loai_kcb: info.ma_loai_kcb } }),
            }).catch(() => {});
          }
        }

        out.push(result);
      } catch (e: any) {
        out.push({
          key: entry.key, fileName: entry.fileName, inboxId: entry.inboxId,
          ma_benh_an: '', ho_ten: '', chan_doan: '', ma_benh: '',
          ngay_vao: '', ngay_ra: '', so_ngay: '',
          counts: { thuoc: 0, dvkt: 0, cls: 0 },
          autoWarnings: [], aiWarnings: null, tong_canh_bao: 0,
          trang_thai: 'loi', error: e?.message || 'Lỗi xử lý file',
        });
      }

      setProgress({ done: i + 1, total: entries.length });
      setResults([...out]);
    }

    setRunning(false);
  };

  const toggle = (i: number) =>
    setExpanded(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });

  const pct        = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const doneCount  = results.filter(r => r.trang_thai === 'ok').length;
  const warnCount  = results.filter(r => r.trang_thai === 'canh_bao').length;
  const errCount   = results.filter(r => r.trang_thai === 'loi').length;
  const savedCount = results.filter(r => r.savedId).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-md">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Kiểm tra hàng loạt</h1>
            <p className="text-xs text-gray-500">Xử lý tối đa 100 hồ sơ XML trong một lần</p>
          </div>
        </div>
        {results.length > 0 && (
          <button onClick={() => exportExcel(results)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 shadow-sm">
            <Download className="h-4 w-4" /> Xuất Excel
          </button>
        )}
      </div>

      {/* Inbox loaded banner */}
      {inboxIds.length > 0 && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
          loading
            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
            : loadErr
              ? 'border-orange-200 bg-orange-50 text-orange-700'
              : 'border-green-200 bg-green-50 text-green-700'
        }`}>
          <Inbox className="h-4 w-4 shrink-0" />
          {loading
            ? <span>Đang tải {inboxIds.length} hồ sơ từ hộp thư...</span>
            : loadErr
              ? <span>{loadErr}</span>
              : <span>Đã tải {entries.length}/{inboxIds.length} hồ sơ từ hộp thư vào.</span>
          }
        </div>
      )}

      {/* Upload zone */}
      <div
        className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
      >
        <Upload className="mx-auto mb-3 h-8 w-8 text-blue-400" />
        <p className="font-semibold text-gray-700">Kéo thả hoặc click để thêm file XML</p>
        <p className="mt-1 text-xs text-gray-400">Tối đa 100 file .xml — {entries.length}/100 đã có</p>
        <input ref={fileRef} type="file" accept=".xml" multiple className="hidden"
          onChange={e => addFiles(e.target.files)} />
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-700">{entries.length} file</span>
            <button onClick={() => setEntries([])} className="text-xs text-gray-400 hover:text-red-500">Xoá tất cả</button>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
            {entries.map((e, i) => (
              <div key={e.key} className="flex items-center gap-3 px-4 py-2">
                {e.inboxId
                  ? <Inbox className="h-4 w-4 shrink-0 text-indigo-400" />
                  : <FileText className="h-4 w-4 shrink-0 text-blue-400" />
                }
                <span className="flex-1 truncate text-sm text-gray-700">{e.fileName}</span>
                {e.inboxId && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">Hộp thư</span>
                )}
                {e.file && (
                  <span className="text-xs text-gray-400">{(e.file.size / 1024).toFixed(0)} KB</span>
                )}
                <button onClick={() => removeEntry(i)} className="text-gray-300 hover:text-red-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options + Run */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={withAI} onChange={e => setWithAI(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600" />
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-semibold text-gray-700">Phân tích AI</span>
          <span className="text-xs text-gray-400">(chậm hơn, tốn API)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={saveDB} onChange={e => setSaveDB(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-green-600" />
          <Database className="h-4 w-4 text-green-500" />
          <span className="text-sm font-semibold text-gray-700">Lưu vào lịch sử</span>
        </label>
        <div className="flex-1" />
        {running ? (
          <button onClick={() => { abortRef.current = true; }}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
            <X className="h-4 w-4" /> Dừng lại
          </button>
        ) : (
          <button onClick={run} disabled={entries.length === 0 || loading}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm disabled:opacity-40">
            <Play className="h-4 w-4" /> Bắt đầu kiểm tra
          </button>
        )}
      </div>

      {/* Progress */}
      {(running || progress.done > 0) && (
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 font-semibold text-gray-700">
              {running && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
              <Clock className="h-4 w-4 text-gray-400" />
              Tiến độ: {progress.done}/{progress.total}
            </div>
            <span className="font-black text-indigo-600">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${pct}%` }} />
          </div>
          {!running && results.length > 0 && (
            <div className="flex flex-wrap gap-4 pt-1 text-xs font-semibold">
              <span className="text-green-600">✓ {doneCount} không có vấn đề</span>
              <span className="text-orange-500">⚠ {warnCount} có cảnh báo</span>
              {errCount   > 0 && <span className="text-red-500">✗ {errCount} lỗi</span>}
              {saveDB && <span className="text-blue-500">💾 {savedCount} đã lưu vào lịch sử</span>}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <span className="font-black text-gray-900">Kết quả ({results.length})</span>
            {!running && (
              <button onClick={() => exportExcel(results)}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
                <Download className="h-3.5 w-3.5" /> Xuất Excel
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {results.map((r, i) => (
              <div key={r.key}>
                <button onClick={() => toggle(i)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/60 transition-colors">
                  <span className="shrink-0 text-lg">
                    {r.trang_thai === 'loi' ? '❌' : r.tong_canh_bao > 0 ? '⚠️' : '✅'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{r.fileName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {r.chan_doan || 'Không đọc được thông tin'}
                      {r.ngay_vao && ` • Vào: ${fmtDate(r.ngay_vao)}`}
                      {r.ho_ten   && ` • ${r.ho_ten}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.tong_canh_bao > 0 && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-black text-orange-600">
                        {r.tong_canh_bao} CB
                      </span>
                    )}
                    {r.aiWarnings !== null && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-600">AI</span>
                    )}
                    {r.savedId && (
                      <span title="Đã lưu vào lịch sử">
                        <Database className="h-3.5 w-3.5 text-green-500" />
                      </span>
                    )}
                    {expanded.has(i) ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>

                {expanded.has(i) && (
                  <div className="border-t border-gray-50 bg-gray-50/50 px-4 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                      {r.ma_benh_an && <span><b>Mã bệnh án:</b> {r.ma_benh_an}</span>}
                      {r.ho_ten     && <span><b>Họ tên:</b> {r.ho_ten}</span>}
                      {r.ma_benh    && <span><b>Mã bệnh:</b> {r.ma_benh}</span>}
                      {r.so_ngay    && <span><b>Số ngày ĐT:</b> {r.so_ngay}</span>}
                      {r.counts.thuoc > 0 && <span><b>Thuốc:</b> {r.counts.thuoc} · <b>DVKT:</b> {r.counts.dvkt} · <b>CLS:</b> {r.counts.cls}</span>}
                    </div>
                    {r.error && (
                      <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{r.error}</div>
                    )}
                    {[...r.autoWarnings, ...(r.aiWarnings||[])].length === 0 && !r.error && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" /> Không phát hiện vi phạm
                      </div>
                    )}
                    <div className="space-y-2">
                      {[...r.autoWarnings, ...(r.aiWarnings||[])].map((w, j) => (
                        <div key={j} className="rounded-lg border border-gray-100 bg-white px-3 py-2.5">
                          <div className="flex items-start gap-2">
                            <span className="text-base">{w.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-gray-800">{w.loai}</span>
                                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">{w.nhom_kq}</span>
                              </div>
                              <p className="mt-0.5 text-xs text-gray-600">{w.ct}</p>
                              {w.cc && <p className="mt-0.5 text-xs text-blue-500 italic">{w.cc}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {r.savedId && (
                      <p className="text-right text-xs text-green-500 flex items-center justify-end gap-1">
                        <Database className="h-3 w-3" /> Đã lưu vào lịch sử
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
