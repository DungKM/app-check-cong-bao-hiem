import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

function adminOnly(session: any) {
  return !session || session.user?.role !== 'admin';
}

export async function GET() {
  const session = await getSession();
  if (adminOnly(session))
    return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });

  const client = await clientPromise;
  const raw = await client.db()
    .collection('users')
    .find({}, { projection: { password: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  const users = raw.map((u: any) => ({
    _id:       u._id.toString(),
    name:      u.name ?? '',
    email:     u.email,
    role:      u.role || 'user',
    createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '',
  }));

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (adminOnly(session))
    return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });

  const { name, email, password, role } = await req.json();

  if (!name || !email || !password)
    return NextResponse.json({ message: 'Vui lòng điền đầy đủ thông tin.' }, { status: 400 });

  if (password.length < 6)
    return NextResponse.json({ message: 'Mật khẩu tối thiểu 6 ký tự.' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db();

  const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
  if (existing)
    return NextResponse.json({ message: 'Email đã tồn tại.' }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  await db.collection('users').insertOne({
    name,
    email:     email.toLowerCase(),
    password:  hashed,
    role:      role === 'admin' ? 'admin' : 'user',
    createdAt: new Date(),
  });

  return NextResponse.json({ message: 'Tạo tài khoản thành công.' }, { status: 201 });
}
