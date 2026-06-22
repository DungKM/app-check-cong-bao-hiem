import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

function isAdmin(session: any) {
  return session?.user?.role === 'admin';
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });

  let oid: ObjectId;
  try { oid = new ObjectId(params.id); } catch {
    return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 });
  }

  const body = await req.json();
  const allowed = ['stt','nhom','ma','ten_chi_phi','can_cu','co_so_thanh_toan','quy_tac_giam_tru','loai_xu_ly','active'];
  const $set: Record<string, unknown> = { updatedAt: new Date() };

  for (const k of allowed) {
    if (k in body) $set[k] = body[k];
  }

  const result = await (await clientPromise)
    .db().collection('quy_tac')
    .updateOne({ _id: oid }, { $set });

  if (result.matchedCount === 0)
    return NextResponse.json({ message: 'Không tìm thấy quy tắc' }, { status: 404 });

  return NextResponse.json({ message: 'Cập nhật thành công' });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });

  let oid: ObjectId;
  try { oid = new ObjectId(params.id); } catch {
    return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 });
  }

  const result = await (await clientPromise)
    .db().collection('quy_tac')
    .deleteOne({ _id: oid });

  if (result.deletedCount === 0)
    return NextResponse.json({ message: 'Không tìm thấy quy tắc' }, { status: 404 });

  return NextResponse.json({ message: 'Đã xoá quy tắc' });
}
