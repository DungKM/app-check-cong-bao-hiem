import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import clientPromise from '@/lib/mongodb';

function isAdmin(session: any) {
  return session?.user?.role === 'admin';
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const nhom   = searchParams.get('nhom')   || '';
  const search = searchParams.get('search') || '';
  const loai   = searchParams.get('loai')   || '';
  const active = searchParams.get('active');
  const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'));
  const limit  = Math.min(200, parseInt(searchParams.get('limit') || '50'));

  const filter: Record<string, unknown> = {};
  if (nhom)  filter.nhom = nhom;
  if (loai)  filter.loai_xu_ly = loai;
  if (active !== null && active !== '') filter.active = active === 'true';
  if (search) {
    filter.$or = [
      { ten_chi_phi:    { $regex: search, $options: 'i' } },
      { ma:             { $regex: search, $options: 'i' } },
      { quy_tac_giam_tru: { $regex: search, $options: 'i' } },
      { co_so_thanh_toan: { $regex: search, $options: 'i' } },
    ];
  }

  const client = await clientPromise;
  const col    = client.db().collection('quy_tac');

  const [total, rows, nhomList] = await Promise.all([
    col.countDocuments(filter),
    col.find(filter).sort({ stt: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).toArray(),
    col.distinct('nhom', {}),
  ]);

  return NextResponse.json({
    items: rows.map(r => ({ ...r, _id: r._id.toString() })),
    total, page, limit,
    nhomList: nhomList.filter(Boolean).sort(),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });

  const body = await req.json();
  const { stt, nhom, ma, ten_chi_phi, can_cu, co_so_thanh_toan, quy_tac_giam_tru, loai_xu_ly } = body;

  if (!ten_chi_phi?.trim())
    return NextResponse.json({ message: 'Tên chi phí là bắt buộc' }, { status: 400 });

  const now = new Date();
  const doc = {
    stt:               typeof stt === 'number' ? stt : 0,
    nhom:              (nhom              || '').trim(),
    ma:                (ma                || '').trim(),
    ten_chi_phi:       ten_chi_phi.trim(),
    can_cu:            (can_cu            || '').trim(),
    co_so_thanh_toan:  (co_so_thanh_toan  || '').trim(),
    quy_tac_giam_tru:  (quy_tac_giam_tru  || '').trim(),
    loai_xu_ly:        loai_xu_ly === 'fixed' ? 'fixed' : 'ai',
    active:            true,
    createdAt:         now,
    updatedAt:         now,
  };

  const result = await (await clientPromise).db().collection('quy_tac').insertOne(doc);
  return NextResponse.json({ message: 'Tạo quy tắc thành công', id: result.insertedId.toString() }, { status: 201 });
}
