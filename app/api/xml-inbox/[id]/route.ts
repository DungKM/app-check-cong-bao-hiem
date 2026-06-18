import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

async function getDoc(id: string) {
  let oid: ObjectId;
  try { oid = new ObjectId(id); } catch { return null; }
  const client = await clientPromise;
  return client.db().collection('xml_inbox').findOne({ _id: oid });
}

// GET — return XML content (for loading into checker)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 });

  const doc = await getDoc(params.id);
  if (!doc) return NextResponse.json({ message: 'Không tìm thấy' }, { status: 404 });

  return NextResponse.json({ xmlContent: doc.xmlContent, fileName: doc.fileName });
}

// PATCH — mark as checked
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 });

  let oid: ObjectId;
  try { oid = new ObjectId(params.id); } catch {
    return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const client = await clientPromise;
  await client.db().collection('xml_inbox').updateOne(
    { _id: oid },
    { $set: { status: 'checked', ...(body.info ? { info: body.info } : {}) } },
  );

  return NextResponse.json({ message: 'Cập nhật thành công.' });
}

// DELETE
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 });

  // Non-admin can only delete their own manual files
  const doc = await getDoc(params.id);
  if (!doc) return NextResponse.json({ message: 'Không tìm thấy' }, { status: 404 });

  if (session.user?.role !== 'admin' && doc.uploadedBy !== session.user?.email) {
    return NextResponse.json({ message: 'Không có quyền xóa file này' }, { status: 403 });
  }

  let oid: ObjectId;
  try { oid = new ObjectId(params.id); } catch {
    return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 });
  }

  const client = await clientPromise;
  await client.db().collection('xml_inbox').deleteOne({ _id: oid });

  return NextResponse.json({ message: 'Đã xóa.' });
}
