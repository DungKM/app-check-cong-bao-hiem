# Check Cổng Bảo Hiểm

Next.js 14 + MongoDB app cho kiểm tra cổng, xác thực, và phân quyền.

## Khởi động

1. Sao chép `.env.example` thành `.env.local`
2. Điền `MONGODB_URI` và `NEXTAUTH_SECRET`
3. Chạy:

```bash
npm install
npm run dev
```

## Routes chính

- `/`: Trang chủ
- `/auth/login`: Đăng nhập
- `/auth/register`: Đăng ký
- `/dashboard`: Dashboard người dùng
- `/dashboard/port-check`: Mẫu kiểm tra cổng
- `/dashboard/user-management`: Quản lý người dùng (chỉ admin)

## Lưu ý

- Dự án hiện cho phép đăng ký người dùng và đăng nhập
- Yêu cầu cấu hình MongoDB và biến môi trường để hoạt động
