import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-center">
      <div className="max-w-sm">
        <p className="text-8xl font-bold text-gray-200">404</p>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">Trang không tìm thấy</h1>
        <p className="mt-2 text-sm text-gray-500">
          Trang bạn đang tìm không tồn tại hoặc đã bị di chuyển.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Home className="h-4 w-4" />
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
