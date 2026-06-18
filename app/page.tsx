import Link from 'next/link';
import { Shield, ArrowRight, Activity, CheckCircle, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Check Cổng BH</span>
          </div>
          <Link
            href="/auth/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Đăng nhập
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-6 py-20 text-center">
        <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
          Hệ thống kiểm tra cổng BHYT
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Kiểm tra cổng bảo hiểm y tế
          <span className="block text-blue-600">nhanh chóng &amp; chính xác</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base text-gray-500">
          Tra cứu thông tin BHYT, kiểm tra trạng thái cổng và quản lý người dùng trong một nền
          tảng thống nhất.
        </p>
        <div className="mt-8 flex items-center justify-center">
          <Link
            href="/auth/login"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Đăng nhập <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Kiểm tra cổng</h3>
            <p className="mt-2 text-sm text-gray-500">
              Nhập mã cổng và kiểm tra trạng thái bảo hiểm nhanh chóng, chính xác.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Báo cáo chi tiết</h3>
            <p className="mt-2 text-sm text-gray-500">
              Xem lịch sử kiểm tra và thông tin chi tiết về từng cổng bảo hiểm.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Phân quyền người dùng</h3>
            <p className="mt-2 text-sm text-gray-500">
              Quản lý nhân viên và phân quyền truy cập trong hệ thống.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
