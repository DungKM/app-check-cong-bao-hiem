'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, ShieldCheck, Plus, Trash2, ArrowUpDown,
  X, Loader2, RefreshCw, Eye, EyeOff,
} from 'lucide-react';

type UserRow = { _id: string; name: string; email: string; role: string; createdAt: string };
type Form    = { name: string; email: string; password: string; role: string };

const INIT: Form = { name: '', email: '', password: '', role: 'user' };

export default function UsersClient() {
  const [users,       setUsers]       = useState<UserRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadErr,     setLoadErr]     = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [form,        setForm]        = useState<Form>(INIT);
  const [showPw,      setShowPw]      = useState(false);
  const [formErr,     setFormErr]     = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [actionId,    setActionId]    = useState<string | null>(null);
  const [toast,       setToast]       = useState('');

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true); setLoadErr('');
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Không tải được danh sách người dùng.');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e: any) {
      setLoadErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = () => { setForm(INIT); setFormErr(''); setShowPw(false); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setFormErr(''); };

  const createUser = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setFormErr('Vui lòng điền đầy đủ thông tin.'); return;
    }
    if (form.password.length < 6) {
      setFormErr('Mật khẩu tối thiểu 6 ký tự.'); return;
    }
    setFormLoading(true); setFormErr('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormErr(data.message || 'Lỗi tạo tài khoản.'); return; }
      closeModal();
      await load();
      flash('Tạo tài khoản thành công.');
    } catch {
      setFormErr('Lỗi kết nối.');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleRole = async (u: UserRow) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    setActionId(u._id);
    try {
      const res = await fetch(`/api/users/${u._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) { await load(); flash(`Đã đổi vai trò → ${newRole}`); }
    } finally {
      setActionId(null);
    }
  };

  const deleteUser = async (u: UserRow) => {
    if (!confirm(`Xóa tài khoản "${u.name || u.email}"?\nHành động này không thể hoàn tác.`)) return;
    setActionId(u._id);
    try {
      const res = await fetch(`/api/users/${u._id}`, { method: 'DELETE' });
      if (res.ok) { await load(); flash('Đã xóa tài khoản.'); }
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-violet-50 p-2">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Quản lý người dùng</h1>
            <p className="text-sm text-gray-500">{users.length} tài khoản trong hệ thống</p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" /> Tạo tài khoản
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          ✓ {toast}
        </div>
      )}

      {/* Load error */}
      {loadErr && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{loadErr}</div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Người dùng</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Email</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Vai trò</th>
              <th className="hidden px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:table-cell">Ngày tạo</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                  Chưa có người dùng nào trong hệ thống.
                </td>
              </tr>
            ) : users.map(u => (
              <tr key={u._id} className="hover:bg-gray-50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold
                      ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {(u.name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{u.name || '—'}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-600">{u.email}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold
                    ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role === 'admin' && <ShieldCheck className="h-3 w-3" />}
                    {u.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </td>
                <td className="hidden px-5 py-3.5 text-gray-400 sm:table-cell">{u.createdAt || '—'}</td>
                <td className="px-5 py-3.5">
                  {actionId === u._id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRole(u)}
                        title={u.role === 'admin' ? 'Hạ xuống User' : 'Nâng lên Admin'}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                        {u.role === 'admin' ? 'Hạ user' : 'Nâng admin'}
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition"
                      >
                        <Trash2 className="h-3 w-3" /> Xóa
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Tạo tài khoản mới</h2>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Họ tên <span className="text-red-500">*</span></label>
                <input
                  type="text" value={form.name} placeholder="Nguyễn Văn A"
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && createUser()}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
                <input
                  type="email" value={form.email} placeholder="email@example.com"
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && createUser()}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              {/* Password */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Mật khẩu <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={form.password} placeholder="Tối thiểu 6 ký tự"
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && createUser()}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {/* Role */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Vai trò</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="user">User — Người dùng thường</option>
                  <option value="admin">Admin — Quản trị viên</option>
                </select>
              </div>

              {formErr && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formErr}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={createUser} disabled={formLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
                >
                  {formLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Plus className="h-4 w-4" />}
                  Tạo tài khoản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
