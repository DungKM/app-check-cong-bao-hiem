'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, Search, RefreshCw, Trash2, PlayCircle,
  Loader2, FileText, Check, X, ChevronLeft, ChevronRight,
  Cpu, FolderOpen,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
type InboxItem = {
  _id: string; fileName: string; source: 'api' | 'manual';
  sourceName: string; status: 'new' | 'checked';
  uploadedBy: string; receivedAt: string;
  info: Record<string, string> | null;
};

type SourceTab = 'all' | 'api' | 'manual';

type Props = {
  onOpenCheck: (xmlContent: string, fileName: string, inboxId: string) => void;
  isAdmin: boolean;
};

// ── Mock data ──────────────────────────────────────────────
const d = (daysAgo: number, h = 8, m = 0) => {
  const dt = new Date(); dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(h, m, 0, 0); return dt.toISOString();
};

const MOCK: InboxItem[] = [
  { _id:'mock1', fileName:'HS_NGOAITRU_20260618_001.xml', source:'api', sourceName:'HIS Viện Đức Giang', status:'new',     uploadedBy:'api', receivedAt: d(0,7,12), info:{ ma_benh:'J06.9', ma_loai_kcb:'1' } },
  { _id:'mock2', fileName:'HS_NGOAITRU_20260618_002.xml', source:'api', sourceName:'HIS Viện Đức Giang', status:'new',     uploadedBy:'api', receivedAt: d(0,7,14), info:{ ma_benh:'K29.7', ma_loai_kcb:'1' } },
  { _id:'mock3', fileName:'HS_NGOAITRU_20260618_003.xml', source:'api', sourceName:'HIS Viện Đức Giang', status:'checked', uploadedBy:'api', receivedAt: d(0,7,15), info:{ ma_benh:'I10',   ma_loai_kcb:'1' } },
  { _id:'mock4', fileName:'HS_NOITRU_20260618_001.xml',   source:'api', sourceName:'Phần mềm Medipro',   status:'new',     uploadedBy:'api', receivedAt: d(0,8,30), info:{ ma_benh:'J18.9', ma_loai_kcb:'2' } },
  { _id:'mock5', fileName:'HS_NOITRU_20260618_002.xml',   source:'api', sourceName:'Phần mềm Medipro',   status:'new',     uploadedBy:'api', receivedAt: d(0,8,45), info:{ ma_benh:'N18.3', ma_loai_kcb:'2' } },
  { _id:'mock6', fileName:'BN_Nguyen_Van_A_0618.xml',     source:'manual', sourceName:'Trần Thị B',      status:'checked', uploadedBy:'b@bhyt.vn', receivedAt: d(0,9,0),  info:{ ma_benh:'E11.9', ma_loai_kcb:'1' } },
  { _id:'mock7', fileName:'HS_NGOAITRU_20260617_045.xml', source:'api', sourceName:'HIS Viện Đức Giang', status:'checked', uploadedBy:'api', receivedAt: d(1,7,5),  info:{ ma_benh:'M54.5', ma_loai_kcb:'1' } },
  { _id:'mock8', fileName:'HS_NGOAITRU_20260617_046.xml', source:'api', sourceName:'HIS Viện Đức Giang', status:'checked', uploadedBy:'api', receivedAt: d(1,7,8),  info:{ ma_benh:'K35.8', ma_loai_kcb:'1' } },
  { _id:'mock9', fileName:'HS_NOITRU_20260617_008.xml',   source:'api', sourceName:'Phần mềm Medipro',   status:'new',     uploadedBy:'api', receivedAt: d(1,8,0),  info:{ ma_benh:'I21.9', ma_loai_kcb:'2' } },
  { _id:'mock10',fileName:'BN_Le_Thi_C_manual.xml',       source:'manual', sourceName:'Nguyễn Văn D',    status:'new',     uploadedBy:'d@bhyt.vn', receivedAt: d(1,14,22), info:null },
  { _id:'mock11',fileName:'HS_NGOAITRU_20260616_112.xml', source:'api', sourceName:'HIS Viện Đức Giang', status:'checked', uploadedBy:'api', receivedAt: d(2,7,3),  info:{ ma_benh:'J45.9', ma_loai_kcb:'1' } },
  { _id:'mock12',fileName:'HS_NGOAITRU_20260616_113.xml', source:'api', sourceName:'Phần mềm Medipro',   status:'checked', uploadedBy:'api', receivedAt: d(2,7,55), info:{ ma_benh:'G43.9', ma_loai_kcb:'1' } },
];

// ── Sample XML generator ───────────────────────────────────
type SampleDef = {
  chanDoan: string; thuoc: { ten: string; ma: string; sl: string }[];
  dvkt: { ten: string; ma: string; nhom: string; sl: string }[];
  cls:  { ten: string; ma: string }[];
  soNgay: string; loaiKcb: string;
};

const SAMPLE_BY_BENH: Record<string, SampleDef> = {
  'J06.9': {
    chanDoan:'Viêm đường hô hấp trên cấp', loaiKcb:'1', soNgay:'1',
    thuoc:[ {ten:'Paracetamol 500mg',ma:'0100221',sl:'10'}, {ten:'Ambroxol 30mg',ma:'0101872',sl:'10'}, {ten:'Cetirizine 10mg',ma:'0102341',sl:'5'} ],
    dvkt:[ {ten:'Khám bệnh',ma:'01.001',nhom:'13',sl:'1'}, {ten:'Xét nghiệm công thức máu',ma:'26.004',nhom:'26',sl:'1'} ],
    cls:[ {ten:'Bạch cầu (BC)',ma:'26.004'}, {ten:'Huyết sắc tố (Hb)',ma:'26.004'} ],
  },
  'K29.7': {
    chanDoan:'Viêm dạ dày không đặc hiệu', loaiKcb:'1', soNgay:'1',
    thuoc:[ {ten:'Omeprazole 20mg',ma:'0104523',sl:'14'}, {ten:'Domperidone 10mg',ma:'0104102',sl:'14'}, {ten:'Sucralfate 1g',ma:'0104889',sl:'14'} ],
    dvkt:[ {ten:'Khám bệnh',ma:'01.001',nhom:'13',sl:'1'}, {ten:'Nội soi dạ dày',ma:'09.001',nhom:'09',sl:'1'}, {ten:'Xét nghiệm H.Pylori',ma:'26.201',nhom:'26',sl:'1'} ],
    cls:[ {ten:'H.Pylori (Rapid test)',ma:'26.201'}, {ten:'Bạch cầu (BC)',ma:'26.004'} ],
  },
  'I10': {
    chanDoan:'Tăng huyết áp nguyên phát', loaiKcb:'1', soNgay:'1',
    thuoc:[ {ten:'Amlodipine 5mg',ma:'0110234',sl:'30'}, {ten:'Losartan 50mg',ma:'0110567',sl:'30'} ],
    dvkt:[ {ten:'Khám bệnh',ma:'01.001',nhom:'13',sl:'1'}, {ten:'Đo điện tim (ECG)',ma:'17.001',nhom:'17',sl:'1'}, {ten:'Xét nghiệm Cholesterol TP',ma:'26.041',nhom:'26',sl:'1'} ],
    cls:[ {ten:'Điện tim 12 chuyển đạo',ma:'17.001'}, {ten:'Cholesterol toàn phần',ma:'26.041'} ],
  },
  'J18.9': {
    chanDoan:'Viêm phổi không đặc hiệu', loaiKcb:'2', soNgay:'7',
    thuoc:[ {ten:'Ceftriaxone 1g',ma:'0200341',sl:'7'}, {ten:'Azithromycin 500mg',ma:'0200522',sl:'5'}, {ten:'Paracetamol 1g IV',ma:'0200101',sl:'14'}, {ten:'Bromhexine 8mg',ma:'0200789',sl:'21'} ],
    dvkt:[ {ten:'Khám bệnh',ma:'01.001',nhom:'13',sl:'1'}, {ten:'X-quang ngực thẳng',ma:'28.001',nhom:'28',sl:'2'}, {ten:'Xét nghiệm CRP',ma:'26.115',nhom:'26',sl:'2'}, {ten:'Cấy đờm',ma:'26.308',nhom:'26',sl:'1'} ],
    cls:[ {ten:'X-quang ngực',ma:'28.001'}, {ten:'CRP định lượng',ma:'26.115'}, {ten:'Bạch cầu',ma:'26.004'} ],
  },
  'N18.3': {
    chanDoan:'Bệnh thận mạn giai đoạn 3', loaiKcb:'2', soNgay:'5',
    thuoc:[ {ten:'Erythropoietin 4000UI',ma:'0300112',sl:'3'}, {ten:'Calcitriol 0.25mcg',ma:'0300445',sl:'30'}, {ten:'Sevelamer 800mg',ma:'0300678',sl:'90'} ],
    dvkt:[ {ten:'Khám bệnh',ma:'01.001',nhom:'13',sl:'1'}, {ten:'Lọc máu ngoài thận',ma:'05.001',nhom:'05',sl:'3'}, {ten:'Xét nghiệm Creatinine',ma:'26.052',nhom:'26',sl:'2'}, {ten:'Siêu âm thận',ma:'22.005',nhom:'22',sl:'1'} ],
    cls:[ {ten:'Creatinine máu',ma:'26.052'}, {ten:'Ure máu',ma:'26.055'}, {ten:'Siêu âm thận-tiết niệu',ma:'22.005'} ],
  },
  'E11.9': {
    chanDoan:'Đái tháo đường type 2 không biến chứng', loaiKcb:'1', soNgay:'1',
    thuoc:[ {ten:'Metformin 500mg',ma:'0400231',sl:'60'}, {ten:'Glimepiride 2mg',ma:'0400312',sl:'30'} ],
    dvkt:[ {ten:'Khám bệnh',ma:'01.001',nhom:'13',sl:'1'}, {ten:'Xét nghiệm HbA1c',ma:'26.071',nhom:'26',sl:'1'}, {ten:'Xét nghiệm đường huyết',ma:'26.065',nhom:'26',sl:'1'}, {ten:'Xét nghiệm Lipid máu',ma:'26.042',nhom:'26',sl:'1'} ],
    cls:[ {ten:'HbA1c',ma:'26.071'}, {ten:'Glucose máu lúc đói',ma:'26.065'}, {ten:'Triglycerides',ma:'26.042'} ],
  },
  'M54.5': {
    chanDoan:'Đau thắt lưng', loaiKcb:'1', soNgay:'1',
    thuoc:[ {ten:'Diclofenac 75mg',ma:'0500123',sl:'6'}, {ten:'Thiocolchicoside 4mg',ma:'0500445',sl:'12'}, {ten:'Omeprazole 20mg',ma:'0104523',sl:'10'} ],
    dvkt:[ {ten:'Khám bệnh',ma:'01.001',nhom:'13',sl:'1'}, {ten:'X-quang cột sống thắt lưng',ma:'28.012',nhom:'28',sl:'1'}, {ten:'Vật lý trị liệu',ma:'14.001',nhom:'14',sl:'1'} ],
    cls:[ {ten:'X-quang CSTL thẳng nghiêng',ma:'28.012'} ],
  },
  'K35.8': {
    chanDoan:'Viêm ruột thừa cấp không biến chứng', loaiKcb:'2', soNgay:'4',
    thuoc:[ {ten:'Cefazolin 1g',ma:'0600234',sl:'8'}, {ten:'Metronidazole 500mg',ma:'0600567',sl:'8'}, {ten:'Paracetamol 1g IV',ma:'0200101',sl:'8'}, {ten:'Tramadol 100mg',ma:'0600891',sl:'4'} ],
    dvkt:[ {ten:'Khám bệnh',ma:'01.001',nhom:'13',sl:'1'}, {ten:'Phẫu thuật cắt ruột thừa nội soi',ma:'10.001',nhom:'10',sl:'1'}, {ten:'Siêu âm bụng',ma:'22.001',nhom:'22',sl:'1'}, {ten:'Xét nghiệm công thức máu',ma:'26.004',nhom:'26',sl:'2'} ],
    cls:[ {ten:'Siêu âm ổ bụng',ma:'22.001'}, {ten:'Bạch cầu (BC)',ma:'26.004'}, {ten:'CRP định lượng',ma:'26.115'} ],
  },
  'I21.9': {
    chanDoan:'Nhồi máu cơ tim cấp không đặc hiệu', loaiKcb:'2', soNgay:'7',
    thuoc:[ {ten:'Aspirin 100mg',ma:'0700112',sl:'7'}, {ten:'Clopidogrel 75mg',ma:'0700234',sl:'7'}, {ten:'Atorvastatin 40mg',ma:'0700445',sl:'7'}, {ten:'Enoxaparin 40mg',ma:'0700678',sl:'7'} ],
    dvkt:[ {ten:'Khám bệnh',ma:'01.001',nhom:'13',sl:'1'}, {ten:'Chụp mạch vành',ma:'18.001',nhom:'18',sl:'1'}, {ten:'Can thiệp mạch vành qua da',ma:'18.002',nhom:'18',sl:'1'}, {ten:'Đo điện tim',ma:'17.001',nhom:'17',sl:'2'}, {ten:'Xét nghiệm Troponin I',ma:'26.121',nhom:'26',sl:'3'} ],
    cls:[ {ten:'Troponin I hs',ma:'26.121'}, {ten:'CK-MB',ma:'26.122'}, {ten:'Điện tim 12 chuyển đạo',ma:'17.001'} ],
  },
  'J45.9': {
    chanDoan:'Hen phế quản không đặc hiệu', loaiKcb:'1', soNgay:'1',
    thuoc:[ {ten:'Salbutamol MDI 100mcg',ma:'0800234',sl:'1'}, {ten:'Budesonide/Formoterol 160/4.5mcg',ma:'0800567',sl:'1'}, {ten:'Montelukast 10mg',ma:'0800891',sl:'30'} ],
    dvkt:[ {ten:'Khám bệnh',ma:'01.001',nhom:'13',sl:'1'}, {ten:'Đo chức năng hô hấp',ma:'16.001',nhom:'16',sl:'1'}, {ten:'Khí dung Salbutamol',ma:'14.005',nhom:'14',sl:'2'} ],
    cls:[ {ten:'Đo chức năng hô hấp (Spirometry)',ma:'16.001'} ],
  },
  'G43.9': {
    chanDoan:'Đau nửa đầu không đặc hiệu', loaiKcb:'1', soNgay:'1',
    thuoc:[ {ten:'Sumatriptan 50mg',ma:'0900123',sl:'2'}, {ten:'Topiramate 25mg',ma:'0900345',sl:'60'}, {ten:'Metoclopramide 10mg',ma:'0900567',sl:'6'} ],
    dvkt:[ {ten:'Khám bệnh',ma:'01.001',nhom:'13',sl:'1'}, {ten:'Điện não đồ',ma:'15.001',nhom:'15',sl:'1'}, {ten:'Xét nghiệm công thức máu',ma:'26.004',nhom:'26',sl:'1'} ],
    cls:[ {ten:'Điện não đồ (EEG)',ma:'15.001'}, {ten:'Bạch cầu (BC)',ma:'26.004'} ],
  },
};

function toB64(str: string): string {
  try { return btoa(unescape(encodeURIComponent(str))); } catch { return btoa(str); }
}

function buildSampleXml(item: InboxItem): string {
  const benh  = item.info?.ma_benh   || 'J06.9';
  const loai  = item.info?.ma_loai_kcb || '1';
  const def   = SAMPLE_BY_BENH[benh] || SAMPLE_BY_BENH['J06.9'];
  const now   = new Date(item.receivedAt || new Date());
  const ymd   = now.toISOString().slice(0,10).replace(/-/g,'');
  const hm    = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  const vao   = `${ymd}${hm}00`;
  const ra    = loai === '1' ? vao : `${ymd}170000`;

  const xml1 = `<?xml version="1.0" encoding="UTF-8"?>
<DS_DICH_VU_KY_THUAT>
  <TONG_HOP>
    <MA_LOAI_KCB>${def.loaiKcb}</MA_LOAI_KCB>
    <CHAN_DOAN_RV>${def.chanDoan}</CHAN_DOAN_RV>
    <MA_BENH_CHINH>${benh}</MA_BENH_CHINH>
    <NGAY_VAO>${vao}</NGAY_VAO>
    <NGAY_RA>${ra}</NGAY_RA>
    <SO_NGAY_DTRI>${def.soNgay}</SO_NGAY_DTRI>
  </TONG_HOP>
</DS_DICH_VU_KY_THUAT>`;

  const xml2 = `<?xml version="1.0" encoding="UTF-8"?>
<DS_THUOC>
${def.thuoc.map(t => `  <CHI_TIET_THUOC>
    <TEN_THUOC>${t.ten}</TEN_THUOC>
    <MA_THUOC>${t.ma}</MA_THUOC>
    <SO_LUONG>${t.sl}</SO_LUONG>
    <NGAY_YL>${vao}</NGAY_YL>
  </CHI_TIET_THUOC>`).join('\n')}
</DS_THUOC>`;

  const xml3 = `<?xml version="1.0" encoding="UTF-8"?>
<DS_DICH_VU_KY_THUAT>
${def.dvkt.map(v => `  <CHI_TIET_DVKT>
    <TEN_DICH_VU>${v.ten}</TEN_DICH_VU>
    <MA_DICH_VU>${v.ma}</MA_DICH_VU>
    <MA_NHOM>${v.nhom}</MA_NHOM>
    <SO_LUONG>${v.sl}</SO_LUONG>
    <NGAY_YL>${vao}</NGAY_YL>
    <NGAY_KQ>${ra}</NGAY_KQ>
  </CHI_TIET_DVKT>`).join('\n')}
</DS_DICH_VU_KY_THUAT>`;

  const xml4 = `<?xml version="1.0" encoding="UTF-8"?>
<DS_CHI_SO_CLS>
${def.cls.map(c => `  <CHI_TIET_CLS>
    <TEN_CHI_SO>${c.ten}</TEN_CHI_SO>
    <MA_DICH_VU>${c.ma}</MA_DICH_VU>
    <NGAY_KQ>${ra}</NGAY_KQ>
  </CHI_TIET_CLS>`).join('\n')}
</DS_CHI_SO_CLS>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<BenhVien>
  <FILEHOSO><LOAIHOSO>XML1</LOAIHOSO><NOIDUNGFILE>${toB64(xml1)}</NOIDUNGFILE></FILEHOSO>
  <FILEHOSO><LOAIHOSO>XML2</LOAIHOSO><NOIDUNGFILE>${toB64(xml2)}</NOIDUNGFILE></FILEHOSO>
  <FILEHOSO><LOAIHOSO>XML3</LOAIHOSO><NOIDUNGFILE>${toB64(xml3)}</NOIDUNGFILE></FILEHOSO>
  <FILEHOSO><LOAIHOSO>XML4</LOAIHOSO><NOIDUNGFILE>${toB64(xml4)}</NOIDUNGFILE></FILEHOSO>
</BenhVien>`;
}

// ── Helpers ────────────────────────────────────────────────
function fmtDT(iso: string) {
  if (!iso) return '—';
  const dt = new Date(iso);
  return dt.toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function todayStr()     { return new Date().toISOString().slice(0,10); }
function yesterdayStr() { const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); }

function filterMock(items: InboxItem[], src: SourceTab, search: string, from: string, to: string) {
  return items.filter(it => {
    if (src !== 'all' && it.source !== src) return false;
    if (search && !it.fileName.toLowerCase().includes(search.toLowerCase())) return false;
    if (from && it.receivedAt < from) return false;
    if (to   && it.receivedAt.slice(0,10) > to) return false;
    return true;
  });
}

// ── Component ──────────────────────────────────────────────
export default function XmlInbox({ onOpenCheck, isAdmin }: Props) {
  const [realItems,  setRealItems]  = useState<InboxItem[]>([]);
  const [realTotal,  setRealTotal]  = useState(-1); // -1 = not loaded yet
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [err,        setErr]        = useState('');
  const [srcTab,     setSrcTab]     = useState<SourceTab>('all');
  const [search,     setSearch]     = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [actionId,   setActionId]   = useState<string | null>(null);
  const [toast,      setToast]      = useState('');
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const LIMIT = 50;

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async (pg = page) => {
    setLoading(true); setErr('');
    try {
      const params = new URLSearchParams({
        source: srcTab, page: String(pg), limit: String(LIMIT),
        ...(search   ? { search }         : {}),
        ...(dateFrom ? { from: dateFrom } : {}),
        ...(dateTo   ? { to: dateTo }     : {}),
      });
      const res = await fetch(`/api/xml-inbox?${params}`);
      if (!res.ok) throw new Error('Lỗi tải');
      const data = await res.json();
      setRealItems(data.data || []);
      setRealTotal(data.total ?? 0);
    } catch {
      setRealTotal(0); // fall through to mock
    } finally {
      setLoading(false);
    }
  }, [srcTab, search, dateFrom, dateTo, page]);

  useEffect(() => { setPage(1); load(1); }, [srcTab, dateFrom, dateTo]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load(1); };

  const setQuickDate = (type: 'today' | 'yesterday' | 'week' | 'clear') => {
    if (type === 'today')     { setDateFrom(todayStr());     setDateTo(todayStr());     }
    if (type === 'yesterday') { setDateFrom(yesterdayStr()); setDateTo(yesterdayStr()); }
    if (type === 'week')      { const d=new Date(); d.setDate(d.getDate()-6); setDateFrom(d.toISOString().slice(0,10)); setDateTo(todayStr()); }
    if (type === 'clear')     { setDateFrom(''); setDateTo(''); }
  };

  // Merge real + mock; real items take priority
  const useMock = realTotal === 0;
  const displayItems = useMock
    ? filterMock(MOCK, srcTab, search, dateFrom, dateTo)
    : realItems;
  const displayTotal = useMock ? displayItems.length : realTotal;
  const totalPages   = Math.ceil(displayTotal / LIMIT);

  const openCheck = async (item: InboxItem) => {
    if (item._id.startsWith('mock')) {
      onOpenCheck(buildSampleXml(item), item.fileName, item._id);
      return;
    }
    setActionId(item._id);
    try {
      const res = await fetch(`/api/xml-inbox/${item._id}`);
      if (!res.ok) throw new Error('Không tải được XML');
      const { xmlContent, fileName } = await res.json();
      onOpenCheck(xmlContent, fileName, item._id);
    } catch (e: any) { flash(e.message); }
    finally { setActionId(null); }
  };

  const deleteItem = async (item: InboxItem) => {
    if (item._id.startsWith('mock')) { flash('Dữ liệu demo — không thể xóa.'); return; }
    if (!confirm(`Xóa file "${item.fileName}"?`)) return;
    setActionId(item._id);
    try {
      await fetch(`/api/xml-inbox/${item._id}`, { method: 'DELETE' });
      await load(); flash('Đã xóa file.');
    } finally { setActionId(null); }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      const form = new FormData(); form.append('file', file);
      const res = await fetch('/api/xml-inbox', { method: 'POST', body: form });
      if (res.ok) ok++;
    }
    setUploading(false);
    flash(`Đã thêm ${ok}/${files.length} file vào hộp thư.`);
    setPage(1); load(1);
  };

  return (
    <div className="space-y-4">

      {/* Toast */}
      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
          ✓ {toast}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Source tabs */}
        <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1 gap-0.5">
          {([
            { key:'all'    as SourceTab, label:'Tất cả',        icon: FolderOpen },
            { key:'api'    as SourceTab, label:'Từ phần mềm',   icon: Cpu        },
            { key:'manual' as SourceTab, label:'Đẩy tay',       icon: Upload     },
          ]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setSrcTab(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                srcTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm tên file..."
              className="w-48 rounded-xl border border-gray-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            {search && (
              <button type="button" onClick={() => { setSearch(''); setPage(1); load(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <button type="submit" className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
            Tìm
          </button>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => load()} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Thêm file
          </button>
          <input ref={fileRef} type="file" accept=".xml" multiple className="hidden"
            onChange={e => handleUpload(e.target.files)} />
        </div>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-400">Lọc ngày:</span>
        {([
          { label:'Hôm nay',  action:'today'     as const },
          { label:'Hôm qua',  action:'yesterday' as const },
          { label:'7 ngày',   action:'week'      as const },
        ]).map(btn => {
          const active =
            (btn.action === 'today'     && dateFrom === todayStr()     && dateTo === todayStr()    ) ||
            (btn.action === 'yesterday' && dateFrom === yesterdayStr() && dateTo === yesterdayStr()) ||
            (btn.action === 'week'      && dateTo   === todayStr()     && dateFrom && dateFrom !== todayStr());
          return (
            <button key={btn.action} onClick={() => setQuickDate(btn.action)}
              className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                active ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}>
              {btn.label}
            </button>
          );
        })}
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500" />
        <span className="text-xs text-gray-400">→</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500" />
        {(dateFrom || dateTo) && (
          <button onClick={() => setQuickDate('clear')}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 hover:text-gray-600">
            <X className="h-3 w-3" /> Xóa lọc
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{displayTotal} file</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Đang tải...
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="h-12 w-12 text-gray-200" />
            <p className="text-sm text-gray-400">Không có file nào phù hợp bộ lọc.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Tên file</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Nguồn</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Mã bệnh / KCB</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Trạng thái</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Ngày nhận</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayItems.map(item => (
                <tr key={item._id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-gray-300" />
                      <span className="max-w-[220px] truncate font-semibold text-gray-900" title={item.fileName}>
                        {item.fileName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {item.source === 'api' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                        <Cpu className="h-3 w-3" /> {item.sourceName || 'API'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-600">
                        <Upload className="h-3 w-3" /> {item.sourceName || 'Thủ công'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-600">
                    {item.info
                      ? <span>{item.info.ma_benh || '—'} <span className="text-gray-400">· KCB {item.info.ma_loai_kcb || '—'}</span></span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {item.status === 'checked' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        <Check className="h-3 w-3" /> Đã kiểm tra
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                        Mới
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">{fmtDT(item.receivedAt)}</td>
                  <td className="px-5 py-3.5">
                    {actionId === item._id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => openCheck(item)}
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 transition">
                          <PlayCircle className="h-3.5 w-3.5" /> Kiểm tra
                        </button>
                        <button onClick={() => deleteItem(item)}
                          className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100 transition">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => { setPage(p=>p-1); load(page-1); }}
            className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">Trang {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => { setPage(p=>p+1); load(page+1); }}
            className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
