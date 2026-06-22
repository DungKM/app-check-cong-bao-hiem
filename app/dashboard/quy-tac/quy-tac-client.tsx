'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ListChecks, Plus, Trash2, Pencil, Upload, RefreshCw,
  Loader2, X, Search, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight,
  FileSpreadsheet, AlertTriangle, CheckCircle2,
} from 'lucide-react';

type QuyTac = {
  _id: string;
  stt: number;
  nhom: string;
  ma: string;
  ten_chi_phi: string;
  can_cu: string;
  co_so_thanh_toan: string;
  quy_tac_giam_tru: string;
  loai_xu_ly: 'fixed' | 'ai';
  active: boolean;
  createdAt?: string;
};

type FormData = Omit<QuyTac, '_id' | 'createdAt'>;

const INIT_FORM: FormData = {
  stt: 0, nhom: '', ma: '', ten_chi_phi: '', can_cu: '',
  co_so_thanh_toan: '', quy_tac_giam_tru: '', loai_xu_ly: 'ai', active: true,
};

const LOAI_LABELS: Record<string, string> = { fixed: 'Cố định (Code)', ai: 'AI xử lý' };
const LOAI_COLORS: Record<string, string> = {
  fixed: 'bg-purple-100 text-purple-700',
  ai:    'bg-blue-100 text-blue-700',
};

export default function QuyTacClient() {
  const [items,    setItems]    = useState<QuyTac[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [nhomList, setNhomList] = useState<string[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  // filters
  const [search,     setSearch]     = useState('');
  const [filterNhom, setFilterNhom] = useState('');
  const [filterLoai, setFilterLoai] = useState('');

  // modal
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editItem,    setEditItem]    = useState<QuyTac | null>(null);
  const [form,        setForm]        = useState<FormData>(INIT_FORM);
  const [formErr,     setFormErr]     = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // import
  const [importing,  setImporting]  = useState(false);
  const [importMsg,  setImportMsg]  = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const LIMIT = 50;

  const flash = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p), limit: String(LIMIT),
        ...(filterNhom ? { nhom: filterNhom } : {}),
        ...(filterLoai ? { loai: filterLoai } : {}),
        ...(search      ? { search }           : {}),
      });
      const res  = await fetch(`/api/quy-tac?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setNhomList(data.nhomList || []);
    } catch {
      flash('Lỗi tải dữ liệu', false);
    } finally {
      setLoading(false);
    }
  }, [page, filterNhom, filterLoai, search]);

  useEffect(() => { load(page); }, [load, page]);

  const openAdd = () => {
    setEditItem(null);
    setForm(INIT_FORM);
    setFormErr('');
    setModalOpen(true);
  };

  const openEdit = (item: QuyTac) => {
    setEditItem(item);
    setForm({
      stt: item.stt, nhom: item.nhom, ma: item.ma,
      ten_chi_phi: item.ten_chi_phi, can_cu: item.can_cu,
      co_so_thanh_toan: item.co_so_thanh_toan,
      quy_tac_giam_tru: item.quy_tac_giam_tru,
      loai_xu_ly: item.loai_xu_ly, active: item.active,
    });
    setFormErr('');
    setModalOpen(true);
  };

  const saveForm = async () => {
    if (!form.ten_chi_phi.trim()) { setFormErr('Tên chi phí là bắt buộc'); return; }
    setFormLoading(true); setFormErr('');
    try {
      const url    = editItem ? `/api/quy-tac/${editItem._id}` : '/api/quy-tac';
      const method = editItem ? 'PATCH' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormErr(data.message || 'Lỗi lưu'); return; }
      setModalOpen(false);
      flash(data.message || 'Thành công');
      load(page);
    } catch { setFormErr('Lỗi kết nối'); }
    finally { setFormLoading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/quy-tac/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      flash(data.message || 'Đã xoá', res.ok);
      if (res.ok) load(page);
    } catch { flash('Lỗi xoá', false); }
    finally { setDeleteId(null); }
  };

  const toggleActive = async (item: QuyTac) => {
    try {
      await fetch(`/api/quy-tac/${item._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      });
      load(page);
    } catch { flash('Lỗi cập nhật', false); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/quy-tac/import', { method: 'POST', body: fd });
      const data = await res.json();
      setImportMsg(data.message || (res.ok ? 'Import thành công' : 'Lỗi import'));
      if (res.ok) { setPage(1); load(1); }
    } catch { setImportMsg('Lỗi kết nối'); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const Field = ({ label, name, value, onChange, type = 'text', rows = 0 }: {
    label: string; name: string; value: string | number; onChange: (v: string) => void;
    type?: string; rows?: number;
  }) => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      {rows > 0
        ? <textarea rows={rows} value={String(value)} onChange={e => onChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none resize-none" />
        : <input type={type} value={String(value)} onChange={e => onChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
      }
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-md">
            <ListChecks className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Quản lý Quy tắc BH</h1>
            <p className="text-xs text-gray-500">{total} quy tắc trong hệ thống</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm">
            <Plus className="h-4 w-4" /> Thêm quy tắc
          </button>
        </div>
      </div>

      {/* Import result */}
      {importMsg && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
          importMsg.includes('Lỗi') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {importMsg.includes('Lỗi') ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {importMsg}
          <button onClick={() => setImportMsg('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm border border-gray-100">
        <div className="flex items-center gap-1.5 flex-1 min-w-48 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-gray-400" />
          <input placeholder="Tìm kiếm..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400" />
        </div>

        <select value={filterNhom} onChange={e => { setFilterNhom(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400">
          <option value="">Tất cả nhóm</option>
          {nhomList.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        <select value={filterLoai} onChange={e => { setFilterLoai(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400">
          <option value="">Tất cả loại</option>
          <option value="ai">AI xử lý</option>
          <option value="fixed">Cố định (Code)</option>
        </select>

        <button onClick={() => { setSearch(''); setFilterNhom(''); setFilterLoai(''); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400">
            <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            Chưa có quy tắc nào. Import từ Excel hoặc thêm mới.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 w-12">STT</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 w-24">Nhóm</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 w-24">Mã</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500">Tên chi phí</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 w-28">Loại xử lý</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 w-20">Kích hoạt</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 w-20">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => (
                  <tr key={item._id} className={`hover:bg-gray-50/60 transition-colors ${!item.active ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-3 text-xs text-gray-400">{item.stt || '—'}</td>
                    <td className="px-3 py-3">
                      {item.nhom && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {item.nhom}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500">{item.ma || '—'}</td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-gray-800 line-clamp-2">{item.ten_chi_phi}</p>
                      {item.quy_tac_giam_tru && (
                        <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{item.quy_tac_giam_tru}</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LOAI_COLORS[item.loai_xu_ly] || 'bg-gray-100 text-gray-600'}`}>
                        {LOAI_LABELS[item.loai_xu_ly] || item.loai_xu_ly}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => toggleActive(item)} title="Bật/tắt">
                        {item.active
                          ? <ToggleRight className="mx-auto h-5 w-5 text-green-500" />
                          : <ToggleLeft  className="mx-auto h-5 w-5 text-gray-300" />
                        }
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(item)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(item._id)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <span className="text-xs text-gray-500">
              Hiển thị {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} / {total}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-sm font-semibold text-gray-700">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl px-5 py-3 shadow-lg text-sm font-semibold text-white transition-all ${
          toast.ok ? 'bg-green-600' : 'bg-red-500'
        }`}>
          {toast.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Edit/Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 pt-10 pb-10">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl mx-4">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-black text-gray-900">
                {editItem ? 'Chỉnh sửa quy tắc' : 'Thêm quy tắc mới'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="STT" name="stt" type="number" value={form.stt} onChange={v => setForm(f => ({ ...f, stt: Number(v) }))} />
                <Field label="Nhóm" name="nhom" value={form.nhom} onChange={v => setForm(f => ({ ...f, nhom: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mã" name="ma" value={form.ma} onChange={v => setForm(f => ({ ...f, ma: v }))} />
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Loại xử lý</label>
                  <select value={form.loai_xu_ly} onChange={e => setForm(f => ({ ...f, loai_xu_ly: e.target.value as 'ai' | 'fixed' }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                    <option value="ai">AI xử lý</option>
                    <option value="fixed">Cố định (Code)</option>
                  </select>
                </div>
              </div>
              <Field label="Tên chi phí *" name="ten_chi_phi" value={form.ten_chi_phi}
                onChange={v => setForm(f => ({ ...f, ten_chi_phi: v }))} />
              <Field label="Căn cứ" name="can_cu" value={form.can_cu}
                onChange={v => setForm(f => ({ ...f, can_cu: v }))} />
              <Field label="Cơ sở thanh toán" name="co_so_thanh_toan" rows={3} value={form.co_so_thanh_toan}
                onChange={v => setForm(f => ({ ...f, co_so_thanh_toan: v }))} />
              <Field label="Quy tắc giảm trừ" name="quy_tac_giam_tru" rows={3} value={form.quy_tac_giam_tru}
                onChange={v => setForm(f => ({ ...f, quy_tac_giam_tru: v }))} />

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="active" checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                <label htmlFor="active" className="text-sm font-semibold text-gray-700">Kích hoạt quy tắc này</label>
              </div>

              {formErr && <p className="text-sm text-red-500">{formErr}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button onClick={() => setModalOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Huỷ
              </button>
              <button onClick={saveForm} disabled={formLoading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 shadow-sm">
                {formLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editItem ? 'Lưu thay đổi' : 'Tạo quy tắc'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="rounded-2xl bg-white p-6 shadow-2xl mx-4 max-w-sm w-full">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-black text-gray-900">Xác nhận xoá</h3>
                <p className="text-sm text-gray-500">Hành động này không thể hoàn tác.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Huỷ
              </button>
              <button onClick={confirmDelete}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600">
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
