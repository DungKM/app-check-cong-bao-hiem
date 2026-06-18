import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

function adminOnly(session: any) {
  return !session || session.user?.role !== 'admin';
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (adminOnly(session))
    return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });

  const { role } = await req.json();
  if (!['user', 'admin'].includes(role))
    return NextResponse.json({ message: 'Vai trò không hợp lệ.' }, { status: 400 });

  let oid: ObjectId;
  try { oid = new ObjectId(params.id); }
  catch { return NextResponse.json({ message: 'ID không hợp lệ.' }, { status: 400 }); }

  const client = await clientPromise;
  await client.db().collection('users').updateOne({ _id: oid }, { $set: { role } });

  return NextResponse.json({ message: 'Cập nhật thành công.' });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (adminOnly(session))
    return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });

  let oid: ObjectId;
  try { oid = new ObjectId(params.id); }
  catch { return NextResponse.json({ message: 'ID không hợp lệ.' }, { status: 400 }); }

  const client = await clientPromise;
  await client.db().collection('users').deleteOne({ _id: oid });

  return NextResponse.json({ message: 'Xóa thành công.' });
}
